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
  let low = date.getTime();
  let high = low + 36 * 60 * 60 * 1000;

  if (getOfficialDateKey(new Date(high), timeZone) === currentDateKey) {
    return 24 * 60 * 60 * 1000;
  }

  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);

    if (getOfficialDateKey(new Date(middle), timeZone) === currentDateKey) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return Math.max(0, high - date.getTime());
}

export function normalizeTrackSet(set, trackType = DAILY_TRACK_TYPE, scheduledDate = set?.dateSeed) {
  if (!set || !Array.isArray(set.puzzles)) {
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

  const scheduledSet = sortedSets[dailyIndex];
  const nextScheduledSet = sortedSets.find((set) => set.dateSeed > officialDate) ?? null;

  if (scheduledSet.daily || scheduledSet.bonus) {
    return {
      daily: normalizeTrackSet(
        {
          ...scheduledSet.daily,
          gameNumber: scheduledSet.daily?.gameNumber ?? scheduledSet.gameNumber,
        },
        DAILY_TRACK_TYPE,
        officialDate,
      ),
      bonus: normalizeTrackSet(
        {
          ...scheduledSet.bonus,
          gameNumber: scheduledSet.bonus?.gameNumber ?? scheduledSet.gameNumber,
        },
        BONUS_TRACK_TYPE,
        officialDate,
      ),
      nextScheduledSet,
    };
  }

  const bonusOffset = Math.max(1, Math.ceil(sortedSets.length / 2));
  const bonusIndex = (dailyIndex + bonusOffset) % sortedSets.length;
  const bonusSet = sortedSets.length > 1 ? sortedSets[bonusIndex] : null;

  return {
    daily: normalizeScheduledSet(sortedSets[dailyIndex], DAILY_TRACK_TYPE, officialDate),
    bonus: normalizeScheduledSet(bonusSet, BONUS_TRACK_TYPE, officialDate),
    nextScheduledSet,
  };
}

function normalizeScheduledSet(set, trackType, officialDate) {
  if (!set) {
    return null;
  }

  if (set.daily || set.bonus) {
    const track = trackType === DAILY_TRACK_TYPE ? set.daily : set.bonus;

    return normalizeTrackSet(
      track
        ? {
            ...track,
            gameNumber: track.gameNumber ?? set.gameNumber,
          }
        : null,
      trackType,
      officialDate,
    );
  }

  return normalizeTrackSet(set, trackType, officialDate);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
