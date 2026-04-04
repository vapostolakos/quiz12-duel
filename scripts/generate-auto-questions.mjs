import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generalBankPath = path.join(root, 'automation-data', 'auto-general-bank.json');
const statePath = path.join(root, 'automation-data', 'question-generator-state.json');
const outputPath = path.join(root, 'Quiz12-auto-questions.js');
const userImageRoot = path.join(root, 'assets', 'images', 'questions');

const RUN_GENERAL_COUNT = 20;

const DEFAULT_STATE = {
  generalOffset: 0,
  assetImageSignature: '',
  processedImageAssets: [],
  lastGeneratedAt: ''
};

const IMAGE_LABEL_ALIASES = {
  'download': 'Γαλλία',
  'brazilian-flag-waving-stockcake': 'Βραζιλία',
  'flag-greece': 'Ελλάδα',
  'flag_of_germany': 'Γερμανία',
  'flag_of_japan': 'Ιαπωνία',
  'italy-flag-wallpaper_1024x1024': 'Ιταλία',
  'captain_america_shield': 'Captain America',
  'mouse-ears': 'Mickey Mouse',
  'ogre-ears': 'Shrek',
  'pikachu': 'Pikachu',
  'sonic': 'Sonic',
  'sponge': 'SpongeBob SquarePants',
  'arches': "McDonald's",
  'apple-bite': 'Apple',
  'instagram-camera': 'Instagram',
  'mercedes-star': 'Mercedes-Benz',
  'netflix-n': 'Netflix',
  'pepsi-circle': 'Pepsi',
  'play-button': 'YouTube',
  'rings': 'Audi',
  'starbucks-cup': 'Starbucks',
  'swoosh': 'Nike',
  'bat-emblem': 'Batman',
  'hammer-icon': 'Thor',
  'lantern-ring': 'Green Lantern',
  'spider-emblem': 'Spider-Man',
  'south-africa': 'Νότια Αφρική',
  'uk': 'Ηνωμένο Βασίλειο',
  'elephant': 'Ελέφαντας',
  'giraffe': 'Καμηλοπάρδαλη',
  'lion': 'Λιοντάρι',
  'octopus': 'Χταπόδι',
  'owl': 'Κουκουβάγια',
  'panda': 'Πάντα',
  'penguin': 'Πιγκουίνος',
  'shark': 'Καρχαρίας',
  'argentina': 'Αργεντινή',
  'australia': 'Αυστραλία',
  'brazil': 'Βραζιλία',
  'india': 'Ινδία',
  'italy': 'Ιταλία',
  'japan': 'Ιαπωνία',
  'madagascar': 'Μαδαγασκάρη',
  'norway': 'Νορβηγία'
};

const COUNTRY_CAPITALS = {
  'Αργεντινή': 'Μπουένος Άιρες',
  'Αυστραλία': 'Καμπέρα',
  'Βραζιλία': 'Μπραζίλια',
  'Γαλλία': 'Παρίσι',
  'Γερμανία': 'Βερολίνο',
  'Ελλάδα': 'Αθήνα',
  'Ινδία': 'Νέο Δελχί',
  'Ιταλία': 'Ρώμη',
  'Ιαπωνία': 'Τόκιο',
  'Μαδαγασκάρη': 'Ανταναναρίβο',
  'Νορβηγία': 'Όσλο',
  'Νότια Αφρική': 'Πρετόρια',
  'Ηνωμένο Βασίλειο': 'Λονδίνο'
};

const CATEGORY_FALLBACKS = {
  animals: ['Λύκος', 'Λεοπάρδαλη', 'Τίγρη', 'Κοάλα', 'Κροκόδειλος', 'Αετός'],
  cartoons: ['Bugs Bunny', 'Tom', 'Jerry', 'Scooby-Doo', 'Donald Duck', 'Patrick Star'],
  flags: ['Μπουτάν', 'Παλάου', 'Λάος', 'Μπρουνέι', 'Σουρινάμ', 'Κομόρες'],
  heroes: ['Iron Man', 'Superman', 'Wonder Woman', 'Flash', 'Hulk', 'Wolverine'],
  logos: ['Adidas', 'Toyota', 'Spotify', 'Amazon', 'Shell', 'BMW'],
  maps: ['Χιλή', 'Πορτογαλία', 'Ισλανδία', 'Νεπάλ', 'Βιετνάμ', 'Μαρόκο'],
  misc: ['Επιλογή Α', 'Επιλογή Β', 'Επιλογή Γ', 'Επιλογή Δ']
};

function rotate(array, offset) {
  if (!array.length) return [];
  const safeOffset = ((offset % array.length) + array.length) % array.length;
  return array.slice(safeOffset).concat(array.slice(0, safeOffset));
}

