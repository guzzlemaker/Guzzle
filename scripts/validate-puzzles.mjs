import fs from 'node:fs';
import path from 'node:path';

function loadPuzzleSets() {
  const dailyDir = path.join('src', 'data', 'daily');

  if (fs.existsSync(dailyDir)) {
    const dailyFiles = fs
      .readdirSync(dailyDir)
      .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
      .sort();

    if (dailyFiles.length) {
      return dailyFiles.map((fileName) => JSON.parse(fs.readFileSync(path.join(dailyDir, fileName), 'utf8')));
    }
  }

  return JSON.parse(fs.readFileSync('src/data/puzzles.json', 'utf8'));
}

const puzzleSets = loadPuzzleSets();
const ignoredTokens = new Set(['A', 'AN', 'AND', 'ET', 'IN', 'OF', 'ON', 'OR', 'THE', 'TO']);

function normalize(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const violations = [];
const globalAnswers = new Map();

for (const set of puzzleSets) {
  if (set.puzzles.length !== 12) {
    violations.push(`${set.theme}: expected 12 puzzles, found ${set.puzzles.length}`);
  }

  const trackAnswers = new Map();

  for (const puzzle of set.puzzles) {
    const clue = normalize(puzzle.clue);
    const answer = normalize(puzzle.answer);
    const answerTokens = answer.split(' ').filter((token) => token.length >= 4 && !ignoredTokens.has(token));

    if (trackAnswers.has(answer)) {
      violations.push(`${set.theme}: duplicate answer "${puzzle.answer}" also appears at level ${trackAnswers.get(answer)}`);
    }
    trackAnswers.set(answer, puzzle.level);

    if (globalAnswers.has(answer)) {
      violations.push(
        `${set.theme} level ${puzzle.level}: duplicate monthly answer "${puzzle.answer}" also appears in ${globalAnswers.get(
          answer,
        )}`,
      );
    }
    globalAnswers.set(answer, `${set.theme} level ${puzzle.level}`);

    if (answer && clue.includes(answer)) {
      violations.push(`${set.theme} level ${puzzle.level}: clue contains full answer "${puzzle.answer}"`);
    }

    for (const token of answerTokens) {
      const tokenPattern = new RegExp(`\\b${token}\\b`);
      if (tokenPattern.test(clue)) {
        violations.push(`${set.theme} level ${puzzle.level}: clue contains answer word "${token}"`);
      }
    }
  }
}

if (violations.length) {
  console.error('Puzzle validation failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'));
  process.exit(1);
}

console.log('Puzzle validation passed.');
