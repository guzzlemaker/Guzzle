# Official Leaderboard

Daily GUZZLE ranking is calculated by the Supabase database function `public.get_daily_leaderboard`.
The JavaScript ranking helper in `src/lib/ranking.js` mirrors the formula for local tests and fallback checks.

Checkpoint 1 ranking order:

1. More correct answers
2. Fewer timeouts
3. Fewer incorrect answers
4. Lower elapsed time
5. Earlier server submission

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
