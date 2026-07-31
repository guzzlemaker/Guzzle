# Guzzle

Guzzle is a daily competitive word-racing puzzle built with Vite, React, and Tailwind CSS.

Each Daily GUZZLE has 12 laps ordered easiest to hardest. Each lap gets 30 seconds, and today's progress is saved in `localStorage`.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run validate:puzzles
npm run build
```

## Preview Build

```bash
npm run preview
```

## Deploying to Vercel

This project is ready for Vercel with the default Vite settings.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Production URL in share copy: `https://playguzzle.com`

Recommended production domain: `playguzzle.com`

After deploying, point the `playguzzle.com` DNS records to Vercel from the domain registrar, then add `playguzzle.com` inside the Vercel project Domains settings.

## Monthly Puzzle Workflow

Monthly content is generated from `scripts/generate-monthly-puzzles.mjs`.

```bash
npm run generate:puzzles
npm run validate:puzzles
npm run build
```

The generator creates dated daily tracks in `src/data/daily/YYYY-MM-DD.json`, plus a manifest at `src/data/daily/index.json`. It also refreshes `src/data/puzzles.json` as an aggregate review file.

The app automatically loads the puzzle whose `dateSeed` matches today's date. If today's date is missing, the app shows a launch-safe "race warming up" message instead of repeating an old track.

Validation checks:

- exactly 12 puzzles per track
- no duplicate answers within a track
- no duplicate answers across the month
- answer words cannot appear in the clue

## Daily Automation Model

For a month of GUZZLE content:

1. Add or edit the 30 track answer lists in `scripts/generate-monthly-puzzles.mjs`.
2. Run `npm run generate:puzzles`.
3. Run `npm run validate:puzzles`.
4. Run `npm run build`.
5. Deploy the Vercel project.

The browser selects the correct daily JSON by the current date, so no manual daily deployment is needed once the month is generated.
