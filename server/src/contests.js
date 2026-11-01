import { concepts, GRADES } from './seed.js';
import { getDb, log } from './store.js';
import { contestQuestions, MAX_SCORE } from './contestData.js';
import { touchDay } from './engine.js';
import { homeworkPoints } from './homework.js';

const concept = Object.fromEntries(concepts.map((c) => [c.id, c.name]));
const statusOf = (c, now = Date.now()) =>
  now < new Date(c.startsAt) ? 'upcoming' : now > new Date(c.endsAt) ? 'ended' : 'live';

// Contest points rank first; problems solved (practice + contest) break ties.
const byContest = (a, b) => b.score - a.score || a.timeSec - b.timeSec;
const rankIn = (c, id) => [...c.results].sort(byContest).findIndex((r) => r.studentId === id) + 1;
const practiceSolved = (s) => Object.values(s.solved || {}).reduce((a, l) => a + l[1] + l[2] + l[3], 0);

/** One class's leaderboard: learners are only ever ranked against their own class. */
export function leaderboard(grade) {
  const db = getDb();
  const rows = db.students.filter((s) => s.grade === grade).map((s) => {
    const mine = db.contests.filter((c) => c.grade === grade).flatMap((c) => c.results.filter((r) => r.studentId === s.id));
    const contestSolved = mine.reduce((a, r) => a + r.correct, 0);
    const practice = practiceSolved(s);
    const hw = homeworkPoints(s.id);
    return {
      id: s.id, name: s.name, contestPoints: mine.reduce((a, r) => a + r.score, 0), contests: mine.length,
      bestScore: mine.reduce((a, r) => Math.max(a, r.score), 0),
      practiceSolved: practice, contestSolved, homeworkSolved: hw.correct, homeworkPoints: hw.points,
      problemsSolved: practice + contestSolved + hw.correct,
    };
  });
  rows.sort((a, b) => b.contestPoints - a.contestPoints || b.problemsSolved - a.problemsSolved || a.name.localeCompare(b.name));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Rank and totals for every learner, keyed by id (each within their own class). */
export const allBoards = () => Object.fromEntries(GRADES.flatMap((g) => leaderboard(g)).map((r) => [r.id, r]));

export default function mount(app, { wrap, fail, student }) {
  // A learner can only open their own class's contests.
  const find = (id, s) => {
    const c = getDb().contests.find((x) => x.id === id);
    if (!c || (s && c.grade !== s.grade)) throw fail(404, 'Contest not found');
    return c;
  };
  const publicQs = (id) => contestQuestions(id).map((q) => ({ index: q.index, level: q.level, points: q.points, prompt: q.prompt, options: q.options }));

  app.get('/api/contests', wrap((req) => {
    const s = student(req);
    return getDb().contests.filter((c) => c.grade === s.grade).map((c) => {
      const mine = c.results.find((r) => r.studentId === s.id);
      return {
        id: c.id, title: c.title, status: statusOf(c), startsAt: c.startsAt, endsAt: c.endsAt, durationMin: c.durationMin,
        questions: 10, maxScore: MAX_SCORE, participants: c.results.length,
        inProgress: !!s.contestRuns?.[c.id] && !mine,
        mine: mine ? { score: mine.score, correct: mine.correct, total: mine.total, timeSec: mine.timeSec, rank: rankIn(c, s.id) } : null,
      };
    }).reverse();
  }));

  app.post('/api/contests/:id/start', wrap((req) => {
    const s = student(req);
    const c = find(req.params.id, s);
    if (statusOf(c) !== 'live') throw fail(400, statusOf(c) === 'ended' ? 'This contest has ended.' : 'This contest has not started yet.');
    if (c.results.some((r) => r.studentId === s.id)) throw fail(400, 'You have already submitted this contest.');
    s.contestRuns ||= {};
    const run = (s.contestRuns[c.id] ||= { startedAt: Date.now() });
    const left = Math.max(0, Math.round((run.startedAt + c.durationMin * 60000 - Date.now()) / 1000));
    return { id: c.id, title: c.title, durationMin: c.durationMin, remainingSec: left, questions: publicQs(c.id), maxScore: MAX_SCORE };
  }));

  app.post('/api/contests/:id/submit', wrap((req) => {
    const s = student(req);
    const c = find(req.params.id, s);
    if (c.results.some((r) => r.studentId === s.id)) throw fail(400, 'You have already submitted this contest.');
    const run = s.contestRuns?.[c.id];
    if (!run) throw fail(400, 'Start the contest before submitting.');
    const answers = req.body.answers || {};
    const qs = contestQuestions(c.id);
    const review = qs.map((q) => {
      const chosen = answers[q.index] === undefined || answers[q.index] === null ? null : Number(answers[q.index]);
      return { index: q.index, level: q.level, points: q.points, prompt: q.prompt, options: q.options, chosen, answer: q.answer, correct: chosen === q.answer, explanation: q.explanation, concept: concept[q.conceptId] };
    });
    const result = {
      studentId: s.id, score: review.filter((r) => r.correct).reduce((a, r) => a + r.points, 0),
      correct: review.filter((r) => r.correct).length, total: qs.length,
      timeSec: Math.min(c.durationMin * 60, Math.round((Date.now() - run.startedAt) / 1000)),
      submittedAt: new Date().toISOString(),
    };
    c.results.push(result);
    s.reviews = { ...(s.reviews || {}), [c.id]: review };
    delete s.contestRuns[c.id];
    s.xp += result.score;
    touchDay(s);
    log(s.name, 'Submitted contest', c.title, `${result.score}/${MAX_SCORE} points`);
    return { ...result, rank: rankIn(c, s.id), participants: c.results.length, maxScore: MAX_SCORE, review };
  }));

  app.get('/api/contests/:id/me', wrap((req) => {
    const s = student(req);
    const c = find(req.params.id, s);
    const mine = c.results.find((r) => r.studentId === s.id);
    if (!mine) throw fail(404, 'You have not taken this contest.');
    return { ...mine, rank: rankIn(c, s.id), participants: c.results.length, maxScore: MAX_SCORE, review: s.reviews?.[c.id] ?? null };
  }));

  // Learners see their own class; a teacher picks a class with ?grade=.
  const gradeFor = (req) => {
    if (req.user.role === 'student') return getDb().students.find((s) => s.id === req.user.id).grade;
    const g = Number(req.query.grade);
    return GRADES.includes(g) ? g : 8;
  };

  app.get('/api/leaderboard', wrap((req) => {
    const grade = gradeFor(req);
    return {
      grade,
      rule: 'Ranked by total contest points. Ties are broken by total problems solved (practice, contests and homework).',
      rows: leaderboard(grade),
      contests: getDb().contests.filter((c) => c.grade === grade).map((c) => ({ id: c.id, title: c.title, status: statusOf(c) })).reverse(),
    };
  }));

  app.get('/api/leaderboard/:id', wrap((req) => {
    const c = find(req.params.id, req.user.role === 'student' ? getDb().students.find((x) => x.id === req.user.id) : null);
    const name = Object.fromEntries(getDb().students.map((s) => [s.id, s.name]));
    return {
      contest: { id: c.id, title: c.title, status: statusOf(c), maxScore: MAX_SCORE },
      rows: [...c.results].sort(byContest).map((r, i) => ({ rank: i + 1, id: r.studentId, name: name[r.studentId], score: r.score, correct: r.correct, total: r.total, timeSec: r.timeSec })),
    };
  }));
}
