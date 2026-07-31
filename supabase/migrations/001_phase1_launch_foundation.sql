create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  anonymous_id text not null,
  display_name text,
  official_date date not null,
  track_type text not null check (track_type in ('daily', 'bonus')),
  track_id text not null,
  started_at timestamptz,
  completed_at timestamptz not null,
  elapsed_milliseconds integer not null check (elapsed_milliseconds > 0),
  total_puzzles integer not null check (total_puzzles > 0),
  correct_answers integer not null check (correct_answers >= 0),
  incorrect_answers integer not null default 0 check (incorrect_answers >= 0),
  timeouts integer not null default 0 check (timeouts >= 0),
  final_score integer not null check (final_score >= 0),
  result_status text not null default 'completed',
  client_version text,
  integrity_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint daily_runs_counts_valid check (correct_answers + timeouts <= total_puzzles)
);

create unique index if not exists daily_runs_one_ranked_daily_per_player
  on public.daily_runs(player_id, official_date)
  where track_type = 'daily' and result_status = 'completed';

create index if not exists daily_runs_rank_lookup_idx
  on public.daily_runs(official_date, track_type, correct_answers desc, incorrect_answers asc, timeouts asc, elapsed_milliseconds asc, completed_at asc);

create index if not exists daily_runs_player_idx
  on public.daily_runs(player_id, official_date, track_type);

create table if not exists public.email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null,
  anonymous_player_id text,
  source text not null,
  official_date date,
  consent_text_version text not null,
  consent_timestamp timestamptz not null,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists email_subscriptions_one_active_email
  on public.email_subscriptions(normalized_email)
  where unsubscribed_at is null;

create index if not exists email_subscriptions_source_idx
  on public.email_subscriptions(source, created_at desc);

alter table public.players enable row level security;
alter table public.daily_runs enable row level security;
alter table public.email_subscriptions enable row level security;

create policy "service role manages players"
  on public.players
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages daily runs"
  on public.daily_runs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages email subscriptions"
  on public.email_subscriptions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
