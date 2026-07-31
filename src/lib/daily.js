export const DEFAULT_GUZZLE_TIMEZONE = 'America/Denver';
export const DAILY_TRACK_TYPE = 'daily';
export const BONUS_TRACK_TYPE = 'bonus';

export function getOfficialDateKey(date = new Date(), timeZone = DEFAULT_GUZZLE_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getMsUntilNextOfficialDay(date = new Date(), timeZone = DEFAULT_GUZZLE_TIMEZONE) {
  const currentDateKey = getOfficialDateKey(date, timeZone);
  let probe = new Date(date.getTime() + 1000);

  for (let index = 0; index < 36 * 60 * 60; index += 1) {
    if (getOfficialDateKey(probe, timeZone) !== currentDateKey) {
      return Math.max(0, probe.getTime() - date.getTime());
    }

    probe = new Date(probe.getTime() + 1000);
  }

  return 24 * 60 * 60 * 1000;
}

export function normalizeTrackSet(set, trackType = DAILY_TRACK_TYPE, scheduledDate = set?.dateSeed) {
  if (!set) {
    return null;
  }

  return {
    id: `${scheduledDate}:${trackType}:${slugify(set.theme)}`,
    scheduledDate,
    dateSeed: scheduledDate,
    trackType,
    title: trackType === DAILY_TRACK_TYPE ? "Today's GUZZLE" : 'Bonus Track',
    category: set.theme,
    difficulty: set.difficulty ?? 'MIXED',
    theme: set.theme,
    gameNumber: set.gameNumber,
    active: set.active ?? true,
    version: set.version ?? 1,
    puzzles: set.puzzles.map((puzzle, index) => ({
      id: `${scheduledDate}:${trackType}:${slugify(set.theme)}:${String(index + 1).padStart(2, '0')}`,
      scheduledDate,
      trackType,
      sequence: puzzle.level ?? index + 1,
      level: puzzle.level ?? index + 1,
      category: puzzle.category ?? set.theme,
      clue: puzzle.clue,
      answer: puzzle.answer,
      difficulty: puzzle.difficulty,
      difficultyValue: puzzle.difficultyValue,
      revealConfig: puzzle.revealConfig ?? null,
      active: puzzle.active ?? true,
      version: puzzle.version ?? set.version ?? 1,
    })),
  };
}

export function selectDailyAndBonusTrack(sets, officialDate) {
  const sortedSets = [...sets].sort((left, right) => left.dateSeed.localeCompare(right.dateSeed));
  const dailyIndex = sortedSets.findIndex((set) => set.dateSeed === officialDate);

  if (dailyIndex < 0) {
    return {
      daily: null,
      bonus: null,
      nextScheduledSet: sortedSets.find((set) => set.dateSeed > officialDate) ?? null,
    };
  }

  return {
    daily: normalizeTrackSet(sortedSets[dailyIndex], DAILY_TRACK_TYPE, officialDate),
    bonus: normalizeTrackSet(sortedSets[dailyIndex + 1] ?? sortedSets[0], BONUS_TRACK_TYPE, officialDate),
    nextScheduledSet: sortedSets.find((set) => set.dateSeed > officialDate) ?? null,
  };
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
