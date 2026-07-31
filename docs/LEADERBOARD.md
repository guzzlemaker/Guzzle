# Leaderboard Formula

Daily GUZZLE ranking is calculated server-side in `src/lib/ranking.js`.

Initial ranking order:

1. More correct answers
2. Fewer incorrect answers
3. Fewer timeouts
4. Lower elapsed time
5. Earlier valid submission

Only the first valid completed Daily run per player per official date is rankable. Later Daily attempts are practice. Bonus Track results are stored separately from Daily rankings.

The schema keeps fields needed for future weekly rankings, career rankings, streaks, and registered accounts without changing the current anonymous-first MVP.
