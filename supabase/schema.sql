-- BBK Card Game: player accounts, Elo ranking and match history.
-- Run once in Supabase Dashboard > SQL Editor. Safe to read top to bottom; see the notes at each section.
--
-- Security model
--   * Browsers use the publishable key. They can READ the leaderboard and their own match history, and
--     change only their own display name. They can never write rating, wins or matches.
--   * Only the game server (secret key, role service_role) records results, through record_match().
--   * Tables are explicitly GRANTed because new Supabase tables are no longer exposed to the Data API
--     automatically. RLS is enabled on everything.

-- ---------------------------------------------------------------------------------------------
-- 1. Profiles: one row per account, created automatically at sign-up
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  rating       integer not null default 1000 check (rating >= 0),
  peak_rating  integer not null default 1000,
  games        integer not null default 0,
  wins         integer not null default 0,
  losses       integer not null default 0,
  draws        integer not null default 0,
  tutorial_step smallint not null default 0 check (tutorial_step between 0 and 5),  -- 5 = tutorial finished, ranked unlocked
  created_at   timestamptz not null default now(),
  constraint profiles_display_name_ok
    check (char_length(display_name) between 3 and 20 and display_name = btrim(display_name)),
  constraint profiles_games_add_up check (games = wins + losses + draws)
);

-- Names are unique ignoring case ("Anna" and "anna" cannot both exist).
create unique index profiles_display_name_key on public.profiles (lower(display_name));
-- Leaderboard: only placed players (5+ ranked games), best first.
create index profiles_leaderboard_idx on public.profiles (rating desc, id) where games >= 5;

alter table public.profiles enable row level security;

-- Anyone (even logged out) can see names and ratings: that is the public leaderboard.
-- Do not add private columns such as email to this table.
create policy "profiles are public" on public.profiles
  for select to anon, authenticated
  using (true);

-- A player may change only their own row, and (see GRANT below) only the display_name column.
create policy "players edit their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 2. Create a profile automatically for every new sign-up
-- ---------------------------------------------------------------------------------------------
create schema if not exists private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Accounts that already exist before this script ran.
insert into public.profiles (id, display_name)
select u.id, 'player_' || substr(replace(u.id::text, '-', ''), 1, 8)
from auth.users u
on conflict (id) do nothing;

-- Tutorial progress only moves forward: a client can never reset it.
create function private.keep_tutorial_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tutorial_step := greatest(old.tutorial_step, new.tutorial_step);
  return new;
end;
$$;
revoke execute on function private.keep_tutorial_progress() from public, anon, authenticated;

create trigger profiles_keep_tutorial_progress
  before update of tutorial_step on public.profiles
  for each row execute function private.keep_tutorial_progress();

-- ---------------------------------------------------------------------------------------------
-- 3. Match history (written only by the game server)
-- ---------------------------------------------------------------------------------------------
create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  player1        uuid references public.profiles (id) on delete set null,
  player2        uuid references public.profiles (id) on delete set null,
  result         text not null check (result in ('player1', 'player2', 'draw')),
  reason         text,
  ranked         boolean not null default true,
  rounds         integer,
  p1_rating_before integer,
  p1_rating_after  integer,
  p2_rating_before integer,
  p2_rating_after  integer,
  ended_at       timestamptz not null default now(),
  constraint matches_distinct_players check (player1 is distinct from player2 or player1 is null)
);

-- Foreign keys are not indexed automatically; these also serve "my recent matches".
create index matches_player1_idx on public.matches (player1, ended_at desc);
create index matches_player2_idx on public.matches (player2, ended_at desc);

alter table public.matches enable row level security;

