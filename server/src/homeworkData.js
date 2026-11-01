import { generate, rng } from './gen.js';
import { conceptsFor } from './seed.js';

const DAY = 86400000;
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

const MIX = [1, 1, 2, 2, 3]; // level pattern when a homework mixes difficulties
export const CLOSE_AFTER_DAYS = 3; // late work is accepted for this many days after the deadline

/** Same paper for every learner in the class, seeded by homework id so answers never need storing. */
export function homeworkQuestions(hw) {
  return Array.from({ length: hw.count }, (_, i) => {
    const level = hw.level || MIX[i % MIX.length];
    return { index: i, level, ...generate(hw.conceptId, level, rng(`${hw.id}:${i}`)) };
  });
}

export const closesAt = (dueAt) => new Date(new Date(dueAt).getTime() + CLOSE_AFTER_DAYS * DAY).toISOString();

/** Marks, then applies the late penalty: a fixed number of points for every day (or part of a day) late. */
export function award(hw, correct, total, submittedAt) {
  const earned = Math.round((hw.maxPoints * correct) / total);
  const lateMs = new Date(submittedAt) - new Date(hw.dueAt);
  const daysLate = lateMs > 0 ? Math.ceil(lateMs / DAY) : 0;
  const penalty = Math.min(earned, daysLate * hw.penaltyPerDay);
  return { earned, daysLate, late: daysLate > 0, penalty, awarded: earned - penalty };
}

const DEFS = [
  // id, class, title, concept, level (0 = mixed), count, max points, due offset (days), who is late / missing / early
  ['h1', 8, 'Linear equations: balance method', 'c7', 2, 6, 30, -6, { late: { Rohan: 0.6 }, missing: ['Neha'] }],
  ['h2', 8, 'Exponents: laws of indices', 'c4', 0, 6, 30, -0.6, { late: { Zoya: 0.4 }, missing: ['Aarav', 'Karthik'] }],
  ['h3', 8, 'Percentages: discount and profit', 'c10', 1, 5, 20, 2, { early: ['Zoya', 'Meera'] }],
  ['h4', 8, 'Area of triangles and trapeziums', 'c12', 0, 8, 40, 6, { early: ['Zoya'] }],
  ['h5', 6, 'Fractions and decimals practice', 'c2', 1, 5, 20, -4, { late: { Vihaan: 1 }, missing: [] }],
  ['h6', 6, 'First steps in algebra', 'c6', 0, 6, 30, 3, { early: ['Anaya'] }],
  ['h7', 7, 'Rational numbers warm-up', 'c3', 1, 5, 20, -3, { late: {}, missing: ['Arjun'] }],
  ['h8', 7, 'Simple equations', 'c7', 0, 6, 30, 4, { early: ['Saanvi'] }],
  ['h9', 9, 'Laws of exponents', 'c4', 0, 6, 30, -5, { late: { Advait: 1 }, missing: [] }],
  ['h10', 9, 'Factorising expressions', 'c8', 2, 6, 30, 2, { early: ['Myra'] }],
  ['h11', 10, 'Linear equations revision', 'c7', 2, 8, 40, -2, { late: { Kabir: 1 }, missing: ['Rishi'] }],
  ['h12', 10, 'Percentage and interest set', 'c10', 0, 8, 40, 3, { early: ['Ananya'] }],
];

export function buildHomework(students, now = Date.now()) {
  return DEFS.map(([id, grade, title, conceptId, level, count, maxPoints, off, who]) => {
    const dueAt = new Date(now + off * DAY).toISOString();
    const hw = {
      id, grade, title, conceptId, level, count, maxPoints, penaltyPerDay: Math.max(1, Math.round(maxPoints * 0.1)),
      dueAt, closesAt: closesAt(dueAt),
      resourceId: id === 'h1' ? 'r8' : id === 'h4' ? 'r15' : null,
      instructions: 'Show your working on paper first, then enter your answers. Each question has one correct option.',
      createdAt: new Date(now + (off - 4) * DAY).toISOString(), createdBy: 'Ms. Lakshmi', submissions: [],
    };
    const mine = conceptsFor(grade);
    const classmates = students.filter((s) => s.grade === grade);
    // Past homework has near-complete submissions; upcoming homework has only a few early birds.
    const takers = off < 0 ? classmates : classmates.filter((s) => who.early?.includes(s.name));
    for (const s of takers) {
      if (who.missing?.includes(s.name)) continue;
      const avg = mine.reduce((a, c) => a + s.mastery[c.id], 0) / mine.length;
      const correct = Array.from({ length: count }).filter((_, i) => (hash(`${id}${s.id}${i}`) % 1000) / 1000 < Math.min(0.95, avg * 1.05)).length;
      const lateDays = who.late?.[s.name] !== undefined ? 1 + (hash(s.id + id) % 2) : 0;
      const due = new Date(dueAt).getTime();
      // A late hand-in cannot be in the future: when the deadline passed less than a day ago, it came a few hours after.
      const lateAt = Math.min(due + lateDays * DAY - 3600000, Math.max(due + 4 * 3600000, now - 3600000));
      const submittedAt = new Date(lateDays ? lateAt : due - (2 + (hash(s.id + id) % 20)) * 3600000).toISOString();
      hw.submissions.push({ studentId: s.id, submittedAt, correct, total: count, ...award(hw, correct, count, submittedAt) });
    }
    return hw;
  });
}
