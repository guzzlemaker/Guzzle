import fs from 'node:fs';
import path from 'node:path';
import { getOfficialDateKey, selectDailyAndBonusTrack } from '../../src/lib/daily.js';

const DAILY_DIR = path.join(process.cwd(), 'src', 'data', 'daily');
const TIMEZONE = process.env.GUZZLE_TIMEZONE || 'America/Denver';

export function getOfficialDate(date = new Date()) {
  return getOfficialDateKey(date, TIMEZONE);
}

export function loadDailySets() {
  return fs
    .readdirSync(DAILY_DIR)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort()
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(DAILY_DIR, fileName), 'utf8')));
}

export function getTracksForOfficialDate(officialDate = getOfficialDate()) {
  const sets = loadDailySets();
  const { daily, bonus } = selectDailyAndBonusTrack(sets, officialDate);
  return { daily, bonus };
}

export function getPublicTrack(track) {
  if (!track) {
    return null;
  }

  return {
    ...track,
    puzzles: track.puzzles.map(({ answer, ...puzzle }) => puzzle),
  };
}
