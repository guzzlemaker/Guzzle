-- A race_result row only exists after the official race is submitted.
-- Backfill earlier non-perfect finishes that were incorrectly marked incomplete.
update public.race_results
set completed = true
where completed = false;
