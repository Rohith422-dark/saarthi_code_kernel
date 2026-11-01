import { GRADES, conceptsFor } from './seed.js';
import { generate, rng, shuffle } from './gen.js';

const DAY = 86400000;
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// 4 easy, 4 medium, 2 hard: the same paper for every learner in a class.
export const LEVELS = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3];
export const POINTS = { 1: 10, 2: 20, 3: 30 };
export const MAX_SCORE = LEVELS.reduce((a, l) => a + POINTS[l], 0);

/** Contest ids look like "k4g8": contest 4 for Class 8. */
export const gradeOfContest = (id) => Number(String(id).split('g')[1]);

/** Deterministic paper: seeded by the contest id, drawing only on that class's concepts. */
export function contestQuestions(id) {
  const ids = conceptsFor(gradeOfContest(id)).map((c) => c.id);
  const order = shuffle(rng(id), ids);
  return LEVELS.map((level, i) => ({
    index: i, level, points: POINTS[level], conceptId: order[i % order.length],
    ...generate(order[i % order.length], level, rng(`${id}:${i}`)),
  }));
}

const DEFS = [
  ['k1', 'Weekly Maths Contest #1', -21, -14],
  ['k2', 'Weekly Maths Contest #2', -14, -7],
  ['k3', 'Weekly Maths Contest #3', -7, -1],
  ['k4', 'Weekly Maths Contest #4', -0.1, 30],
];

/** Seed one contest series per class, with simulated results so each leaderboard has history. */
export function buildContests(students, now = Date.now()) {
  return GRADES.flatMap((grade) => DEFS.map(([base, title, from, to]) => {
    const id = `${base}g${grade}`;
    const qs = contestQuestions(id);
    const live = base === 'k4';
    const classmates = students.filter((s) => s.grade === grade);
    // The live contest has only a few early finishers so there is something left to attempt.
    const takers = live ? classmates.filter((s, i) => (grade === 8 ? ['Meera', 'Zoya', 'Diya', 'Rohan'].includes(s.name) : i % 2 === 1)) : classmates;
    const results = takers.map((s) => {
      const mine = conceptsFor(grade);
      const avg = mine.reduce((a, c) => a + s.mastery[c.id], 0) / mine.length;
      let correct = 0, score = 0;
      qs.forEach((q) => {
        const chance = Math.min(0.95, Math.max(0.05, avg * 1.05 - 0.1 * (q.level - 1)));
        if ((hash(`${id}${s.id}${q.index}`) % 1000) / 1000 < chance) { correct++; score += q.points; }
      });
      const timeSec = 540 + (hash(`${id}${s.id}t`) % 640);
      const submittedAt = live ? new Date(now - (hash(s.id) % 90) * 60000) : new Date(now + to * DAY - (hash(s.id + id) % 5) * 3600000);
      return { studentId: s.id, score, correct, total: qs.length, timeSec, submittedAt: submittedAt.toISOString() };
    });
    return {
      id, grade, title, durationMin: 20,
      startsAt: new Date(now + from * DAY).toISOString(),
      endsAt: new Date(now + to * DAY).toISOString(),
      results,
    };
  }));
}
