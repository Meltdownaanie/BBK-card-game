-- Upgrade record_match: add an idempotency key (p_match_id) so a retried save never counts a match twice.
-- Run on a database that already has the first version of schema.sql. Fresh installs already include this.
drop function if exists public.record_match(uuid, uuid, text, text, integer, boolean);

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

  select rating into r1 from public.profiles where id = p_player1;
  select rating into r2 from public.profiles where id = p_player2;
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
