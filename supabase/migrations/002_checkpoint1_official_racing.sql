create extension if not exists pgcrypto;

alter table public.players
  add column if not exists auth_user_id uuid unique,
  add column if not exists public_racer_id text,
  add column if not exists racing_color text,
  add column if not exists private_token_hash text;

create unique index if not exists players_public_racer_id_unique
  on public.players(public_racer_id)
  where public_racer_id is not null;

create unique index if not exists players_private_token_hash_unique
  on public.players(private_token_hash)
  where private_token_hash is not null;

create table if not exists public.daily_races (
  id uuid primary key default gen_random_uuid(),
  race_date date not null,
  track_type text not null default 'daily' check (track_type in ('daily', 'bonus')),
  track_id text not null,
  timezone text not null default 'America/Denver',
  content_version integer not null default 1,
  scoring_version text not null default 'checkpoint1-v1',
  created_at timestamptz not null default now(),
  unique (race_date, track_type)
);

create table if not exists public.race_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  daily_race_id uuid not null references public.daily_races(id) on delete cascade,
  server_started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned', 'duplicate')),
  submission_token_hash text not null unique,
  idempotency_key text,
  client_started_at timestamptz,
  user_agent_seen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists race_sessions_player_race_idx
  on public.race_sessions(player_id, daily_race_id, created_at desc);

create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  daily_race_id uuid not null references public.daily_races(id) on delete cascade,
  race_session_id uuid not null unique references public.race_sessions(id) on delete cascade,
  correct_answers integer not null check (correct_answers >= 0),
  total_puzzles integer not null check (total_puzzles > 0),
  accuracy_percentage integer not null check (accuracy_percentage >= 0 and accuracy_percentage <= 100),
  completion_time_ms integer not null check (completion_time_ms > 0),
  timeouts integer not null default 0 check (timeouts >= 0),
  incorrect_answers integer not null default 0 check (incorrect_answers >= 0),
  completed boolean not null default false,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  scoring_version text not null default 'checkpoint1-v1',
  idempotency_key text not null,
  validation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint race_results_counts_valid check (correct_answers + timeouts <= total_puzzles)
);

create unique index if not exists race_results_one_official_result_per_player
  on public.race_results(player_id, daily_race_id);

create unique index if not exists race_results_idempotency_unique
  on public.race_results(player_id, daily_race_id, idempotency_key);

create index if not exists race_results_rank_lookup_idx
  on public.race_results(
    daily_race_id,
    correct_answers desc,
    timeouts asc,
    incorrect_answers asc,
    completion_time_ms asc,
    submitted_at asc
  );

alter table public.daily_races enable row level security;
alter table public.race_sessions enable row level security;
alter table public.race_results enable row level security;

drop policy if exists "service role manages daily races" on public.daily_races;
create policy "service role manages daily races"
  on public.daily_races
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages race sessions" on public.race_sessions;
create policy "service role manages race sessions"
  on public.race_sessions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages race results" on public.race_results;
create policy "service role manages race results"
  on public.race_results
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.get_daily_leaderboard(
  p_race_date date,
  p_track_type text default 'daily',
  p_public_racer_id text default null
)
returns table (
  rank integer,
  public_racer_id text,
  racing_color text,
  correct_answers integer,
  total_puzzles integer,
  accuracy_percentage integer,
  completion_time_ms integer,
  timeouts integer,
  incorrect_answers integer,
  submitted_at timestamptz,
  is_current_player boolean,
  total_racers integer
)
language sql
stable
security definer
set search_path = public
as $$
  with race as (
    select id
    from public.daily_races
    where race_date = p_race_date
      and track_type = p_track_type
    limit 1
  ),
  ranked as (
    select
      row_number() over (
        order by
          rr.correct_answers desc,
          rr.timeouts asc,
          rr.incorrect_answers asc,
          rr.completion_time_ms asc,
          rr.submitted_at asc
      )::integer as rank,
      p.public_racer_id,
      p.racing_color,
      rr.correct_answers,
      rr.total_puzzles,
      rr.accuracy_percentage,
      rr.completion_time_ms,
      rr.timeouts,
      rr.incorrect_answers,
      rr.submitted_at,
      count(*) over ()::integer as total_racers
    from public.race_results rr
    join race on race.id = rr.daily_race_id
    join public.players p on p.id = rr.player_id
  )
  select
    ranked.rank,
    ranked.public_racer_id,
    ranked.racing_color,
    ranked.correct_answers,
    ranked.total_puzzles,
    ranked.accuracy_percentage,
    ranked.completion_time_ms,
    ranked.timeouts,
    ranked.incorrect_answers,
    ranked.submitted_at,
    ranked.public_racer_id = p_public_racer_id as is_current_player,
    ranked.total_racers
  from ranked
  where ranked.rank <= 10
     or (p_public_racer_id is not null and ranked.public_racer_id = p_public_racer_id)
  order by ranked.rank asc;
$$;

revoke all on function public.get_daily_leaderboard(date, text, text) from public;