-- A player can read only matches they took part in. No insert/update/delete policy exists on purpose.
create policy "players read their own matches" on public.matches
  for select to authenticated
  using (player1 = (select auth.uid()) or player2 = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 4. Recording a result and updating Elo, atomically (server only)
-- ---------------------------------------------------------------------------------------------
-- K = 32 and a start rating of 1000 are starting points: tune them once you have real matches.
create function public.record_match(
  p_player1  uuid,
  p_player2  uuid,
  p_result   text,                     -- 'player1' | 'player2' | 'draw'
  p_reason   text    default null,
  p_rounds   integer default null,
  p_ranked   boolean default true,     -- false: store the match, leave ratings untouched
  p_match_id uuid    default null      -- idempotency key: sending the same id twice never counts a match twice
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  k constant float8 := 32;
  r1 integer; r2 integer;
  n1 integer; n2 integer;
  g1 integer; g2 integer;
  placement constant integer := 5;   -- ranked games before a player is placed in C-troop (no points lost meanwhile)
  s1 float8;  e1 float8;
  m_id uuid;
  dup  public.matches%rowtype;
begin
  if p_player1 is null or p_player2 is null or p_player1 = p_player2 then
    raise exception 'record_match: two different players are required';
  end if;
  if p_result not in ('player1', 'player2', 'draw') then
    raise exception 'record_match: invalid result %', p_result;
  end if;

  -- Lock both rows in a fixed order so two matches finishing together cannot deadlock.
  perform 1 from public.profiles where id in (p_player1, p_player2) order by id for update;

  -- A retry of a match that was already saved (for example the first reply was lost) changes nothing.
  -- This check comes after the row locks, so two simultaneous retries cannot both get through.
  if p_match_id is not null then
    select * into dup from public.matches where id = p_match_id;
    if found then
      return jsonb_build_object(
        'match_id', dup.id,
        'duplicate', true,
        'player1', jsonb_build_object('before', dup.p1_rating_before, 'after', dup.p1_rating_after),
        'player2', jsonb_build_object('before', dup.p2_rating_before, 'after', dup.p2_rating_after));
    end if;
  end if;

  select rating, games into r1, g1 from public.profiles where id = p_player1;
  select rating, games into r2, g2 from public.profiles where id = p_player2;
  if r1 is null or r2 is null then
    raise exception 'record_match: unknown player';
  end if;

  n1 := r1;
  n2 := r2;

  if p_ranked then
    s1 := case p_result when 'player1' then 1 when 'player2' then 0 else 0.5 end;
    e1 := 1 / (1 + power(10, (r2 - r1) / 400.0));
    n1 := greatest(0, round(r1 + k * (s1 - e1)));
    n2 := greatest(0, round(r2 + k * ((1 - s1) - (1 - e1))));
    -- Unranked (placement) players cannot lose points; they can still gain them.
    if g1 < placement then n1 := greatest(r1, n1); end if;
    if g2 < placement then n2 := greatest(r2, n2); end if;

    update public.profiles
       set rating      = n1,
           peak_rating = greatest(peak_rating, n1),
           games       = games + 1,
           wins        = wins   + (p_result = 'player1')::int,
           losses      = losses + (p_result = 'player2')::int,
           draws       = draws  + (p_result = 'draw')::int
     where id = p_player1;

    update public.profiles
       set rating      = n2,
           peak_rating = greatest(peak_rating, n2),
           games       = games + 1,
           wins        = wins   + (p_result = 'player2')::int,
           losses      = losses + (p_result = 'player1')::int,
           draws       = draws  + (p_result = 'draw')::int
     where id = p_player2;
  end if;

  insert into public.matches
    (id, player1, player2, result, reason, ranked, rounds,
     p1_rating_before, p1_rating_after, p2_rating_before, p2_rating_after)
  values
    (coalesce(p_match_id, gen_random_uuid()), p_player1, p_player2, p_result, p_reason, p_ranked, p_rounds,
     r1, n1, r2, n2)
  returning id into m_id;

  return jsonb_build_object(
    'match_id', m_id,
    'player1', jsonb_build_object('before', r1, 'after', n1),
    'player2', jsonb_build_object('before', r2, 'after', n2));
end;
$$;

-- Functions are executable by everyone by default. Lock this one to the server.
revoke execute on function public.record_match(uuid, uuid, text, text, integer, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.record_match(uuid, uuid, text, text, integer, boolean, uuid)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- 5. Public leaderboard
-- ---------------------------------------------------------------------------------------------
-- security_invoker makes the view obey the RLS of the person querying it.
create view public.leaderboard
with (security_invoker = true) as
select id,
       display_name,
       rating,
       games,
       wins,
       losses,
       draws,
       rank() over (order by rating desc) as rank
from public.profiles
where games >= 5;   -- only placed players (5+ ranked games) appear on the board

-- ---------------------------------------------------------------------------------------------
-- 6. Data API permissions (explicit, least privilege)
-- ---------------------------------------------------------------------------------------------
revoke all on public.profiles    from anon, authenticated;
revoke all on public.matches     from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;

grant select on public.profiles    to anon, authenticated;
grant update (display_name, tutorial_step) on public.profiles to authenticated;   -- rating etc. stay server-only
grant select on public.matches     to authenticated;
grant select on public.leaderboard to anon, authenticated;

grant select, insert, update, delete on public.profiles    to service_role;
grant select, insert, update, delete on public.matches     to service_role;
grant select on public.leaderboard to service_role;
