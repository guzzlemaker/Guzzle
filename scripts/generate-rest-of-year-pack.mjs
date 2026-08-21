import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.join('src', 'data', 'daily');
const firstGameNumber = 49;
const ignoredTokens = new Set(['A', 'AN', 'AND', 'ET', 'IN', 'OF', 'ON', 'OR', 'THE', 'TO']);
const titleStops = new Set([
  'A',
  'AN',
  'AND',
  'ARE',
  'AT',
  'BE',
  'EVERY',
  'EVERYONE',
  'FOR',
  'FROM',
  'IN',
  'OF',
  'ON',
  'THE',
  'THAT',
  'THINGS',
  'TO',
  'WE',
  'WHEN',
  'WITH',
  'YOU',
  'YOURE',
]);

const schedule = [
  ['2026-09-01', 'Back To School Brain', 'Lunchbox Classics'],
  ['2026-09-02', 'Homework Excuses', 'School Supply Aisle'],
  ['2026-09-03', 'After School Rituals', 'Things Teachers Said'],
  ['2026-09-04', 'Morning Routine Mayhem', 'Permission Slip Panic'],
  ['2026-09-05', 'Youth Sports Saturday', 'Sideline Parent Behavior'],
  ['2026-09-06', 'Grocery Store Math', 'Forgotten Passwords'],
  ['2026-09-07', 'Cookout Culture', 'Things At The Picnic Table'],
  ['2026-09-08', 'Office Small Talk', 'Meeting That Could Wait'],
  ['2026-09-09', 'Commute Thoughts', 'Parking Lot Drama'],
  ['2026-09-10', 'Phone Battery Anxiety', 'Apps We Check Too Much'],
  ['2026-09-11', 'Airport People Watching', 'Carry On Mistakes'],
  ['2026-09-12', 'Hotel Room Habits', 'Vacation Dad Mode'],
  ['2026-09-13', 'Road Trip Rules', 'Gas Station Snacks'],
  ['2026-09-14', 'Weather App Obsession', 'Things In The Junk Drawer'],
  ['2026-09-15', 'Adult Chores', 'Laundry Room Mysteries'],
  ['2026-09-16', 'Doctor Waiting Room', 'Pharmacy Aisle Decisions'],
  ['2026-09-17', 'Things Everyone Googles', 'Symptoms We Should Ignore'],
  ['2026-09-18', 'Streaming Service Fatigue', 'Shows We Rewatch'],
  ['2026-09-19', 'Saturday Cleaning Sprint', 'Closet Archaeology'],
  ['2026-09-20', 'Sunday Night Feelings', 'Tomorrow Problems'],
  ['2026-09-21', 'Fall Starter Pack', 'Pumpkin Spice Opinions'],
  ['2026-09-22', 'Tailgate Traditions', 'Football Food Logic'],
  ['2026-09-23', 'Home Improvement Regrets', 'Hardware Store Confidence'],
  ['2026-09-24', 'Car Dashboard Lights', 'Mechanic Translation'],
  ['2026-09-25', 'Fast Food Favorites', 'Drive Thru Pressure'],
  ['2026-09-26', 'Weddings As A Guest', 'Reception Table Politics'],
  ['2026-09-27', 'Baby Shower Bingo', 'Registry Guesswork'],
  ['2026-09-28', 'Things At Grandmas House', 'Family Photo Evidence'],
  ['2026-09-29', 'Online Shopping Lies', 'Package Tracking Addiction'],
  ['2026-09-30', 'Tiny Daily Annoyances', 'Things We Pretend Are Fine'],
  ['2026-10-01', 'Spooky Season Starter', 'Halloween Candy Rankings'],
  ['2026-10-02', 'Costume Party Logic', 'Things In The Basement'],
  ['2026-10-03', 'Haunted House Behavior', 'Scary Movie Mistakes'],
  ['2026-10-04', 'Pumpkin Patch People', 'Apple Orchard Economy'],
  ['2026-10-05', 'Fall Weekend Plans', 'Flannel Weather'],
  ['2026-10-06', 'Coffee Order Culture', 'Breakfast Drive Thru'],
  ['2026-10-07', 'Office Fridge Crimes', 'Break Room Etiquette'],
  ['2026-10-08', 'Things Kids Collect', 'Backpack Surprises'],
  ['2026-10-09', 'Suburban Wildlife Reports', 'Neighborhood Group Chat'],
  ['2026-10-10', 'Birthday Party Circuit', 'Pizza Party Math'],
  ['2026-10-11', 'Sports Parent Season', 'Equipment Bag Smells'],
  ['2026-10-12', 'Sunday Dinner Debate', 'Leftover Strategy'],
  ['2026-10-13', 'Things In The Medicine Cabinet', 'Bathroom Drawer Secrets'],
  ['2026-10-14', 'Middle School Memories', 'School Dance Drama'],
  ['2026-10-15', 'High School Hallways', 'Cafeteria Classics'],
  ['2026-10-16', 'Early Internet Weirdness', 'Screen Name Shame'],
  ['2026-10-17', 'Mall Culture', 'Food Court Decisions'],
  ['2026-10-18', 'Things From The 90s', 'Things From The 2000s'],
  ['2026-10-19', 'Movie Night Rules', 'Popcorn Bucket Logic'],
  ['2026-10-20', 'Reality TV Brain', 'Celebrity Gossip Memory'],
  ['2026-10-21', 'Popular Music Moments', 'Songs Everyone Knows'],
  ['2026-10-22', 'TV Shows Everyone Watched', 'Commercials We Remember'],
  ['2026-10-23', 'Halloween Party Snacks', 'Costume Store Panic'],
  ['2026-10-24', 'Trick Or Treat Strategy', 'Candy Bowl Honor System'],
  ['2026-10-25', 'Pumpkin Carving Confidence', 'Front Porch Decorations'],
  ['2026-10-26', 'Things That Feel Illegal', 'Tiny Moral Dilemmas'],
  ['2026-10-27', 'Bad Excuses', 'Last Minute Plans'],
  ['2026-10-28', 'Creepy Childhood Stories', 'Sleepover Legends'],
  ['2026-10-29', 'Haunted Snack Cabinet', 'Candy Parent Tax'],
  ['2026-10-30', 'Halloween Eve Chaos', 'Costume Backup Plan'],
  ['2026-10-31', 'Halloween Night', 'Candy Trade Market'],
  ['2026-11-01', 'Leftover Candy Breakfast', 'Post Halloween Cleanup'],
  ['2026-11-02', 'Daylight Saving Confusion', 'Clocks Nobody Changes'],
  ['2026-11-03', 'Election Day Errands', 'Civic Duty Snacks'],
  ['2026-11-04', 'Cold Weather Denial', 'Jacket Season'],
  ['2026-11-05', 'Soup Season', 'Bread Basket Priorities'],
  ['2026-11-06', 'Family Text Threads', 'Reply All Accidents'],
  ['2026-11-07', 'Homebody Weekend', 'Couch Decisions'],
  ['2026-11-08', 'Costco Logic', 'Bulk Purchase Regrets'],
  ['2026-11-09', 'Bills And Responsibilities', 'Adult Mail Anxiety'],
  ['2026-11-10', 'Things We Keep Forgetting', 'Calendar Reminder Lies'],
  ['2026-11-11', 'Veterans Day Memories', 'American History Class'],
  ['2026-11-12', 'Work Lunch Decisions', 'Desk Snack Stash'],
  ['2026-11-13', 'Things In The Glove Box', 'Car Console Treasure'],
  ['2026-11-14', 'Tailgate Leftovers', 'Game Day Superstitions'],
  ['2026-11-15', 'Thanksgiving Warmup', 'Family Recipe Politics'],
  ['2026-11-16', 'Grocery List Strategy', 'Coupon Drawer Energy'],
  ['2026-11-17', 'Things At The Dinner Table', 'Awkward Family Questions'],
  ['2026-11-18', 'Travel Week Planning', 'Suitcase Tetris'],
  ['2026-11-19', 'Airport Holiday Mode', 'Security Line Theater'],
  ['2026-11-20', 'Road Trip Thanksgiving', 'Rest Stop Traditions'],
  ['2026-11-21', 'Kitchen Prep Day', 'Refrigerator Jenga'],
  ['2026-11-22', 'Family Guest Room', 'Air Mattress Confidence'],
  ['2026-11-23', 'Thanksgiving Side Dishes', 'Turkey Timing Panic'],
  ['2026-11-24', 'Parade Morning', 'Pie Priority'],
  ['2026-11-25', 'Thanksgiving Eve', 'Cranberry Sauce Opinions'],
  ['2026-11-26', 'Thanksgiving Day', 'Leftover Plate Engineering'],
  ['2026-11-27', 'Black Friday Brain', 'Cart Full Of Regret'],
  ['2026-11-28', 'Holiday Decorating Begins', 'Tangled Light Therapy'],
  ['2026-11-29', 'Christmas Movie Season', 'Hot Chocolate Logic'],
  ['2026-11-30', 'Cyber Monday Decisions', 'Online Cart Negotiations'],
  ['2026-12-01', 'December Starter Pack', 'Holiday Calendar Panic'],
  ['2026-12-02', 'Elf Shelf Logistics', 'Things Wrapped Poorly'],
  ['2026-12-03', 'Holiday Party Season', 'Office Gift Exchange'],
  ['2026-12-04', 'Christmas Playlist Rules', 'Songs In Every Store'],
  ['2026-12-05', 'Snow Day Energy', 'Winter Coat Pockets'],
  ['2026-12-06', 'Holiday Shopping Math', 'Gift Receipt Strategy'],
  ['2026-12-07', 'Shipping Deadline Stress', 'Package Porch Watch'],
  ['2026-12-08', 'Cookie Tray Politics', 'Things Covered In Sprinkles'],
  ['2026-12-09', 'Family Traditions', 'Ornament Box Memories'],
  ['2026-12-10', 'Christmas Card Photos', 'Matching Pajama Debate'],
  ['2026-12-11', 'Holiday Travel Prep', 'Suitcase Gift Smuggling'],
  ['2026-12-12', 'Mall Santa Season', 'Food Court Christmas'],
  ['2026-12-13', 'Winter Weekend Plans', 'Blanket Fort Lifestyle'],
  ['2026-12-14', 'Office Holiday Behavior', 'Potluck Table Risks'],
  ['2026-12-15', 'Gift Ideas Running Low', 'Stocking Stuffer Science'],
  ['2026-12-16', 'Classic Christmas Movies', 'Scenes Everyone Quotes'],
  ['2026-12-17', 'Holiday Lights Drive', 'Neighborhood Decoration Wars'],
  ['2026-12-18', 'School Winter Break', 'Classroom Party Snacks'],
  ['2026-12-19', 'Last Minute Shopping', 'Receipt Avalanche'],
  ['2026-12-20', 'Wrapping Paper Problems', 'Tape Dispenser Rage'],
  ['2026-12-21', 'Holiday Grocery Run', 'Checkout Line Survival'],
  ['2026-12-22', 'Family Arrivals', 'Guest Bathroom Panic'],
  ['2026-12-23', 'Christmas Eve Eve', 'Refrigerator Real Estate'],
  ['2026-12-24', 'Christmas Eve', 'Cookie Plate Negotiations'],
  ['2026-12-25', 'Christmas Morning', 'Battery Not Included'],
  ['2026-12-26', 'Day After Christmas', 'Return Line Reality'],
  ['2026-12-27', 'Lazy Holiday Week', 'Pajamas Past Noon'],
  ['2026-12-28', 'Year End Cleanup', 'Things We Meant To Do'],
  ['2026-12-29', 'New Year Prep', 'Resolution Pre Regret'],
  ['2026-12-30', 'Best Of The Year', 'Group Chat Recap'],
  ['2026-12-31', 'New Years Eve', 'Midnight Snack Strategy'],
];

