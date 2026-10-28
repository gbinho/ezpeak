create table public.decks (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en','ja')),
  title text not null,
  theme text not null,
  level text,
  description text,
  is_survival boolean not null default false,
  sort_order int not null default 0,
  owner_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks on delete cascade,
  kind text not null default 'word' check (kind in ('word','phrase','chunk')),
  text_original text not null,
  text_romanized text,
  translation_pt text not null,
  respelling_pt text not null,
  tip_pt text,
  example text,
  example_pt text,
  status text not null default 'published' check (status in ('draft','review','published')),
  sort_order int not null default 0,
  owner_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.items(deck_id);

create table public.user_cards (
  user_id uuid not null references auth.users on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  card_type text not null check (card_type in ('recognition','production','listening','pronunciation','reading','cloze')),
  deck_id uuid not null references public.decks on delete cascade,
  state smallint not null default 0,
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  last_review timestamptz,
  priority smallint not null default 0 check (priority between -1 and 1),
  suspended boolean not null default false,
  buried_until timestamptz,
  starred boolean not null default false,
  note text,
  primary key (user_id, item_id, card_type)
);
create index on public.user_cards(user_id, due);

create table public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  card_type text not null,
  rating smallint not null,
  state smallint not null,
  elapsed_ms int,
  created_at timestamptz not null default now()
);
create index on public.review_logs(user_id, created_at);

create table public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  global jsonb not null default '{}'::jsonb,
  decks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.pronunciation_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  transcript text,
  score int not null,
  created_at timestamptz not null default now()
);

alter table public.decks enable row level security;
alter table public.items enable row level security;
alter table public.user_cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.user_settings enable row level security;
alter table public.pronunciation_attempts enable row level security;

create policy "read official or own decks" on public.decks for select
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "manage own decks" on public.decks for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "read published or own items" on public.items for select
  using ((owner_id is null and status = 'published') or owner_id = (select auth.uid()));
create policy "manage own items" on public.items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "own cards" on public.user_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own logs" on public.review_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own settings" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own attempts" on public.pronunciation_attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