function stripKnownExtensions(fileName) {
  let result = fileName;
  let previous = '';
  while (result !== previous) {
    previous = result;
    result = result.replace(/\.(svg|png|jpg|jpeg|webp)$/i, '');
  }
  return result;
}

function normalizeKey(value) {
  return stripKnownExtensions(value)
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCaseSlug(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => {
      if (part.length <= 2) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function deriveAnswerLabel(relativePath, category) {
  const fileName = path.basename(relativePath);
  let baseName = normalizeKey(fileName);

  if (category === 'flags') {
    baseName = baseName
      .replace(/^flag-of-/, '')
      .replace(/^flag-/, '')
      .replace(/-flag($|-.*)/, '')
      .replace(/-wallpaper.*$/, '')
      .replace(/-waving.*$/, '')
      .replace(/-stockcake$/, '');
  } else if (category === 'maps') {
    baseName = baseName.replace(/-map$/, '');
  } else if (category === 'logos') {
    baseName = baseName
      .replace(/-logo$/, '')
      .replace(/-icon$/, '')
      .replace(/-brand$/, '');
  }

  return IMAGE_LABEL_ALIASES[baseName] || titleCaseSlug(baseName);
}

function listImageAssets(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return listImageAssets(fullPath);
    }

    const relativePath = path.relative(userImageRoot, fullPath).replace(/\\/g, '/');
    const category = relativePath.split('/')[0] || 'misc';

    return [{
      relativePath,
      category,
      answer: deriveAnswerLabel(relativePath, category)
    }];
  });
}

