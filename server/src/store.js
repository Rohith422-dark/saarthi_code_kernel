import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStudents, resources, DEMO } from './seed.js';
import { hashPassword } from './crypto.js';
import { buildContests } from './contestData.js';
import { buildHomework } from './homeworkData.js';
import { buildExams } from './exams.js';

export const dataDir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const dir = dataDir;
const file = path.join(dir, 'db.json');

const withAuth = (students) => students.map((s) => ({ ...s, username: s.name.toLowerCase(), passHash: hashPassword(DEMO.studentPassword) }));
const seedMessages = () => {
  const m = (seq, mins, thread, from, text) => ({ id: `m${seq}`, seq, ts: new Date(Date.now() - mins * 60000).toISOString(), thread, from, text });
  const T = { id: 't1', name: DEMO.teacher.name, role: 'teacher' };
  const st = (id, name) => ({ id, name, role: 'student' });
  return [
    m(1, 2900, 'group:8', T, 'Welcome to our Class 8 Maths group. Ask doubts here, share tips, and cheer each other on in the weekly contest.'),
    m(2, 2800, 'group:8', st('s4', 'Meera'), "Thank you ma'am! Is Contest #4 open for the whole week?"),
    m(3, 2790, 'group:8', T, 'Yes, it stays open until the end of the month. You get one attempt of 20 minutes.'),
    m(4, 400, 'dm:s3', T, 'Hi Karthik, I noticed you have not practised for a few days. Algebraic Expressions is the one to revisit first. Shall we go through it together?'),
    m(6, 3000, 'group:6', T, 'Welcome to the Class 6 Maths group. Ask doubts here and cheer each other on.'),
    m(7, 3000, 'group:7', T, 'Welcome to the Class 7 Maths group. Ask doubts here and cheer each other on.'),
    m(8, 3000, 'group:9', T, 'Welcome to the Class 9 Maths group. Ask doubts here and cheer each other on.'),
    m(9, 3000, 'group:10', T, 'Welcome to the Class 10 Maths group. Board exams are coming: use the Exam centre for mock papers and a study plan, and tell me early if you feel stuck.'),
    m(5, 120, 'dm:s5', T, 'Hi Neha, your fractions basics need a little work. Try the Easy level in Practice and tell me how it goes.'),
  ];
};

function fresh() {
  const t = (mins) => new Date(Date.now() - mins * 60000).toISOString();
  const ev = (i, mins, actor, action, target, detail) => ({ id: `e${i}`, ts: t(mins), actor, action, target, detail });
  const students = withAuth(buildStudents());
  return {
    students,
    teachers: [{ ...DEMO.teacher, passHash: hashPassword(DEMO.teacherPassword) }],
    sessions: {},
    messages: seedMessages(),
    reads: {},
    contests: buildContests(students),
    homework: buildHomework(students),
    exams: buildExams(students),
    resources: resources.map((r) => ({ ...r })),
    events: [
      ev(6, 25, 'Zoya', 'Mastered concept', 'Mensuration: Area', '86% mastery'),
      ev(5, 70, 'Ms. Lakshmi', 'Marked approved', 'Proportion: class talking points', 'SAR-RES-012 · English'),
      ev(4, 190, 'Meera', 'Completed diagnostic', 'Linear Equations', 'No gaps found'),
      ev(3, 600, 'Diya', 'Mastered concept', 'Algebraic Expressions', '83% mastery'),
      ev(2, 1500, 'Ms. Lakshmi', 'Marked approved', 'Exponents: laws of indices worksheet', 'SAR-RES-004 · English'),
      ev(1, 2900, 'System', 'AI draft created', 'Fractions & decimals practice set', 'SAR-RES-003 · Hindi, awaiting review'),
    ],
    gaps: [
      { query: 'what is a probability tree', student: 'Diya', ts: t(300) },
      { query: 'how to read a bar graph', student: 'Rohan', ts: t(1800) },
    ],
    seq: 7,
    mseq: 10,
    hseq: 13,
    rseq: 100,
  };
}

let db;
/** Upgrades saved data in place: new collections and counters are added, nothing that exists is overwritten. */
function upgrade(saved) {
  const base = fresh();
  for (const key of Object.keys(base)) if (saved[key] === undefined) saved[key] = base[key];
  return saved;
}

try {
  db = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Data from before sign-in existed has no accounts at all, so there is nothing to keep.
  db = db.students?.[0]?.passHash ? upgrade(db) : fresh();
} catch (e) {
  if (e.code !== 'ENOENT') console.warn(`Could not read ${file} (${e.message}). Starting from the demo data; the unreadable file is left untouched.`);
  db = fresh();
}

let timer;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db));
  }, 200);
}

export const getDb = () => db;
export function reset() {
  const sessions = db.sessions;
  db = fresh();
  db.sessions = sessions;
  save();
  return db;
}

export function log(actor, action, target, detail = '') {
  db.events.unshift({ id: `e${db.seq++}`, ts: new Date().toISOString(), actor, action, target, detail });
  db.events.length = Math.min(db.events.length, 300);
}
