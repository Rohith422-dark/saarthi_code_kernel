import { GRADES, conceptsFor } from './seed.js';
import { generate, rng, shuffle } from './gen.js';
import { getDb, log } from './store.js';
import { avgMastery, touchDay, byId, MASTERED } from './engine.js';
import { postGroup } from './messages.js';

const DAY = 86400000;
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
export const KINDS = ['unit', 'halfyearly', 'annual', 'preboard', 'board'];

// ---------- mock papers ----------
// Section A = easy (1 mark), B = medium (2 marks), C = hard (3 marks).
export const MOCK = {
  quick: { label: 'Quick test', counts: [5, 3, 2], minutes: 20 },
  full: { label: 'Full mock paper', counts: [10, 10, 5], minutes: 60 },
};
const SECTIONS = [['A', 1, 1], ['B', 2, 2], ['C', 3, 3]]; // name, level, marks

export function mockPaper(seed, size, grade) {
  const ids = conceptsFor(grade).map((c) => c.id);
  const order = shuffle(rng(seed), ids);
  const out = [];
  SECTIONS.forEach(([section, level, marks], si) => {
    for (let k = 0; k < MOCK[size].counts[si]; k++) {
      const index = out.length;
      const conceptId = order[index % order.length];
      out.push({ index, section, level, marks, conceptId, ...generate(conceptId, level, rng(`${seed}:${index}`)) });
    }
  });
  return out;
}
export const maxMarks = (size) => MOCK[size].counts.reduce((a, n, i) => a + n * SECTIONS[i][2], 0);

// ---------- readiness ----------
const handedInRate = (s) => {
  const hws = getDb().homework.filter((h) => h.grade === s.grade && new Date(h.dueAt) < Date.now());
  if (!hws.length) return 1;
  return hws.filter((h) => h.submissions.some((x) => x.studentId === s.id)).length / hws.length;
};

/** An indicator of preparation, built from mastery, recent mock papers and homework. Not a predicted mark. */
export function readiness(s) {
  const mastery = avgMastery(s);
  const last = (s.mocks || []).slice(-3);
  const mocks = last.length ? last.reduce((a, m) => a + m.pct, 0) / last.length : null;
  const hw = handedInRate(s);
  const score = mocks === null ? 0.65 * mastery + 0.35 * hw : 0.5 * mastery + 0.35 * mocks + 0.15 * hw;
  const pct = Math.round(score * 100);
  return { score: pct, band: pct < 50 ? 'focus' : pct < 70 ? 'getting' : pct < 85 ? 'track' : 'ready', mastery: Math.round(mastery * 100), mocks: mocks === null ? null : Math.round(mocks * 100), mocksTaken: (s.mocks || []).length, homework: Math.round(hw * 100) };
}

// ---------- weekly study plan ----------
function studyPlan(s, next) {
  const mine = conceptsFor(s.grade);
  const daysLeft = next ? Math.max(0, Math.ceil((new Date(next.date) - Date.now()) / DAY)) : null;
  const minutes = daysLeft === null || daysLeft > 90 ? 45 : daysLeft > 30 ? 60 : 90;
  const weak = mine.filter((c) => s.mastery[c.id] < MASTERED).sort((a, b) => s.mastery[a.id] - s.mastery[b.id]);
  const pool = weak.length ? weak : mine;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * DAY);
    const base = { date: d.toISOString().slice(0, 10), weekday: d.toLocaleDateString('en-US', { weekday: 'short' }) };
    if (i === 6) return { ...base, tasks: [{ type: 'rest', minutes: 0 }] };
    if (i === 2 || i === 5) return { ...base, tasks: [{ type: 'mock', size: i === 2 ? 'quick' : 'full', minutes: i === 2 ? MOCK.quick.minutes : MOCK.full.minutes }] };
    const c = pool[i % pool.length];
    const weakNow = s.mastery[c.id] < MASTERED;
    return { ...base, tasks: [
      { type: 'revise', conceptId: c.id, name: c.name, minutes: Math.round(minutes * 0.6) },
      { type: 'practice', conceptId: c.id, name: c.name, level: s.mastery[c.id] < 0.4 ? 1 : weakNow ? 2 : 3, minutes: Math.round(minutes * 0.4) },
    ] };
  });
  return { daysLeft, minutesPerDay: minutes, focus: weak.slice(0, 3).map((c) => ({ id: c.id, name: c.name, mastery: Math.round(s.mastery[c.id] * 100) })), week };
}