function readPreviousAutoQuestions() {
  if (!fs.existsSync(outputPath)) return [];
  const fileContents = fs.readFileSync(outputPath, 'utf8');
  const match = fileContents.match(/window\.QUIZ12_AUTO_QUESTIONS\s*=\s*(.*);\s*$/s);
  if (!match?.[1]) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function hashString(value) {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildUniqueOptions(correctAnswer, pool, seedKey) {
  const uniquePool = [...new Set(pool.filter(Boolean))].filter(option => option !== correctAnswer);
  const fallbackPool = [...new Set((CATEGORY_FALLBACKS.misc || []).concat(uniquePool))];
  const basePool = uniquePool.length >= 3 ? uniquePool : [...uniquePool, ...fallbackPool];
  const ordered = rotate(basePool, hashString(seedKey) % Math.max(basePool.length || 1, 1));
  const distractors = ordered.filter(option => option !== correctAnswer).slice(0, 3);

  while (distractors.length < 3) {
    distractors.push(`Επιλογή ${distractors.length + 1}`);
  }

  const combined = rotate([correctAnswer, ...distractors.slice(0, 3)], hashString(`${seedKey}-options`) % 4);
  return {
    options: combined,
    answerIndex: combined.indexOf(correctAnswer)
  };
}

function buildCapitalOptions(correctCapital, allCapitals, seedKey) {
  const pool = [...new Set(allCapitals.filter(Boolean))].filter(item => item !== correctCapital);
  return buildUniqueOptions(correctCapital, pool, seedKey);
}

function buildPrompt(category, answer) {
  switch (category) {
    case 'animals':
      return {
        q: 'Ποιο ζώο φαίνεται στην εικόνα;',
        h: 'Παρατήρησε προσεκτικά τα χαρακτηριστικά του ζώου.',
        r: `Η εικόνα δείχνει ${answer}.`
      };
    case 'cartoons':
      return {
        q: 'Ποιος χαρακτήρας κινουμένων σχεδίων φαίνεται στην εικόνα;',
        h: 'Σκέψου ποιος χαρακτήρας συνδέεται πιο έντονα με αυτό το οπτικό στοιχείο.',
        r: `Ο χαρακτήρας της εικόνας είναι ο/η ${answer}.`
      };
    case 'heroes':
      return {
        q: 'Ποιος ήρωας ή χαρακτήρας συνδέεται με αυτό το σύμβολο;',
        h: 'Δώσε βάση στο έμβλημα ή στο αντικείμενο που φαίνεται.',
        r: `Το σύμβολο ή αντικείμενο ανήκει στον/στην ${answer}.`
      };
    case 'logos':
      return {
        q: 'Σε ποια εταιρεία ή brand ανήκει αυτό το logo;',
        h: 'Κοίτα το σχήμα και τη συνολική αισθητική του σήματος.',
        r: `Το συγκεκριμένο logo ανήκει στο ${answer}.`
      };
    case 'maps':
      return {
        q: 'Ποια χώρα απεικονίζεται στον χάρτη;',
        h: 'Παρατήρησε το περίγραμμα και τη γεωγραφική μορφή.',
        r: `Ο χάρτης αντιστοιχεί στη χώρα ${answer}.`
      };
    case 'flags':
    default:
      return {
        q: 'Ποια χώρα ή επικράτεια αντιστοιχεί σε αυτή τη σημαία;',
        h: 'Εστίασε στα χρώματα, στα σύμβολα και στη διάταξη.',
        r: `Η σημαία ανήκει στη χώρα ή επικράτεια ${answer}.`
      };
  }
}

function buildImageQuestionsForEntry(entry, allEntries) {
  const seedBase = `${entry.category}:${entry.relativePath}`;
  const imagePath = `assets/images/questions/${entry.relativePath}`;

  const categoryEntries = allEntries.filter(item => item.category === entry.category);
  const sameCategoryAnswers = categoryEntries.map(item => item.answer);

  const prompt = buildPrompt(entry.category, entry.answer);
  const primaryOptions = buildUniqueOptions(entry.answer, sameCategoryAnswers.concat(CATEGORY_FALLBACKS[entry.category] || []), seedBase);

  const questions = [{
    id: `auto-img-${normalizeKey(entry.relativePath)}-1`,
    q: prompt.q,
    o: primaryOptions.options,
    a: primaryOptions.answerIndex,
    h: prompt.h,
    r: prompt.r,
    img: imagePath
  }];

  if ((entry.category === 'flags' || entry.category === 'maps') && COUNTRY_CAPITALS[entry.answer]) {
    const capital = COUNTRY_CAPITALS[entry.answer];
    const capitalOptions = buildCapitalOptions(
      capital,
      Object.values(COUNTRY_CAPITALS),
      `${seedBase}:capital`
    );

    questions.push({
      id: `auto-img-${normalizeKey(entry.relativePath)}-2`,
      q: entry.category === 'flags'
        ? 'Ποια είναι η πρωτεύουσα της χώρας που αντιστοιχεί στη σημαία;'
        : 'Ποια είναι η πρωτεύουσα της χώρας που φαίνεται στον χάρτη;',
      o: capitalOptions.options,
      a: capitalOptions.answerIndex,
      h: 'Σκέψου την επίσημη πρωτεύουσα της χώρας που αναγνωρίζεις.',
      r: `Η πρωτεύουσα της ${entry.answer} είναι η ${capital}.`,
      img: imagePath
    });
  }

  return questions;
}

function normalizeQuestionAssetPath(imgPath) {
  return String(imgPath || '').replace(/^assets\/images\/questions\//, '');
}

const generalBank = JSON.parse(fs.readFileSync(generalBankPath, 'utf8'));
const state = {
  ...DEFAULT_STATE,
  ...(JSON.parse(fs.readFileSync(statePath, 'utf8')))
};

const currentAssets = listImageAssets(userImageRoot);
const currentAssetSet = new Set(currentAssets.map(item => item.relativePath));
const currentAssetSignature = [...currentAssetSet].sort().join('|');
const previousAutoQuestions = readPreviousAutoQuestions();

const preservedImageQuestions = previousAutoQuestions.filter(item => {
  if (!item?.img) return false;
  return currentAssetSet.has(normalizeQuestionAssetPath(item.img));
});

const processedImageAssets = Array.isArray(state.processedImageAssets) ? state.processedImageAssets : [];
const processedSet = new Set(processedImageAssets.filter(item => currentAssetSet.has(item)));

const newImageEntries = currentAssets.filter(item => !processedSet.has(item.relativePath));
const newImageQuestions = newImageEntries.flatMap(entry => buildImageQuestionsForEntry(entry, currentAssets));

const generalSelection = rotate(generalBank, state.generalOffset || 0).slice(0, Math.min(RUN_GENERAL_COUNT, generalBank.length));
const generatedQuestions = [...preservedImageQuestions, ...newImageQuestions];

for (const entry of generalSelection) {
  generatedQuestions.push({
    id: entry.id,
    q: entry.q,
    o: entry.o,
    a: entry.a,
    h: entry.h,
    r: entry.r,
    img: ''
  });
}

const fileBody = `window.QUIZ12_AUTO_QUESTIONS = ${JSON.stringify(generatedQuestions, null, 2)};\n`;
fs.writeFileSync(outputPath, fileBody, 'utf8');

state.generalOffset = generalBank.length
  ? ((state.generalOffset || 0) + RUN_GENERAL_COUNT) % generalBank.length
  : 0;
state.assetImageSignature = currentAssetSignature;
state.processedImageAssets = [...new Set([...processedSet, ...newImageEntries.map(item => item.relativePath)])].sort();
state.lastGeneratedAt = new Date().toISOString();
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');

console.log(`Generated ${generatedQuestions.length} auto questions (${newImageQuestions.length} new image questions).`);
