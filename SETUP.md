# GUZZLE Phase 1 Setup

## Supabase Database

1. Open the Supabase dashboard.
2. Create a new GUZZLE project.
3. Go to **SQL Editor**.
4. Paste and run the migrations in this order:
   - `supabase/migrations/001_phase1_launch_foundation.sql`
   - `supabase/migrations/002_checkpoint1_official_racing.sql`
5. Go to **Project Settings > API**.
6. Copy:
   - Project URL into `SUPABASE_URL`
   - anon public key into `SUPABASE_ANON_KEY`
   - service role key into `SUPABASE_SERVICE_ROLE_KEY`

Never put the service role key in a `VITE_` variable.

Checkpoint 1 uses Vercel serverless API routes as the trusted backend. The browser never receives the service-role key.

## Local Environment

1. Create `.env` from `.env.example`.
2. Fill in the Supabase values.
3. Run:

```bash
pnpm install
pnpm run validate:puzzles
pnpm test
pnpm run build
```

## Vercel Environment Variables

Open Vercel dashboard:

1. Select the GUZZLE project.
2. Go to **Settings > Environment Variables**.
3. Add these to **Development**, **Preview**, and **Production**:
   - `VITE_SITE_URL`
   - `VITE_GUZZLE_TIMEZONE`
   - `VITE_VERCEL_ANALYTICS_ENABLED`
   - `GUZZLE_TIMEZONE`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy after adding or changing variables.

## Vercel Analytics

1. Open the Vercel project.
2. Go to **Analytics**.
3. Enable Web Analytics.
4. Redeploy if prompted.

## Domain

Do not connect `playguzzle.com` until the domain is purchased.

When ready:

1. Open the Vercel project.
2. Go to **Settings > Domains**.
3. Add `playguzzle.com`.
4. Copy the DNS values Vercel displays.
5. Add those DNS records at the domain registrar.

## Verification Checklist

- Open `/api/track?trackType=daily` and confirm answers are not returned.
- Open `/api/racer` and confirm a server Race Car ID can be created when Supabase variables are configured.
- Complete a Daily run.
- Confirm `/api/start-race` creates a row in `race_sessions`.
- Confirm `/api/complete-race` stores a row in `race_results`.
- Refresh and confirm the local Daily result remains complete.
- Try submitting another Daily result and confirm the duplicate is not ranked.
- Open `/api/leaderboard?trackType=daily` and confirm rank ordering.
- Submit the post-game email form.
- Confirm `email_subscriptions` has normalized email and consent fields.
- Confirm Vercel Analytics shows traffic after production visits.

## Local Official Leaderboard Testing

Create `.env` from `.env.example`, fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run the app through Vercel-compatible API routes:

```bash
npm run validate:puzzles
npm test
npm run build
```

Without Supabase variables, GUZZLE remains playable and stores local progress, but official Race Car IDs, server sessions, ranks, and the live leaderboard show unavailable/fallback states.

## Checkpoint 1 Security Notes

- The first official Daily result per player and daily race is protected by a database unique index.
- Race sessions require a private Race Car token and a per-session submission token.
- RLS is enabled; service-role policies are the only table access path.
- The current frontend still contains puzzle answers, so this checkpoint is practical MVP integrity, not full anti-cheat.
- Clearing browser data or changing devices creates a new anonymous Race Car ID until account recovery or sign-in is added later.
