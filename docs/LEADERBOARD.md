# Official Leaderboard

Daily GUZZLE ranking is returned by the server API from one filtered daily result set. The Supabase database function `public.get_daily_leaderboard` mirrors the same formula for future database-side use.

Checkpoint 1 ranking order:

1. More correct answers
2. Lower completion time
3. Earlier server submission

Only the first valid completed Daily run per Race Car ID per official date is rankable. Later Daily attempts are practice and must not overwrite the first official result. Bonus Track results are stored separately from Daily rankings.

The public leaderboard only exposes:

- rank
- public Race Car ID
- racing color
- correct answers
- total puzzles
- accuracy
- completion time

It must never expose private player UUIDs, Supabase auth IDs, token hashes, email addresses, IP addresses, or submission tokens.

## Checkpoint 1 Integrity

The app creates a server-side race session when the playable Daily race begins. The server records the official start time and validates the completion request against the authenticated Race Car token, session ID, submission token, puzzle outcome count, and reasonable completion time bounds.

Remaining MVP limitation: the current puzzle architecture still exposes answers to the frontend bundle, so Checkpoint 1 cannot fully prove each answer was solved honestly. A later checkpoint should move answer validation and puzzle delivery behind server-controlled sessions.