const clueAngles = [
  'THE OPENING MOVE THAT MAKES THIS WHOLE LANE SEEM IMMEDIATELY PERSONAL',
  'THE MOMENT THAT TURNS NORMAL LIFE INTO A PERSONAL TRIAL',
  'THE ITEMIZED BURDEN THAT SEEMS OBVIOUS AND STILL ANNOYING',
  'THE APPROACH MADE RIGHT BEFORE THE DAY STARTS LAUGHING',
  'THE NUMBER CRUNCH THAT SOMEHOW FEELS MORE COMPLICATED THAN TAXES',
  'THE LITTLE DETOUR THAT BECOMES A WHOLE ERRAND WITH RECEIPTS',
  'THE CHOICE THAT SAYS YOU ARE TRYING WHILE ALSO ABSOLUTELY WINGING IT',
  'THE MINIATURE PROBLEM THAT ATTRACTS MAXIMUM OPINIONS QUICKLY',
  'THE BITE ADJACENT CHOICE THAT MAKES THE WHOLE CREW SUDDENLY ALERT',
  'THE UNSPOKEN LAW THAT GETS BROKEN AND THEN DEFENDED WITH CONFIDENCE',
  'THE BARELY HOLDING IT TOGETHER VERSION OF THIS SITUATION',
  'THE ULTIMATE LEVEL OF THIS LANE WHEN THE ENERGY IS GONE BUT COMMITMENT REMAINS',
];