/** Seeds an exam calendar per class and gives every learner some mock-paper and check-in history. */
export function buildExams(students, now = Date.now()) {
  const exams = GRADES.flatMap((grade) => {
    const last = grade === 10 ? ['preboard', 'Pre-board examination', 'board', 'Board examination: Mathematics'] : ['halfyearly', 'Half-yearly examination', 'annual', 'Annual examination: Mathematics'];
    return [
      { id: `e${grade}a`, grade, title: 'Unit test 3: Algebra', kind: 'unit', date: new Date(now + 12 * DAY).toISOString() },
      { id: `e${grade}b`, grade, title: last[1], kind: last[0], date: new Date(now + 58 * DAY).toISOString() },
      { id: `e${grade}c`, grade, title: last[3], kind: last[2], date: new Date(now + 112 * DAY).toISOString() },
    ];
  });
  for (const s of students) {
    const mine = conceptsFor(s.grade);
    const avg = mine.reduce((a, c) => a + s.mastery[c.id], 0) / mine.length;
    s.mocks = [0, 1].map((i) => {
      const size = i ? 'full' : 'quick';
      const pct = Math.min(0.96, Math.max(0.1, avg * 1.02 + ((hash(s.id + i) % 100) - 50) / 600));
      return { id: `mk-seed-${s.id}-${i}`, at: new Date(now - (9 - i * 5) * DAY).toISOString(), size, score: Math.round(pct * maxMarks(size)), max: maxMarks(size), pct, timeSec: MOCK[size].minutes * 60 - 240, weak: [] };
    });
    // One learner is feeling the pressure, so the teacher view has something real to show.
    const stressed = s.name === 'Rishi' || s.name === 'Vihaan';
    s.checkins = [{ level: stressed ? 4 : 2, at: new Date(now - 6 * DAY).toISOString() }, { level: stressed ? 5 : 2 + (hash(s.id) % 2), at: new Date(now - 1 * DAY).toISOString() }];
  }
  return exams;
}

