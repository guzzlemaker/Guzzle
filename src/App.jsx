import React, { useEffect, useMemo, useRef, useState } from 'react';

const dailyModules = import.meta.glob('./data/daily/*.json', { eager: true });
const dailySets = Object.entries(dailyModules)
  .filter(([modulePath]) => !modulePath.endsWith('/index.json'))
  .map(([, module]) => module.default ?? module)
  .sort((left, right) => left.dateSeed.localeCompare(right.dateSeed));

const TOTAL_PUZZLES = 12;
const BOARD_COLUMNS = 14;
const BOARD_ROWS = 4;
const BOARD_SIZE = BOARD_COLUMNS * BOARD_ROWS;
const PUZZLE_TIME_LIMIT_MS = 30000;
const REVEAL_DELAY_MS = 1500;
const TRANSITION_DELAY_MS = 450;
const SOUND_SETTING_KEY = 'guzzle:sound-enabled';
const DAILY_STATS_KEY = 'guzzle:daily-stats';
const EMAIL_SIGNUP_KEY = 'guzzle:email-signup';
const ANALYTICS_KEY = 'guzzle:analytics-events';
const WEBSITE_URL = 'https://guzzlevercel.vercel.app/';
const AUDIO_SOURCES = {
  whoosh: '/audio/whoosh.mp3',
  success: '/audio/success.mp3',
  timeout: '/audio/timeout.mp3',
  victory: '/audio/victory.mp3',
};
const CONFETTI_PIECES = Array.from({ length: 36 }, (_, index) => index);
const LEVEL_INTROS = {
  0: { title: 'FIRST LAP', subtitle: 'Start the set.' },
  6: { title: 'HALF WAY', subtitle: 'Halfway through.' },
  11: { title: 'FINAL LAP', subtitle: 'One last race.' },
};
const ALWAYS_REVEALED = new Set(['G', 'U', 'Z', 'L', 'E']);
const REVEALED_LABEL = ['G', 'U', 'Z', 'Z', 'L', 'E'];
const MIN_REVEAL_PERCENT = 0.25;
const EASIEST_REVEAL_PERCENT = 0.8;
const HARDEST_REVEAL_PERCENT = 0.25;