const suffixes = [
  'STARTER PACK',
  'TINY PANIC',
  'CHECKLIST',
  'GAME PLAN',
  'MENTAL MATH',
  'SIDE QUEST',
  'BIG DECISION',
  'GROUP DRAMA',
  'SNACK LOGIC',
  'HOUSE RULES',
  'SURVIVAL MODE',
  'FINAL BOSS',
];

const usedAnswers = new Set(loadExistingAnswers());

fs.mkdirSync(outputDir, { recursive: true });

schedule.forEach(([dateSeed, dailyTheme, bonusTheme], index) => {
  const gameNumber = firstGameNumber + index;
  const set = {
    gameNumber,
    dateSeed,
    theme: normalize(dailyTheme),
    daily: buildTrack(dailyTheme, dateSeed, 'daily'),
    bonus: buildTrack(bonusTheme, dateSeed, 'bonus'),
  };

  fs.writeFileSync(path.join(outputDir, `${dateSeed}.json`), `${JSON.stringify(set, null, 2)}\n`);
});

console.log(`Generated ${schedule.length} rest-of-year GUZZLE days through 2026-12-31.`);

function buildTrack(theme, dateSeed, trackType) {
  const core = getCore(theme);
  const themeKey = normalize(theme);
  const puzzles = suffixes.map((suffix, index) => {
    const level = index + 1;
    const answer = uniqueAnswer(core, suffix, themeKey, level);
    const clue = clueAngles[index];
    const leaks = findAnswerWordLeaks(clue, answer);

    if (leaks.length) {
      throw new Error(`${dateSeed} ${trackType} ${theme}: clue leaks ${leaks.join(', ')}`);
    }

    return {
      level,
      category: level === 12 ? 'FINAL LAP' : themeKey,
      clue,
      answer,
      difficulty: difficultyFor(level),
      difficultyValue: difficultyValueFor(level),
    };
  });

  return { theme: themeKey, puzzles };
}

