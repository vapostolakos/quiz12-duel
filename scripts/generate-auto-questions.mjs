import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bankPath = path.join(root, 'automation-data', 'auto-country-bank.json');
const generalBankPath = path.join(root, 'automation-data', 'auto-general-bank.json');
const statePath = path.join(root, 'automation-data', 'question-generator-state.json');
const outputPath = path.join(root, 'Quiz12-auto-questions.js');

const RUN_ENTRY_COUNT = 12;
const RUN_GENERAL_COUNT = 12;

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const generalBank = JSON.parse(fs.readFileSync(generalBankPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

function rotate(array, offset) {
  if (!array.length) return [];
  const safeOffset = ((offset % array.length) + array.length) % array.length;
  return array.slice(safeOffset).concat(array.slice(0, safeOffset));
}

function makeDistractors(entry, field) {
  const sameRegion = bank.filter(item => item.region === entry.region && item[field] !== entry[field]);
  const fallback = sameRegion.length >= 3 ? sameRegion : bank.filter(item => item[field] !== entry[field]);
  const seed = entry.code.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + field.length;
  const ordered = rotate(fallback, seed);
  return ordered.slice(0, 3).map(item => item[field]);
}

function makeOptions(correct, distractors) {
  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = (correct.length + i) % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answerIndex: options.indexOf(correct) };
}

const selection = rotate(bank, state.offset).slice(0, Math.min(RUN_ENTRY_COUNT, bank.length));
const generalSelection = rotate(generalBank, state.generalOffset || 0).slice(0, Math.min(RUN_GENERAL_COUNT, generalBank.length));

const generatedQuestions = [];
for (const entry of selection) {
  const flagUrl = `https://flagcdn.com/${entry.code}.svg`;
  const countryOptions = makeOptions(entry.country, makeDistractors(entry, 'country'));
  generatedQuestions.push({
    id: `auto-flag-country-${entry.code}`,
    q: `Ποια δύσκολη χώρα ή επικράτεια αντιστοιχεί στη σημαία της εικόνας;`,
    o: countryOptions.options,
    a: countryOptions.answerIndex,
    h: `Η σωστή απάντηση ανήκει στη γεωγραφική περιοχή ${entry.region}.`,
    r: `Η σημαία της εικόνας ανήκει στην ${entry.country}.`,
    img: flagUrl
  });

  const capitalOptions = makeOptions(entry.capital, makeDistractors(entry, 'capital'));
  generatedQuestions.push({
    id: `auto-flag-capital-${entry.code}`,
    q: `Ποια είναι η πρωτεύουσα της χώρας ή επικράτειας που δείχνει η σημαία;`,
    o: capitalOptions.options,
    a: capitalOptions.answerIndex,
    h: `Η σημαία της εικόνας ανήκει στην ${entry.country}.`,
    r: `Η σημαία ανήκει στην ${entry.country} και πρωτεύουσά της είναι η ${entry.capital}.`,
    img: flagUrl
  });
}

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

state.offset = (state.offset + RUN_ENTRY_COUNT) % bank.length;
state.generalOffset = ((state.generalOffset || 0) + RUN_GENERAL_COUNT) % generalBank.length;
state.lastGeneratedAt = new Date().toISOString();
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');

console.log(`Generated ${generatedQuestions.length} auto questions.`);