function normalizeAnswer(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function formatClockTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}`;
}

function formatResultTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getDailyNumber(dateKey) {
  const firstDay = Date.UTC(2026, 5, 17);
  const currentDay = Date.parse(`${dateKey}T00:00:00Z`);
  const dayNumber = Math.max(1, Math.floor((currentDay - firstDay) / 86400000) + 1);

  return String(dayNumber).padStart(3, '0');
}

function getStoredProgress(storageKey) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredSoundEnabled() {
  try {
    const stored = window.localStorage.getItem(SOUND_SETTING_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function getStoredDailyStats() {
  try {
    const stored = window.localStorage.getItem(DAILY_STATS_KEY);
    return stored
      ? JSON.parse(stored)
      : {
          bestTimeMs: null,
          currentStreak: 0,
          totalCompleted: 0,
          lastCompletedKey: null,
        };
  } catch {
    return {
      bestTimeMs: null,
      currentStreak: 0,
      totalCompleted: 0,
      lastCompletedKey: null,
    };
  }
}

function getStoredEmailSignup() {
  try {
    return window.localStorage.getItem(EMAIL_SIGNUP_KEY) ?? '';
  } catch {
    return '';
  }
}

function getRaceLabel(index) {
  return index === 0 ? "Today's GUZZLE" : `Bonus Race ${index + 1}`;
}

function getPerformanceRank(solvedCount, totalPuzzles, timeMs) {
  const safeTimeMs = Math.max(0, timeMs);
  const missedCount = Math.max(0, totalPuzzles - solvedCount);

  if (solvedCount === totalPuzzles) {
    if (safeTimeMs <= 150000) return 1;
    if (safeTimeMs <= 210000) return 2;
    if (safeTimeMs <= 270000) return 3;
    if (safeTimeMs <= 330000) return 5;
    return 8;
  }

  if (missedCount === 1) {
    if (safeTimeMs <= 300000) return 10;
    return 15;
  }

  if (missedCount === 2) {
    if (safeTimeMs <= 300000) return 25;
    return 35;
  }

  if (solvedCount >= Math.ceil(totalPuzzles * 0.66)) {
    return 50;
  }

  if (solvedCount >= Math.ceil(totalPuzzles * 0.5)) {
    return 75;
  }

  return 100;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function canAutoFocusInput() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: fine)').matches &&
    window.matchMedia?.('(min-width: 768px)').matches
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getScoreQuote(score) {
  const quotes = {
    0: 'The engine stalled, but the pit crew believes in you.',
    1: 'One green light. We are calling that ignition.',
    2: 'A cautious cruise, but you made the track respect you.',
    3: 'Three solved. The school bell rang before you warmed up.',
    4: 'Four laps in, and the tires are officially awake.',
    5: 'Halfway to glory. Slightly chaotic, fully respectable.',
    6: 'Six down. You are officially faster than a hallway speed walk.',
    7: 'Seven solved. That is a clean lap with snack-bar confidence.',
    8: 'Eight green lights. The crowd is checking the leaderboard.',
    9: 'Nine solved. You were one lucky guess from folklore.',
    10: 'Ten solved. That is dangerously close to bragging rights.',
    11: 'Eleven solved. One gray box away from becoming a campus legend.',
    12: 'Perfect race. Someone check the answer key for fingerprints.',
  };

  return quotes[score] ?? 'Solid race. The grid will remember this.';
}

function getTomorrowRankMessage(rank) {
  return 'COME BACK TOMORROW AND IMPROVE YOUR RACE.';
}

function trackAnalyticsEvent(eventName, details = {}) {
  try {
    const currentEvents = JSON.parse(window.localStorage.getItem(ANALYTICS_KEY) ?? '[]');
    const event = {
      eventName,
      details,
      timestamp: new Date().toISOString(),
    };

    // TODO: Send this event to an analytics/backend service before public launch.
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify([...currentEvents.slice(-199), event]));
  } catch {
    // Analytics should never interrupt the race.
  }
}

function getPreviousDateKey(dateKey) {
  const previousDay = new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86400000);
  return previousDay.toISOString().slice(0, 10);
}

function getMsUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

function formatCountdown(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function shouldShowLevelIntro(completedCount) {
  return Boolean(LEVEL_INTROS[completedCount]);
}

function getLevelIntro(completedCount) {
  return LEVEL_INTROS[completedCount] ?? LEVEL_INTROS[0];
}

function seededHash(value) {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;

  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function layoutAnswerCells(answer) {
  const normalizedAnswer = answer.toUpperCase();
  const cells = Array.from({ length: BOARD_SIZE }, () => ({ type: 'unused' }));
  const words = normalizedAnswer.split(/\s+/).filter(Boolean);
  let row = 0;
  let column = 0;

  words.forEach((word, wordIndex) => {
    const needsSpacer = column > 0;
    const requiredCells = word.length + (needsSpacer ? 1 : 0);

    if (column > 0 && column + requiredCells > BOARD_COLUMNS) {
      row += 1;
      column = 0;
    }

    if (row >= BOARD_ROWS) {
      return;
    }

    if (column > 0) {
      cells[row * BOARD_COLUMNS + column] = { type: 'spacer' };
      column += 1;
    }

    [...word].forEach((letter) => {
      if (column >= BOARD_COLUMNS) {
        row += 1;
        column = 0;
      }

      if (row >= BOARD_ROWS) {
        return;
      }

      cells[row * BOARD_COLUMNS + column] = {
        type: 'letter',
        letter,
        wordIndex,
      };
      column += 1;
    });
  });

  return cells;
}

function getDifficultyValue(puzzle) {
  const scaledDifficulty =
    TOTAL_PUZZLES <= 1 ? 10 : 10 + ((Number(puzzle.level) - 1) / (TOTAL_PUZZLES - 1)) * 90;
  const rawDifficulty = Number(puzzle.difficultyValue ?? scaledDifficulty);
  return Math.min(100, Math.max(10, rawDifficulty));
}

function getRevealPercent(puzzle) {
  const difficulty = getDifficultyValue(puzzle);
  const difficultyRatio = (difficulty - 10) / 90;

  return Math.max(
    MIN_REVEAL_PERCENT,
    EASIEST_REVEAL_PERCENT - difficultyRatio * (EASIEST_REVEAL_PERCENT - HARDEST_REVEAL_PERCENT),
  );
}

function getMinimumRevealedForWord(wordLength) {
  if (wordLength >= 8) {
    return 3;
  }

  if (wordLength >= 5) {
    return 2;
  }

  return 1;
}

function getRevealedLetters(cells, puzzle, dateKey) {
  const letterCells = cells.filter((cell) => cell.type === 'letter');
  const revealPercent = getRevealPercent(puzzle);
  const targetCount = Math.ceil(letterCells.length * revealPercent);
  const revealed = new Set(
    letterCells
      .filter((cell) => ALWAYS_REVEALED.has(cell.letter))
      .map((cell) => cell.letter),
  );

  const visibleCount = () => letterCells.filter((cell) => revealed.has(cell.letter)).length;
  const random = seededRandom(seededHash(`${dateKey}:${getDifficultyValue(puzzle)}:${puzzle.answer}`));
  const sortLetters = (letters) =>
    letters
      .map((letter) => ({
        letter,
        sort: random(),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((candidate) => candidate.letter);

  const words = new Map();
  letterCells.forEach((cell) => {
    const wordLetters = words.get(cell.wordIndex) ?? [];
    wordLetters.push(cell.letter);
    words.set(cell.wordIndex, wordLetters);
  });

  words.forEach((wordLetters) => {
    const minimumRevealed = getMinimumRevealedForWord(wordLetters.length);
    const uniqueWordLetters = [...new Set(wordLetters)];
    const visibleWordCount = () => wordLetters.filter((letter) => revealed.has(letter)).length;

    for (const letter of sortLetters(uniqueWordLetters.filter((candidate) => !revealed.has(candidate)))) {
      if (visibleWordCount() >= minimumRevealed) {
        break;
      }

      revealed.add(letter);
    }
  });

  if (visibleCount() >= targetCount) {
    return revealed;
  }

  for (const letter of sortLetters([...new Set(letterCells.map((cell) => cell.letter))].filter((candidate) => !revealed.has(candidate)))) {
    revealed.add(letter);

    if (visibleCount() >= targetCount) {
      break;
    }
  }

  return revealed;
}

function PhraseBoard({ dateKey, puzzle, solved }) {
  const cells = useMemo(() => layoutAnswerCells(puzzle.answer), [puzzle.answer]);
  const revealedLetters = useMemo(
    () => getRevealedLetters(cells, puzzle, dateKey),
    [cells, dateKey, puzzle],
  );

  return (
    <div className="phrase-board" aria-label="Hidden answer phrase">
      {cells.map((cell, cellIndex) => {
        const isLetter = cell.type === 'letter';
        const visible = isLetter && (solved || revealedLetters.has(cell.letter));

        return (
          <span
            className={`letter-box ${visible ? 'letter-box--revealed' : ''} ${
              cell.type === 'spacer' ? 'letter-box--spacer' : ''
            } ${cell.type === 'unused' ? 'letter-box--unused' : ''}`}
            key={`${cell.type}-${cellIndex}`}
            aria-label={visible ? cell.letter : isLetter ? 'hidden letter' : 'empty cell'}
          >
            {visible ? cell.letter : isLetter ? '_' : ''}
          </span>
        );
      })}
    </div>
  );
}

export default function App() {
  const todayKey = getTodayKey();
  const todaySet = dailySets.find((set) => set.dateSeed === todayKey);
  const nextScheduledSet = dailySets.find((set) => set.dateSeed > todayKey);
  const hasTodaysPuzzle = Boolean(todaySet);
  const dailySetIndex = Math.max(0, dailySets.findIndex((set) => set.dateSeed === todayKey));
  const puzzleSets = useMemo(
    () =>
      hasTodaysPuzzle
        ? [dailySets[dailySetIndex], ...dailySets.filter((_, index) => index !== dailySetIndex)]
        : dailySets,
    [dailySetIndex, hasTodaysPuzzle],
  );
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const selectedSet = puzzleSets[selectedSetIndex] ?? puzzleSets[0] ?? {
    dateSeed: todayKey,
    theme: 'GUZZLE',
    puzzles: [],
  };
  const gameKey = `${selectedSet.dateSeed}:${selectedSet.theme}`;
  const storageKey = `guzzle:${gameKey}`;
  const initialNow = useMemo(() => Date.now(), [storageKey]);
  const initialProgress = null;
  const initialElapsedMs =
    initialProgress?.finishedAt && initialProgress?.startedAt
      ? initialProgress.finishedAt - initialProgress.startedAt
      : initialProgress?.startedAt
        ? initialNow - initialProgress.startedAt
        : 0;
  const initialCompletedCount = initialProgress?.completedCount ?? 0;
  const initialShowRulesIntro = initialCompletedCount === 0 && !initialProgress?.rulesSeen;
  const initialStatsRecorded = Boolean(initialProgress?.statsRecorded);
  const [startedAt, setStartedAt] = useState(initialProgress?.startedAt ?? null);
  const [finishedAt, setFinishedAt] = useState(initialProgress?.finishedAt ?? null);
  const [completedCount, setCompletedCount] = useState(initialCompletedCount);
  const [correctCount, setCorrectCount] = useState(
    initialProgress?.correctCount ?? initialProgress?.solvedCount ?? 0,
  );
  const [missedCount, setMissedCount] = useState(
    initialProgress?.missedCount ?? initialProgress?.skippedCount ?? 0,
  );
  const [outcomes, setOutcomes] = useState(initialProgress?.outcomes ?? []);
  const [puzzleStartedAt, setPuzzleStartedAt] = useState(
    initialProgress?.puzzleStartedAt ??
      (initialCompletedCount < TOTAL_PUZZLES && !shouldShowLevelIntro(initialCompletedCount) ? initialNow : null),
  );
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
  const [celebrating, setCelebrating] = useState(false);
  const [revealingSolved, setRevealingSolved] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRulesIntro, setShowRulesIntro] = useState(initialShowRulesIntro);
  const [showLevelIntro, setShowLevelIntro] = useState(
    !initialShowRulesIntro && initialCompletedCount < TOTAL_PUZZLES && shouldShowLevelIntro(initialCompletedCount),
  );
  const [shareStatus, setShareStatus] = useState('');
  const [timeLeftMs, setTimeLeftMs] = useState(PUZZLE_TIME_LIMIT_MS);
  const [soundEnabled, setSoundEnabled] = useState(getStoredSoundEnabled);
  const [confettiActive, setConfettiActive] = useState(false);
  const [dailyStats, setDailyStats] = useState(getStoredDailyStats);
  const [statsRecorded, setStatsRecorded] = useState(initialStatsRecorded);
  const [countdownToTomorrow, setCountdownToTomorrow] = useState(getMsUntilTomorrow);
  const [email, setEmail] = useState(getStoredEmailSignup);
  const [emailStatus, setEmailStatus] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(Boolean(getStoredEmailSignup()));
  const inputRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const introTimeoutRef = useRef(null);
  const audioRefs = useRef({});
  const currentAudioRef = useRef(null);
  const puzzleLockedRef = useRef(false);
  const confettiPlayedRef = useRef(false);

  const isComplete = completedCount >= TOTAL_PUZZLES;
  const activePuzzle = selectedSet.puzzles[Math.min(completedCount, TOTAL_PUZZLES - 1)] ?? {
    level: 1,
    category: selectedSet.theme,
    clue: 'NO PUZZLE SCHEDULED',
    answer: 'GUZZLE',
    difficulty: 'PIT STOP',
  };
  const levelIntro = getLevelIntro(completedCount);
  const raceLabel = getRaceLabel(selectedSetIndex);
  const finalTime = formatTime(finishedAt && startedAt ? finishedAt - startedAt : elapsedMs);
  const resultMs = finishedAt && startedAt ? finishedAt - startedAt : elapsedMs;
  const resultTime = formatResultTime(resultMs);
  const bestTime = formatResultTime(dailyStats.bestTimeMs ?? resultMs);
  const displayTimeLeft = formatClockTime(timeLeftMs);
  const dailyNumber = String(selectedSet.gameNumber ?? Number(getDailyNumber(selectedSet.dateSeed ?? todayKey))).padStart(
    3,
    '0',
  );
  const performanceRank = getPerformanceRank(correctCount, TOTAL_PUZZLES, resultMs);
  const accuracy = Math.round((correctCount / TOTAL_PUZZLES) * 100);
  const scoreQuote = getScoreQuote(correctCount);
  const tomorrowRankMessage = getTomorrowRankMessage(performanceRank);
  const hasNextRace = selectedSetIndex < puzzleSets.length - 1;
  const isNextDailyReady = countdownToTomorrow <= 0;

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        startedAt,
        finishedAt,
        completedCount,
        correctCount,
        missedCount,
        outcomes,
        puzzleStartedAt,
        rulesSeen: !showRulesIntro,
        statsRecorded,
      }),
    );
  }, [
    completedCount,
    correctCount,
    finishedAt,
    missedCount,
    outcomes,
    puzzleStartedAt,
    showRulesIntro,
    startedAt,
    statsRecorded,
    storageKey,
  ]);

  useEffect(() => {
    window.localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(dailyStats));
  }, [dailyStats]);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setCountdownToTomorrow(getMsUntilTomorrow());
    }, 1000);

    return () => window.clearInterval(countdown);
  }, []);

  useEffect(() => {
    const loadedAudio = Object.entries(AUDIO_SOURCES).reduce((audioMap, [key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = key === 'victory' ? 0.42 : key === 'whoosh' ? 0.28 : 0.34;
      audio.load();
      audioMap[key] = audio;
      return audioMap;
    }, {});

    audioRefs.current = loadedAudio;

    return () => {
      Object.values(loadedAudio).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SOUND_SETTING_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (!showRulesIntro || isComplete) {
      return;
    }

    trackAnalyticsEvent('rules_opened', {
      race: raceLabel,
      theme: selectedSet.theme,
    });
  }, [isComplete, raceLabel, selectedSet.theme, showRulesIntro]);

  useEffect(() => {
    if (!isComplete || !finishedAt || !startedAt || statsRecorded) {
      return;
    }

    const resultMs = finishedAt - startedAt;

    trackAnalyticsEvent('race_completed', {
      race: raceLabel,
      theme: selectedSet.theme,
      solved: correctCount,
      missed: missedCount,
      dailyRankStatus: 'backend_not_connected',
      totalPuzzles: TOTAL_PUZZLES,
      timeMs: resultMs,
    });

    if (selectedSetIndex === 0) {
      setDailyStats((current) => {
        const completedToday = current.lastCompletedKey === todayKey;
        const completedYesterday = current.lastCompletedKey === getPreviousDateKey(todayKey);

        return {
          bestTimeMs:
            current.bestTimeMs === null || resultMs < current.bestTimeMs ? resultMs : current.bestTimeMs,
          currentStreak: completedToday ? current.currentStreak : completedYesterday ? current.currentStreak + 1 : 1,
          totalCompleted: completedToday ? current.totalCompleted : current.totalCompleted + 1,
          lastCompletedKey: todayKey,
        };
      });
    }
    setStatsRecorded(true);
  }, [
    correctCount,
    finishedAt,
    isComplete,
    missedCount,
    raceLabel,
    selectedSet.theme,
    selectedSetIndex,
    startedAt,
    statsRecorded,
    todayKey,
  ]);

  useEffect(() => {
    if (!isComplete || !finishedAt || confettiPlayedRef.current || prefersReducedMotion()) {
      return undefined;
    }

    confettiPlayedRef.current = true;
    setConfettiActive(true);
    const confettiTimeout = window.setTimeout(() => setConfettiActive(false), 1800);

    return () => window.clearTimeout(confettiTimeout);
  }, [finishedAt, isComplete]);

  useEffect(() => {
    if (!startedAt || finishedAt) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(timer);
  }, [finishedAt, startedAt]);

  useEffect(() => {
    if (isComplete || showRulesIntro || showLevelIntro || revealingSolved || isTransitioning || !puzzleStartedAt) {
      return undefined;
    }

    let didExpire = false;

    const updateCountdown = () => {
      const remaining = PUZZLE_TIME_LIMIT_MS - (Date.now() - puzzleStartedAt);
      setTimeLeftMs(Math.max(0, remaining));

      if (remaining <= 0 && !didExpire) {
        didExpire = true;
        handleMissed();
      }
    };

    updateCountdown();
    const countdown = window.setInterval(updateCountdown, 100);

    return () => window.clearInterval(countdown);
  }, [completedCount, isComplete, isTransitioning, puzzleStartedAt, revealingSolved, showLevelIntro, showRulesIntro]);

  useEffect(() => {
    if (!isComplete && !showRulesIntro && !showLevelIntro && !revealingSolved && canAutoFocusInput()) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [completedCount, isComplete, revealingSolved, showLevelIntro, showRulesIntro]);

  useEffect(() => {
    setAnswer('');
  }, [completedCount]);

  useEffect(() => {
    if (
      isComplete ||
      showRulesIntro ||
      showLevelIntro ||
      revealingSolved ||
      isTransitioning ||
      puzzleLockedRef.current ||
      !answer.trim()
    ) {
      return;
    }

    if (normalizeAnswer(answer) === normalizeAnswer(activePuzzle.answer)) {
      completeCurrentPuzzle('correct');
    }
  }, [activePuzzle.answer, answer, isComplete, isTransitioning, revealingSolved, showLevelIntro, showRulesIntro]);

  useEffect(() => {
    return () => {
      window.clearTimeout(advanceTimeoutRef.current);
      window.clearTimeout(transitionTimeoutRef.current);
      window.clearTimeout(introTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showLevelIntro || showRulesIntro || isComplete) {
      return undefined;
    }

    setPuzzleStartedAt(null);
    setTimeLeftMs(PUZZLE_TIME_LIMIT_MS);
    playSound('whoosh');

    introTimeoutRef.current = window.setTimeout(() => {
      const now = Date.now();
      setShowLevelIntro(false);
      setPuzzleStartedAt(now);
      setStartedAt((current) => current ?? now);
    }, 2000);

    return () => window.clearTimeout(introTimeoutRef.current);
  }, [completedCount, isComplete, showLevelIntro, showRulesIntro]);

  function playSound(name) {
    if (!soundEnabled) {
      return;
    }

    const audio = audioRefs.current[name];

    if (!audio) {
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    audio.pause();
    audio.currentTime = 0;
    currentAudioRef.current = audio;
    audio.play().catch(() => {
      currentAudioRef.current = null;
    });
  }

  function advanceAfterReveal(nextCompleted) {
    advanceTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(true);
      transitionTimeoutRef.current = window.setTimeout(() => {
        setCompletedCount(nextCompleted);
        setAnswer('');
        setFeedback('');
        setFeedbackTone('neutral');
        setRevealingSolved(false);
        setTimeLeftMs(PUZZLE_TIME_LIMIT_MS);
        setIsTransitioning(false);
        puzzleLockedRef.current = false;

        if (nextCompleted === TOTAL_PUZZLES) {
          const now = Date.now();
          setFinishedAt(now);
          setPuzzleStartedAt(null);
          setShowLevelIntro(false);
          setElapsedMs(now - (startedAt ?? now));
        } else {
          if (shouldShowLevelIntro(nextCompleted)) {
            setPuzzleStartedAt(null);
            setShowLevelIntro(true);
          } else {
            setPuzzleStartedAt(Date.now());
            setShowLevelIntro(false);
          }
        }
      }, TRANSITION_DELAY_MS);
    }, REVEAL_DELAY_MS);
  }

  function completeCurrentPuzzle(outcome) {
    if (puzzleLockedRef.current) {
      return;
    }

    puzzleLockedRef.current = true;
    const nextCompleted = completedCount + 1;
    const isFinalPuzzle = nextCompleted === TOTAL_PUZZLES;

    setOutcomes((current) => [...current, outcome]);
    setAnswer('');
    setRevealingSolved(true);
    trackAnalyticsEvent(outcome === 'correct' ? 'puzzle_solved' : 'puzzle_missed', {
      race: raceLabel,
      theme: selectedSet.theme,
      puzzleLevel: activePuzzle.level,
      category: activePuzzle.category,
      answer: activePuzzle.answer,
      difficulty: activePuzzle.difficulty,
      timeLeftMs,
    });

    if (outcome === 'correct') {
      playSound(isFinalPuzzle ? 'victory' : 'success');
      setCorrectCount((current) => current + 1);
      setFeedback('Correct! +1');
      setFeedbackTone('success');
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 720);
    } else {
      playSound(isFinalPuzzle ? 'victory' : 'timeout');
      setMissedCount((current) => current + 1);
      setFeedback("Time's Up");
      setFeedbackTone('error');
    }

    advanceAfterReveal(nextCompleted);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (revealingSolved) {
      return;
    }

    if (!answer.trim()) {
      setFeedback('Make a guess to keep the race moving.');
      setFeedbackTone('neutral');
      return;
    }

    if (normalizeAnswer(answer) !== normalizeAnswer(activePuzzle.answer)) {
      setFeedback('Not the phrase. Keep racing.');
      setFeedbackTone('error');
      return;
    }

    completeCurrentPuzzle('correct');
  }

  function handleMissed() {
    if (revealingSolved) {
      return;
    }

    completeCurrentPuzzle('missed');
  }

  async function handleShare() {
    const shareTitle = selectedSetIndex === 0 ? `GUZZLE #${dailyNumber}` : `${raceLabel} - ${selectedSet.theme}`;
    const shareText = `\u{1F3C1} I finished ${shareTitle} in ${resultTime}.\nSolved: ${correctCount}/${TOTAL_PUZZLES}.\nCan you beat me?\n\nPlay GUZZLE: ${WEBSITE_URL}`;

    try {
      await navigator.clipboard.writeText(shareText);
      trackAnalyticsEvent('share_copied', {
        race: raceLabel,
        theme: selectedSet.theme,
        solved: correctCount,
        missed: missedCount,
        dailyRankStatus: 'backend_not_connected',
        time: resultTime,
      });
      setShareStatus('Copied result to clipboard.');
    } catch {
      if (navigator.share) {
        await navigator.share({
          title: "Today's GUZZLE result",
          text: shareText,
        });
        trackAnalyticsEvent('share_opened', {
          race: raceLabel,
          theme: selectedSet.theme,
          solved: correctCount,
          missed: missedCount,
          dailyRankStatus: 'backend_not_connected',
          time: resultTime,
        });
        setShareStatus('Shared.');
        return;
      }

      setShareStatus('Copy unavailable. Try again.');
    }
  }

  function handleEmailSubmit(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (emailSubmitting || emailSubmitted) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailStatus('Enter a valid email to join tomorrow\'s race.');
      return;
    }

    setEmailSubmitting(true);
    setEmailStatus('');

    try {
      // TODO: Replace this local placeholder with the GUZZLE backend/email service after launch validation.
      window.localStorage.setItem(EMAIL_SIGNUP_KEY, trimmedEmail);
      trackAnalyticsEvent('email_submitted', {
        race: raceLabel,
        theme: selectedSet.theme,
      });
      setEmail(trimmedEmail);
      setEmailSubmitted(true);
      setEmailStatus('');
    } catch {
      setEmailStatus('Signup failed. Please try again.');
    } finally {
      setEmailSubmitting(false);
    }
  }

  function resetToday({ clearStoredProgress = true } = {}) {
    window.clearTimeout(advanceTimeoutRef.current);
    window.clearTimeout(transitionTimeoutRef.current);
    window.clearTimeout(introTimeoutRef.current);
    if (clearStoredProgress) {
      window.localStorage.removeItem(storageKey);
    }
    setStartedAt(null);
    setFinishedAt(null);
    setCompletedCount(0);
    setCorrectCount(0);
    setMissedCount(0);
    setOutcomes([]);
    setPuzzleStartedAt(null);
    setAnswer('');
    setFeedback('');
    setFeedbackTone('neutral');
    setElapsedMs(0);
    setTimeLeftMs(PUZZLE_TIME_LIMIT_MS);
    setCelebrating(false);
    setRevealingSolved(false);
    setIsTransitioning(false);
    setShowRulesIntro(true);
    setShowLevelIntro(false);
    setShareStatus('');
    setStatsRecorded(false);
    setEmailStatus('');
    setConfettiActive(false);
    confettiPlayedRef.current = false;
    puzzleLockedRef.current = false;
  }

  function toggleSound() {
    setSoundEnabled((current) => !current);
  }

  function closeRulesIntro() {
    setShowRulesIntro(false);
    trackAnalyticsEvent('start_race_clicked', {
      race: raceLabel,
      theme: selectedSet.theme,
    });

    if (shouldShowLevelIntro(completedCount)) {
      setShowLevelIntro(true);
      return;
    }

    const now = Date.now();
    setPuzzleStartedAt(now);
    setStartedAt((current) => current ?? now);
  }

  function handleSetChange(event) {
    const nextSetIndex = Number(event.target.value) - 1;

    if (!Number.isInteger(nextSetIndex) || nextSetIndex < 0 || nextSetIndex >= puzzleSets.length) {
      return;
    }

    resetToday({ clearStoredProgress: false });
    trackAnalyticsEvent('race_selected', {
      fromRace: raceLabel,
      toRace: getRaceLabel(nextSetIndex),
      theme: puzzleSets[nextSetIndex].theme,
    });
    setSelectedSetIndex(nextSetIndex);
  }

  function goToNextSet() {
    if (!hasNextRace) {
      return;
    }

    resetToday({ clearStoredProgress: false });
    setSelectedSetIndex((current) => {
      const nextSetIndex = (current + 1) % puzzleSets.length;
      trackAnalyticsEvent('next_race_clicked', {
        fromRace: getRaceLabel(current),
        toRace: getRaceLabel(nextSetIndex),
        theme: puzzleSets[nextSetIndex].theme,
      });
      return nextSetIndex;
    });
  }

  if (!hasTodaysPuzzle) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-4 py-4 text-black sm:px-6">
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col">
          <header className="border-b-2 border-black/40 pb-3">
            <p className="font-serif text-4xl leading-none tracking-normal sm:text-5xl">Guzzle</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.34em]">
              The Competitive Word Racing Game
            </p>
          </header>

          <article className="my-auto border-2 border-black bg-white p-6 text-center shadow-[8px_8px_0_#000] sm:p-10">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.34em]">Daily GUZZLE</p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-none sm:text-6xl">
              Today&apos;s race is warming up.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm font-bold text-black/65 sm:text-base">
              No puzzle file is scheduled for {todayKey}. Add a dated JSON file before launch so the daily race never
              repeats by accident.
            </p>

            <div className="mx-auto mt-6 max-w-md border border-black/30 bg-[#f7f7f4] p-4 text-left">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-black/60">Next Scheduled Track</p>
              <p className="mt-2 text-lg font-black uppercase">
                {nextScheduledSet ? `${nextScheduledSet.dateSeed} / ${nextScheduledSet.theme}` : 'Coming soon'}
              </p>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-3 py-2 text-black sm:px-5 sm:py-3">
      <section className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col">
        <header className="border-b-2 border-black/40 pb-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-serif text-3xl leading-none tracking-normal sm:text-5xl">Guzzle</p>
                <p className="text-[0.52rem] font-black uppercase tracking-[0.28em] sm:text-[0.62rem] sm:tracking-[0.34em]">
                  The competitive word racing game
                </p>
              </div>
              <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.22em] text-black/60 sm:text-[0.68rem]">
                Today&apos;s Track
              </p>
              <p className="mt-0.5 max-w-[20rem] text-sm font-black uppercase leading-tight tracking-[0.08em] text-black sm:max-w-xl sm:text-base">
                {selectedSet.theme}
              </p>
              <p className="mt-1 max-w-[15rem] text-[0.68rem] font-black uppercase leading-snug tracking-[0.1em] text-black/65 sm:max-w-none sm:text-xs">
                Guess the hidden phrase before time runs out.
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="border-2 border-black bg-white px-2.5 py-1.5 text-[0.56rem] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  Sound {soundEnabled ? 'On' : 'Off'}
                </button>
                <label className="sr-only" htmlFor="set-selector">
                  Race
                </label>
                <select
                  id="set-selector"
                  value={selectedSetIndex + 1}
                  onChange={handleSetChange}
                  className="max-w-[13.5rem] border-2 border-black bg-white px-2.5 py-1.5 text-[0.56rem] font-black uppercase tracking-[0.08em] text-black shadow-[2px_2px_0_#000] sm:max-w-none"
                >
                  {puzzleSets.map((set, index) => (
                    <option value={index + 1} key={set.dateSeed}>
                      {getRaceLabel(index)} - {set.theme}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] sm:text-sm sm:tracking-[0.14em]">
                {isComplete ? `${TOTAL_PUZZLES}/${TOTAL_PUZZLES}` : `Lap ${completedCount + 1}/${TOTAL_PUZZLES}`}
              </p>
              <p className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.1em] text-black/60 sm:text-[0.68rem] sm:tracking-[0.14em]">
                Score {correctCount}/{TOTAL_PUZZLES}
              </p>
              <p
                className={`mt-0.5 font-mono text-4xl font-black leading-none sm:text-5xl ${
                  !isComplete && timeLeftMs <= 5000 ? 'text-rose-600' : 'text-black'
                }`}
              >
                {isComplete ? resultTime : displayTimeLeft}
              </p>
              {!isComplete && (
                <p className="mt-0.5 text-[0.52rem] font-black uppercase tracking-[0.08em] text-black/60 sm:text-[0.68rem] sm:tracking-[0.14em]">
                  Total {formatResultTime(elapsedMs)}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 items-start justify-center py-3 sm:py-4">
          {revealingSolved && feedback && (
            <div
              className={`celebration-burst pointer-events-none absolute left-1/2 top-10 z-20 border-2 border-black px-5 py-3 text-sm font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_#000] ${
                feedbackTone === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {feedbackTone === 'success' ? '✓ ' : ''}
              {feedback}
            </div>
          )}

          {confettiActive && (
            <div className="confetti-layer" aria-hidden="true">
              {CONFETTI_PIECES.map((piece) => (
                <span
                  className="confetti-piece"
                  key={piece}
                  style={{
                    '--piece': piece,
                    '--left': `${(piece * 17) % 100}%`,
                    '--drift': `${((piece % 9) - 4) * 1.2}rem`,
                    '--delay': `${(piece % 6) * 38}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {showLevelIntro && !isComplete && (
            <div className="level-intro-overlay" aria-live="polite">
              <div className="level-intro-panel">
                <p className="level-intro-kicker">Lap {completedCount + 1}/{TOTAL_PUZZLES}</p>
                <h2 className="level-intro-title">{levelIntro.title}</h2>
                <p className="level-intro-subtitle">{levelIntro.subtitle}</p>
              </div>
            </div>
          )}

          {showRulesIntro && !isComplete && (
            <div className="rules-intro-overlay" aria-modal="true" role="dialog">
              <div className="rules-intro-panel">
                <p className="rules-intro-kicker">Start your engines</p>
                <p className="rules-track-title">{selectedSet.theme}</p>
                <h2 className="rules-intro-title">Ready?</h2>
                <p className="rules-copy">
                  Use the category and clue to guess the hidden phrase before time runs out.
                </p>
                <div className="rules-lanes" aria-label="Game rules">
                  <div className="rules-lane">
                    <p className="rules-count">3...</p>
                    <p className="rules-label">Use the clue</p>
                  </div>
                  <div className="rules-lane">
                    <p className="rules-count">2...</p>
                    <p className="rules-label">Solve the phrase</p>
                  </div>
                  <div className="rules-lane">
                    <p className="rules-count">1...</p>
                    <p className="rules-label">Beat the timer</p>
                  </div>
                  <div className="rules-lane rules-lane--go">
                    <p className="rules-count">Go.</p>
                    <p className="rules-label">Race the set</p>
                  </div>
                </div>
                <div className="rules-revealed">
                  <span>Always revealed</span>
                  <div>
                    {REVEALED_LABEL.map((letter, index) => (
                      <b key={`${letter}-${index}`}>{letter}</b>
                    ))}
                  </div>
                </div>
                <button className="rules-start-button" type="button" onClick={closeRulesIntro}>
                  Start Race
                </button>
                <div className="rules-high-score" aria-label="Today's highest score">
                  <span>Live Daily Scores</span>
                  <strong>Coming Soon</strong>
                  <small>Real rankings need the leaderboard backend</small>
                </div>
              </div>
            </div>
          )}

          {isTransitioning && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 mx-auto w-fit -translate-y-1/2 border-2 border-black bg-white px-6 py-4 text-center text-sm font-black uppercase tracking-[0.22em] shadow-[6px_6px_0_#000]">
              Next Puzzle
            </div>
          )}

          {!isComplete ? (
            <article
              className={`w-full transition-opacity duration-300 ${
                showRulesIntro || showLevelIntro || isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="mb-3 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[0.62rem] font-black uppercase tracking-[0.24em] text-black/60 sm:text-xs">
                    {activePuzzle.category}
                  </p>
                  <h1 className="max-w-4xl text-xl font-black uppercase leading-[1.04] tracking-normal text-black sm:text-3xl lg:text-4xl">
                    {activePuzzle.clue}
                  </h1>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-4 sm:hidden">
                <span className="text-[0.65rem] font-black uppercase tracking-[0.2em]">{activePuzzle.difficulty}</span>
              </div>

              <div className="relative rounded-sm bg-white p-2 shadow-[0_14px_34px_rgba(0,0,0,0.07)] sm:p-3">
                <PhraseBoard dateKey={gameKey} puzzle={activePuzzle} solved={revealingSolved} />
              </div>

              <div className="mt-2 flex flex-col gap-2 border-t-2 border-black/40 pt-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[0.56rem] font-black uppercase tracking-[0.18em]">Always revealed:</span>
                  {REVEALED_LABEL.map((letter, index) => (
                    <span
                      className="grid h-6 w-6 place-items-center rounded border-2 border-black bg-white text-xs font-black shadow-[1px_1px_0_#000] sm:h-7 sm:w-7 sm:text-sm"
                      key={`${letter}-${index}`}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <span className="hidden text-[0.65rem] font-black uppercase tracking-[0.2em] sm:block">
                  {activePuzzle.difficulty}
                </span>
              </div>

              <form className="mx-auto mt-3 flex w-full max-w-xl flex-col gap-2 sm:mt-4" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="answer">
                  Answer
                </label>
                <input
                  ref={inputRef}
                  key={completedCount}
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  autoCapitalize="none"
                  autoComplete="off"
                  disabled={showRulesIntro || showLevelIntro || isTransitioning || revealingSolved}
                  className="h-12 w-full rounded-none border-2 border-black bg-white px-4 text-center text-base font-black uppercase outline-none transition placeholder:text-black/35 focus:shadow-[4px_4px_0_#000] disabled:bg-black/5 sm:h-12 sm:text-lg"
                  placeholder="Enter phrase"
                />
                <button
                  type="submit"
                  disabled={showRulesIntro || showLevelIntro || isTransitioning || revealingSolved}
                  className="h-12 w-full rounded-none border-2 border-black bg-black px-5 text-sm font-black uppercase tracking-[0.2em] text-white transition active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-wait disabled:bg-black/70"
                >
                  Submit
                </button>
              </form>

              <div className="mt-2 min-h-6 text-center" aria-live="polite">
                {feedback && (
                  <p
                    className={`text-sm font-black uppercase tracking-[0.14em] ${
                      feedbackTone === 'success'
                        ? 'text-emerald-700'
                        : feedbackTone === 'error'
                          ? 'text-rose-600'
                          : 'text-black/65'
                    }`}
                  >
                    {feedback}
                  </p>
                )}
              </div>
            </article>
          ) : (
            <article className="w-full max-w-5xl border-2 border-black bg-white p-2 text-center shadow-[5px_5px_0_#000] sm:p-3">
              <div className="grid gap-2 lg:grid-cols-2 lg:items-stretch">
                <section className="flex flex-col justify-between border-2 border-black bg-[#f7f7f4] p-3">
                  <div>
                    <span className="inline-flex border-2 border-black bg-white px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em]">
                      {raceLabel}
                    </span>
                    <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-normal sm:text-5xl">
                      Race Complete
                    </h2>
                    <div className="mx-auto mt-2 w-fit border-2 border-black bg-white px-6 py-2.5 shadow-[3px_3px_0_#000]">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-black/60">
                        Daily Rank
                      </p>
                      {/* TODO: Replace this display with live backend ranking data. */}
                      <p className="mt-1 text-3xl font-black uppercase leading-none sm:text-5xl">
                        Coming Soon
                      </p>
                      <p className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.12em] text-black/50">
                        Real players, solved first, then time
                      </p>
                    </div>
                    <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-snug text-black/65">
                      You solved {correctCount}/{TOTAL_PUZZLES} in {resultTime}.
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm font-black uppercase leading-snug tracking-[0.08em] text-black">
                      {scoreQuote}
                    </p>
                    <div className="mx-auto mt-2 max-w-sm border-t-2 border-black/20 pt-2">
                      <p className="text-base font-black uppercase leading-tight tracking-[0.03em]">
                        {tomorrowRankMessage}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-black/60" aria-live="polite">
                        {isNextDailyReady
                          ? "Tomorrow's GUZZLE is ready."
                          : `Next daily race in ${formatCountdown(countdownToTomorrow)}`}
                      </p>
                      {isNextDailyReady && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSetIndex(0);
                            resetToday({ clearStoredProgress: false });
                          }}
                          className="mt-2 min-h-11 border-2 border-black bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Load Daily GUZZLE
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 border-2 border-black bg-white p-2 font-mono text-base leading-relaxed sm:text-lg">
                    {'\u{1F3C1}'}{' '}
                    {outcomes.map((outcome) => (outcome === 'correct' ? '\u{1F7E9}' : '\u{2B1C}')).join(' ')}
                  </div>
                </section>

                <section className="flex flex-col gap-2 text-left">
                  <form className="border-2 border-black bg-[#f7f7f4] p-3" onSubmit={handleEmailSubmit}>
                    {emailSubmitted ? (
                      <div role="status" aria-live="polite">
                        <p className="text-sm font-black uppercase leading-tight tracking-[0.08em] sm:text-base">
                          You&apos;re on the starting line.
                        </p>
                        <p className="mt-1 text-xs font-bold leading-snug text-black/60">
                          Tomorrow&apos;s GUZZLE is headed your way.
                        </p>
                      </div>
                    ) : (
                      <>
                        <label
                          className="block text-sm font-black uppercase leading-tight tracking-[0.08em] sm:text-base"
                          htmlFor="email-signup"
                        >
                          Race against the world.
                        </label>
                        <p className="mt-1 text-xs font-bold leading-snug text-black/60">
                          Never miss a race. Climb tomorrow&apos;s leaderboard.
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            id="email-signup"
                            type="email"
                            value={email}
                            onChange={(event) => {
                              setEmail(event.target.value);
                              if (emailStatus) {
                                setEmailStatus('');
                              }
                            }}
                            aria-label="Email address"
                            aria-invalid={Boolean(emailStatus)}
                            disabled={emailSubmitting}
                            className="h-11 min-w-0 border-2 border-black bg-white px-3 text-sm font-bold outline-none focus:shadow-[3px_3px_0_#000] disabled:bg-black/5"
                            placeholder="you@example.com"
                          />
                          <button
                            type="submit"
                            disabled={emailSubmitting}
                            className="min-h-11 border-2 border-black bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-wait disabled:bg-black/10"
                          >
                            {emailSubmitting ? 'Sending' : 'Notify Me'}
                          </button>
                        </div>
                        <p className="mt-1 min-h-4 text-xs font-bold text-rose-700" aria-live="polite">
                          {emailStatus}
                        </p>
                      </>
                    )}
                  </form>

                  <button
                    type="button"
                    onClick={goToNextSet}
                    disabled={!hasNextRace}
                    className="min-h-[3.75rem] w-full border-2 border-black bg-[#16a34a] px-4 py-2 text-center text-base font-black uppercase tracking-[0.16em] text-white shadow-[3px_3px_0_#000] transition hover:bg-[#15803d] hover:shadow-[4px_4px_0_#000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/45 disabled:shadow-none"
                    aria-label={hasNextRace ? 'Start the next race' : 'More races coming soon'}
                  >
                    <span className="block">{hasNextRace ? 'Next Race?' : 'More Races Coming Soon'}</span>
                    {hasNextRace && (
                      <span className="mt-1 block text-[0.62rem] tracking-[0.08em] text-white/90">
                        Keep racing. Improve your time.
                      </span>
                    )}
                  </button>

                  <div className="border-2 border-black bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/60">Race Stats</p>
                    <ul className="mt-2 grid gap-1 text-sm font-black uppercase tracking-[0.04em] text-black sm:grid-cols-2">
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Time</span>
                        <span className="font-mono">{resultTime}</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Solved</span>
                        <span>{correctCount}/{TOTAL_PUZZLES}</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Accuracy</span>
                        <span>{accuracy}%</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Missed</span>
                        <span>{missedCount}</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Best</span>
                        <span className="font-mono">{bestTime}</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Streak</span>
                        <span>{dailyStats.currentStreak}</span>
                      </li>
                      <li className="flex justify-between gap-3 border-b border-black/15 pb-1">
                        <span className="text-black/55">Next</span>
                        <span className="font-mono">
                          {isNextDailyReady ? 'Ready' : formatCountdown(countdownToTomorrow)}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="min-h-11 w-full border-2 border-black bg-[#f7f7f4] px-4 text-sm font-black uppercase tracking-[0.16em] text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5"
                    aria-label="Copy or share GUZZLE result"
                  >
                    Share Your Race
                  </button>
                  <p className="-mt-1 min-h-4 text-center text-xs font-bold text-emerald-700" aria-live="polite">
                    {shareStatus}
                  </p>
                </section>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