function uniqueAnswer(core, suffix, themeKey, level) {
  const candidates = [
    normalize(`${core} ${suffix}`),
    normalize(`${themeKey} ${suffix}`),
    normalize(`${core} LAP ${level}`),
  ];

  for (const answer of candidates) {
    if (!usedAnswers.has(answer)) {
      usedAnswers.add(answer);
      return answer;
    }
  }

  throw new Error(`Could not create unique answer for ${themeKey} lap ${level}`);
}

function getCore(theme) {
  const tokens = normalize(theme)
    .split(' ')
    .filter((token) => token.length > 1 && !titleStops.has(token));
  return tokens.slice(0, 2).join(' ') || normalize(theme).split(' ').slice(0, 2).join(' ');
}

function difficultyFor(level) {
  if (level <= 3) return 'FAST START';
  if (level <= 7) return 'STEADY';
  if (level <= 11) return 'PUSH';
  return 'FINAL LAP';
}

function difficultyValueFor(level) {
  return Math.min(55, 44 + level);
}

function normalize(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAnswerWordLeaks(clue, answer) {
  const answerTokens = normalize(answer)
    .split(' ')
    .filter((token) => token.length >= 4 && !ignoredTokens.has(token));
  const clueTokens = new Set(normalize(clue).split(' ').filter(Boolean));
  return answerTokens.filter((token) => clueTokens.has(token));
}

function loadExistingAnswers() {
  const dailyDir = path.join('src', 'data', 'daily');
  const answers = [];

  if (!fs.existsSync(dailyDir)) return answers;

  for (const fileName of fs.readdirSync(dailyDir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(fileName)) continue;
    if (fileName >= '2026-09-01.json') continue;

    const set = JSON.parse(fs.readFileSync(path.join(dailyDir, fileName), 'utf8'));
    const tracks = [];
    if (Array.isArray(set.puzzles)) tracks.push(set);
    if (set.daily?.puzzles) tracks.push(set.daily);
    if (set.bonus?.puzzles) tracks.push(set.bonus);

    tracks.forEach((track) => {
      track.puzzles.forEach((puzzle) => answers.push(normalize(puzzle.answer)));
    });
  }

  return answers;
}
