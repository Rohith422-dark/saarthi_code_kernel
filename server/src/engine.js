import { concepts, conceptsFor } from './seed.js';

export const byId = Object.fromEntries(concepts.map((c) => [c.id, c]));
export const GAP = 0.4;
export const MASTERED = 0.8;
export const UNLOCK = 0.5;

const P = { learn: 0.12, slip: 0.1, guess: 0.2 };
const r2 = (n) => Math.round(n * 100) / 100;
export { r2 };

// Bayesian Knowledge Tracing: posterior given the answer, then a learning step.
export function bkt(p, correct) {
  const { learn, slip, guess } = P;
  const post = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  return Math.min(0.99, post + (1 - post) * learn);
}

// Everything below is scoped to the learner's class: a concept outside the class syllabus never counts.
export const mine = (s) => conceptsFor(s.grade);
const inClass = (s, id) => byId[id].grades.includes(s.grade);

export const statusOf = (p) => (p < GAP ? 'gap' : p < MASTERED ? 'learning' : 'mastered');
export const lockedBy = (s, c) => c.prereqs.filter((id) => inClass(s, id) && s.mastery[id] < UNLOCK);
export const avgMastery = (s) => mine(s).reduce((a, c) => a + s.mastery[c.id], 0) / mine(s).length;
export const dependents = (id, grade) => conceptsFor(grade).filter((c) => c.prereqs.includes(id));

export function conceptView(s) {
  return mine(s).map((c) => ({
    ...c,
    prereqs: c.prereqs.filter((id) => inClass(s, id)),
    mastery: r2(s.mastery[c.id]),
    status: statusOf(s.mastery[c.id]),
    lockedBy: lockedBy(s, c),
    locked: lockedBy(s, c).length > 0,
    difficulty: s.state[c.id]?.difficulty ?? initialDifficulty(s.mastery[c.id]),
    solved: s.solved?.[c.id] ?? { 1: 0, 2: 0, 3: 0 },
  }));
}

export function groupOf(s) {
  const gaps = mine(s).filter((c) => s.mastery[c.id] < GAP).length;
  const avg = avgMastery(s);
  if (avg < 0.5 || gaps >= 2) return 'needs';
  if (avg >= 0.78 && gaps === 0) return 'ready';
  return 'on_track';
}

export function rootGaps(s) {
  return mine(s)
    .filter((c) => s.mastery[c.id] < GAP && lockedBy(s, c).length === 0)
    .sort((a, b) => s.mastery[a.id] - s.mastery[b.id]);
}

export function recommend(s) {
  const gap = rootGaps(s)[0];
  if (gap) {
    const deps = dependents(gap.id, s.grade).map((d) => d.name);
    return {
      type: 'revisit', concept: gap.id, mastery: r2(s.mastery[gap.id]),
      reason: deps.length
        ? `${gap.name} is the root gap. ${deps.join(' and ')} depend${deps.length === 1 ? 's' : ''} on it.`
        : `${gap.name} is below the mastery line and worth a short revisit.`,
    };
  }
  const next = mine(s).find((c) => s.mastery[c.id] < MASTERED && lockedBy(s, c).length === 0);
  if (next) {
    return { type: 'advance', concept: next.id, mastery: r2(s.mastery[next.id]), reason: `Your basics for ${next.name} are in place. Move forward.` };
  }
  return { type: 'complete', concept: null, mastery: 1, reason: 'Every concept is mastered. Try a chapter test or help a classmate.' };
}

export const initialDifficulty = (p) => (p < 0.4 ? 1 : p < 0.7 ? 2 : 3);

export function publicQuestion(q) {
  return { id: q.id, conceptId: q.conceptId, conceptName: byId[q.conceptId].name, difficulty: q.difficulty, prompt: q.prompt, options: q.options };
}

export function touchDay(s, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  s.activity[today] = (s.activity[today] || 0) + 1;
  if (s.lastActiveDate !== today) {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    s.streak = s.lastActiveDate === yesterday ? s.streak + 1 : 1;
    s.lastActiveDate = today;
  }
  s.lastActiveAt = now.toISOString();
}
