# GUZZLE Analytics

Provider: Vercel Web Analytics through `@vercel/analytics`, wrapped by `src/lib/analytics.js`.

Do not send puzzle answers, guesses, emails, tokens, or secrets.

| Event | Fires When | Properties | Business Question |
| --- | --- | --- | --- |
| `rules_opened` | Start modal appears | race, theme | How many visitors reach game intent? |
| `start_race_clicked` | Player starts a race | race, theme | Visitor-to-start conversion |
| `race_selected` | Player changes race | fromRace, toRace, theme | Bonus/practice interest |
| `answer_correct` | Puzzle solved | officialDate, trackType, trackId, puzzleIndex, difficulty, category | Accuracy and difficulty fit |
| `answer_incorrect` | Wrong answer submitted | officialDate, trackType, trackId, puzzleIndex, difficulty | Frustration by puzzle |
| `puzzle_timeout` | Timer expires | officialDate, trackType, trackId, puzzleIndex, difficulty, category | Drop-off and difficulty |
| `race_completed` | Full 12-puzzle run completes | officialDate, trackType, solved, missed, totalPuzzles, elapsedTimeBucket | Completion rate and time |
| `share_copied` | Share result copied | race, theme, solved, missed, time | Share intent |
| `share_opened` | Native share opened | race, theme, solved, missed, time | Mobile viral behavior |
| `email_submitted` | Email accepted | officialDate, source | Email conversion |
| `email_submission_failed` | Email fails | officialDate, source | Signup reliability |

Future events to add once the backend has live usage:

- `daily_track_viewed`
- `daily_started`
- `puzzle_viewed`
- `daily_completed`
- `leaderboard_viewed`
- `display_name_saved`
- `bonus_unlocked`
- `bonus_started`
- `bonus_completed`
- `email_form_viewed`

These events support the Phase 1 questions: start conversion, completion rate, bonus unlock/start rate, average completion time, puzzle drop-off, accuracy by difficulty, share rate, email signup conversion, and return-player rate.