export default function mount(app, { wrap, fail, student }) {
  const db = () => getDb();
  const gradeQ = (req) => (GRADES.includes(Number(req.query.grade)) ? Number(req.query.grade) : 8);
  const view = (e) => ({ ...e, daysLeft: Math.ceil((new Date(e.date) - Date.now()) / DAY) });
  const upcoming = (grade) => db().exams.filter((e) => e.grade === grade && new Date(e.date) > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date)).map(view);

  // ---------- learner ----------
  app.get('/api/exams/centre', wrap((req) => {
    const s = student(req);
    const exams = upcoming(s.grade);
    return {
      grade: s.grade, exams, next: exams[0] ?? null, readiness: readiness(s), plan: studyPlan(s, exams[0]),
      mocks: (s.mocks || []).slice(-8).reverse(),
      checkin: { latest: (s.checkins || []).at(-1) ?? null, history: (s.checkins || []).slice(-7) },
      sizes: Object.fromEntries(Object.entries(MOCK).map(([k, v]) => [k, { label: v.label, minutes: v.minutes, questions: v.counts.reduce((a, b) => a + b, 0), marks: maxMarks(k) }])),
    };
  }));

  app.post('/api/wellbeing', wrap((req) => {
    const s = student(req);
    const level = Number(req.body?.level);
    if (![1, 2, 3, 4, 5].includes(level)) throw fail(400, 'Choose how you feel, from 1 to 5.');
    (s.checkins ||= []).push({ level, at: new Date().toISOString() });
    s.checkins = s.checkins.slice(-30);
    if (level >= 4) log(s.name, 'Exam stress check-in', `Level ${level} of 5`, 'Teacher may want to reach out');
    return { ok: true, level };
  }));

  app.post('/api/mock/start', wrap((req) => {
    const s = student(req);
    const size = req.body?.size;
    if (!MOCK[size]) throw fail(400, 'Choose a quick test or a full paper.');
    const id = `mk${db().seq++}`;
    (s.mockRuns ||= {})[id] = { seed: id, size, startedAt: Date.now() };
    for (const k of Object.keys(s.mockRuns).slice(0, -6)) delete s.mockRuns[k];
    return { id };
  }));

  app.get('/api/mock/:id', wrap((req) => {
    const s = student(req);
    const done = (s.mocks || []).find((m) => m.id === req.params.id);
    if (done) return { status: 'done', result: done, review: s.mockReviews?.[done.id] ?? null };
    const run = s.mockRuns?.[req.params.id];
    if (!run) throw fail(404, 'Mock paper not found');
    const { minutes } = MOCK[run.size];
    return {
      status: 'running', id: req.params.id, size: run.size, label: MOCK[run.size].label, minutes, maxMarks: maxMarks(run.size),
      remainingSec: Math.max(0, Math.round((run.startedAt + minutes * 60000 - Date.now()) / 1000)),
      questions: mockPaper(run.seed, run.size, s.grade).map((q) => ({ index: q.index, section: q.section, marks: q.marks, level: q.level, prompt: q.prompt, options: q.options })),
    };
  }));

  app.post('/api/mock/:id/submit', wrap((req) => {
    const s = student(req);
    const run = s.mockRuns?.[req.params.id];
    if (!run) throw fail(400, 'This paper was already handed in, or it does not exist.');
    const qs = mockPaper(run.seed, run.size, s.grade);
    const answers = req.body?.answers || {};
    const review = qs.map((q) => {
      const chosen = answers[q.index] === undefined || answers[q.index] === null ? null : Number(answers[q.index]);
      return { index: q.index, section: q.section, level: q.level, marks: q.marks, conceptId: q.conceptId, concept: byId[q.conceptId].name, prompt: q.prompt, options: q.options, chosen, answer: q.answer, correct: chosen === q.answer, explanation: q.explanation };
    });
    const score = review.filter((r) => r.correct).reduce((a, r) => a + r.marks, 0);
    const max = maxMarks(run.size);
    const byConcept = {};
    for (const r of review) { const c = (byConcept[r.conceptId] ||= { conceptId: r.conceptId, name: r.concept, correct: 0, total: 0 }); c.total++; if (r.correct) c.correct++; }
    const result = {
      id: req.params.id, at: new Date().toISOString(), size: run.size, label: MOCK[run.size].label, score, max, pct: score / max,
      timeSec: Math.min(MOCK[run.size].minutes * 60, Math.round((Date.now() - run.startedAt) / 1000)),
      bySection: SECTIONS.map(([name, , marks]) => ({ section: name, score: review.filter((r) => r.section === name && r.correct).length * marks, max: review.filter((r) => r.section === name).length * marks })),
      byConcept: Object.values(byConcept),
      weak: Object.values(byConcept).filter((c) => c.correct / c.total < 0.6).map((c) => c.name),
    };
    (s.mocks ||= []).push(result);
    s.mockReviews = { ...(s.mockReviews || {}), [result.id]: review };
    for (const k of Object.keys(s.mockReviews).slice(0, -8)) delete s.mockReviews[k];
    delete s.mockRuns[req.params.id];
    touchDay(s);
    log(s.name, 'Completed mock paper', result.label, `${score}/${max}`);
    return { status: 'done', result, review };
  }));

  // ---------- teacher (per class) ----------
  app.get('/api/teacher/exams', wrap((req) => {
    const g = gradeQ(req);
    return db().exams.filter((e) => e.grade === g).sort((a, b) => new Date(a.date) - new Date(b.date)).map(view);
  }));

  app.post('/api/teacher/exams', wrap((req) => {
    const b = req.body || {};
    const grade = Number(b.grade);
    if (!GRADES.includes(grade)) throw fail(400, 'Choose a class.');
    const title = String(b.title || '').trim();
    if (title.length < 3 || title.length > 80) throw fail(400, 'Give the exam a title of 3 to 80 characters.');
    if (!KINDS.includes(b.kind)) throw fail(400, 'Choose the kind of exam.');
    const date = new Date(b.date);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) throw fail(400, 'Choose a date in the future.');
    const exam = { id: `e${db().seq++}`, grade, title, kind: b.kind, date: date.toISOString() };
    db().exams.push(exam);
    postGroup(req.user, `Exam dates updated: ${title} is on ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Open the Exam centre for your study plan and mock papers.`, grade);
    log(req.user.name, 'Added exam date', `${title} (Class ${grade})`, date.toDateString());
    return view(exam);
  }));

  app.delete('/api/teacher/exams/:id', wrap((req) => {
    const i = db().exams.findIndex((e) => e.id === req.params.id);
    if (i < 0) throw fail(404, 'Exam not found');
    const [gone] = db().exams.splice(i, 1);
    log(req.user.name, 'Removed exam date', gone.title, `Class ${gone.grade}`);
    return { ok: true };
  }));

  app.get('/api/teacher/exams/readiness', wrap((req) => {
    const g = gradeQ(req);
    return db().students.filter((s) => s.grade === g).map((s) => {
      const r = readiness(s);
      const latest = (s.checkins || []).at(-1);
      const prev = (s.checkins || []).at(-2);
      return {
        id: s.id, name: s.name, ...r, lastMock: (s.mocks || []).at(-1)?.pct ?? null,
        stress: latest ? { level: latest.level, at: latest.at } : null,
        flag: !!latest && (latest.level === 5 || (latest.level >= 4 && prev?.level >= 4)),
      };
    }).sort((a, b) => a.score - b.score);
  }));
}
