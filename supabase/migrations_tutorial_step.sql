-- Adds tutorial progress to profiles. Run on a database that already has the first schema.sql. Fresh installs include it.
alter table public.profiles
  add column tutorial_step smallint not null default 0 check (tutorial_step between 0 and 5);

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

grant update (tutorial_step) on public.profiles to authenticated;
