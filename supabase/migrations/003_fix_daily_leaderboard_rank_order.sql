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
  best_results as (
    select distinct on (rr.player_id)
      rr.player_id,
      rr.correct_answers,
      rr.total_puzzles,
      rr.accuracy_percentage,
      rr.completion_time_ms,
      rr.timeouts,
      rr.incorrect_answers,
      rr.submitted_at
    from public.race_results rr
    join race on race.id = rr.daily_race_id
    where rr.completed = true
    order by
      rr.player_id,
      rr.correct_answers desc,
      rr.completion_time_ms asc,
      rr.submitted_at asc
  ),
  ranked as (
    select
      row_number() over (
        order by
          br.correct_answers desc,
          br.completion_time_ms asc,
          br.submitted_at asc
      )::integer as rank,
      p.public_racer_id,
      p.racing_color,
      br.correct_answers,
      br.total_puzzles,
      br.accuracy_percentage,
      br.completion_time_ms,
      br.timeouts,
      br.incorrect_answers,
      br.submitted_at,
      count(*) over ()::integer as total_racers
    from best_results br
    join public.players p on p.id = br.player_id
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
