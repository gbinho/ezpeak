create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('reading','music','practice','tutor')),
  language text not null,
  seconds int not null check (seconds > 0),
  created_at timestamptz not null default now()
);
create index on public.activity_logs(user_id, created_at);
alter table public.activity_logs enable row level security;
create policy "own activity" on public.activity_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
