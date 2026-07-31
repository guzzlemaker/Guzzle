# GUZZLE Phase 1 Setup

## Supabase Database

1. Open the Supabase dashboard.
2. Create a new GUZZLE project.
3. Go to **SQL Editor**.
4. Paste and run `supabase/migrations/001_phase1_launch_foundation.sql`.
5. Go to **Project Settings > API**.
6. Copy:
   - Project URL into `SUPABASE_URL`
   - anon public key into `SUPABASE_ANON_KEY`
   - service role key into `SUPABASE_SERVICE_ROLE_KEY`

Never put the service role key in a `VITE_` variable.

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
- Complete a Daily run.
- Confirm `/api/submit-result` stores a row in `daily_runs`.
- Refresh and confirm the local Daily result remains complete.
- Try submitting another Daily result and confirm the duplicate is not ranked.
- Open `/api/leaderboard?trackType=daily` and confirm rank ordering.
- Submit the post-game email form.
- Confirm `email_subscriptions` has normalized email and consent fields.
- Confirm Vercel Analytics shows traffic after production visits.
