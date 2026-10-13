create or replace function public.allowed_public_profile(raw text)
returns boolean language plpgsql immutable as $$
declare profile jsonb;
begin
  profile := raw::jsonb;
  return profile ? 'age'
    and (profile->>'age') ~ '^[0-9]{1,3}$'
    and (profile->>'age')::integer >= 18
    and lower(profile->>'country') = 'india';
exception when others then return false;
end;
$$;
revoke all on function public.allowed_public_profile(text) from public;
grant execute on function public.allowed_public_profile(text) to authenticated;

create table if not exists public.learner_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 180),
  value text not null check (octet_length(value) <= 2000000),
  constraint public_profile_age check (key <> 'edu_student_profile' or public.allowed_public_profile(value)),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.learner_state enable row level security;
revoke all on public.learner_state from anon;
grant select, insert, update, delete on public.learner_state to authenticated;
create policy "read own learning data" on public.learner_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own learning data" on public.learner_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own learning data" on public.learner_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own learning data" on public.learner_state for delete to authenticated using ((select auth.uid()) = user_id);
