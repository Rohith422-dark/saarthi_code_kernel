import { concepts, conceptsFor, GRADES } from './seed.js';
import { getDb, log } from './store.js';
import { homeworkQuestions, closesAt, award, CLOSE_AFTER_DAYS } from './homeworkData.js';
import { touchDay } from './engine.js';
import { postGroup } from './messages.js';

const DAY = 86400000;
const conceptName = Object.fromEntries(concepts.map((c) => [c.id, c.name]));
const LEVEL = { 0: 'Mixed', 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const fmtDue = (iso) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** todo (before the deadline) · overdue (late, still open) · missing (closed, nothing handed in) · done · late */
export function statusFor(hw, sub, now = Date.now()) {
  if (sub) return sub.late ? 'late' : 'done';
  if (now <= new Date(hw.dueAt)) return 'todo';
  return now <= new Date(hw.closesAt) ? 'overdue' : 'missing';
}

/** What a submission made right now would cost. */
function lateNow(hw, now = Date.now()) {
  const ms = now - new Date(hw.dueAt);
  const days = ms > 0 ? Math.ceil(ms / DAY) : 0;
  return { daysLate: days, penalty: Math.min(hw.maxPoints, days * hw.penaltyPerDay) };
}

export function homeworkPoints(studentId) {
  let points = 0, correct = 0;
  for (const hw of getDb().homework) {
    const s = hw.submissions.find((x) => x.studentId === studentId);
    if (s) { points += s.awarded; correct += s.correct; }
  }
  return { points, correct };
}

const meta = (hw) => ({
  id: hw.id, title: hw.title, conceptId: hw.conceptId, concept: conceptName[hw.conceptId], level: hw.level, levelName: LEVEL[hw.level],
  count: hw.count, maxPoints: hw.maxPoints, penaltyPerDay: hw.penaltyPerDay, dueAt: hw.dueAt, closesAt: hw.closesAt, closeAfterDays: CLOSE_AFTER_DAYS,
  grade: hw.grade, instructions: hw.instructions, createdBy: hw.createdBy, createdAt: hw.createdAt,
  worksheet: hw.resourceId ? (() => { const r = getDb().resources.find((x) => x.id === hw.resourceId); return r && { id: r.id, title: r.title, code: r.code, language: r.language }; })() : null,
});

export default function mount(app, { wrap, fail, student }) {
  const find = (id, s) => {
    const hw = getDb().homework.find((x) => x.id === id);
    if (!hw || (s && hw.grade !== s.grade)) throw fail(404, 'Homework not found');
    return hw;
  };
  const classHw = (s) => getDb().homework.filter((h) => h.grade === s.grade);

  // ---------- learners ----------
  app.get('/api/homework/summary', wrap((req) => {
    const s = student(req);
    const st = classHw(s).map((hw) => statusFor(hw, hw.submissions.find((x) => x.studentId === s.id)));
    return { todo: st.filter((x) => x === 'todo' || x === 'overdue').length, overdue: st.filter((x) => x === 'overdue').length };
  }));

  app.get('/api/homework', wrap((req) => {
    const s = student(req);
    return classHw(s).map((hw) => {
      const sub = hw.submissions.find((x) => x.studentId === s.id);
      return { ...meta(hw), status: statusFor(hw, sub), now: lateNow(hw), mine: sub ? { correct: sub.correct, total: sub.total, earned: sub.earned, penalty: sub.penalty, awarded: sub.awarded, daysLate: sub.daysLate, submittedAt: sub.submittedAt } : null };
    }).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }));

  app.get('/api/homework/:id', wrap((req) => {
    const s = student(req);
    const hw = find(req.params.id, s);
    const sub = hw.submissions.find((x) => x.studentId === s.id);
    const status = statusFor(hw, sub);
    const out = { ...meta(hw), status, now: lateNow(hw) };
    if (sub) {
      out.mine = { correct: sub.correct, total: sub.total, earned: sub.earned, penalty: sub.penalty, awarded: sub.awarded, daysLate: sub.daysLate, submittedAt: sub.submittedAt };
      out.review = s.homeworkReviews?.[hw.id] ?? null;
    } else if (status === 'todo' || status === 'overdue') {
      out.questions = homeworkQuestions(hw).map((q) => ({ index: q.index, level: q.level, prompt: q.prompt, options: q.options }));
    }
    return out;
  }));

  app.post('/api/homework/:id/submit', wrap((req) => {
    const s = student(req);
    const hw = find(req.params.id, s);
    if (hw.submissions.some((x) => x.studentId === s.id)) throw fail(400, 'You have already submitted this homework.');
    if (Date.now() > new Date(hw.closesAt)) throw fail(400, 'This homework is closed. Speak to your teacher.');
    const answers = req.body?.answers || {};
    const qs = homeworkQuestions(hw);
    const review = qs.map((q) => {
      const chosen = answers[q.index] === undefined || answers[q.index] === null ? null : Number(answers[q.index]);
      return { index: q.index, level: q.level, prompt: q.prompt, options: q.options, chosen, answer: q.answer, correct: chosen === q.answer, explanation: q.explanation };
    });
    const submittedAt = new Date().toISOString();
    const correct = review.filter((r) => r.correct).length;
    const sub = { studentId: s.id, submittedAt, correct, total: qs.length, ...award(hw, correct, qs.length, submittedAt) };
    hw.submissions.push(sub);
    s.homeworkReviews = { ...(s.homeworkReviews || {}), [hw.id]: review };
    s.xp += sub.awarded;
    touchDay(s);
    log(s.name, sub.late ? 'Submitted homework late' : 'Submitted homework', hw.title, `${sub.awarded}/${hw.maxPoints} points${sub.penalty ? ` (−${sub.penalty} late)` : ''}`);
    return { ...meta(hw), status: statusFor(hw, sub), mine: { correct, total: sub.total, earned: sub.earned, penalty: sub.penalty, awarded: sub.awarded, daysLate: sub.daysLate, submittedAt }, review };
  }));

  // ---------- teacher ----------
  const rowsFor = (hw) => getDb().students.filter((s) => s.grade === hw.grade).map((s) => {
    const sub = hw.submissions.find((x) => x.studentId === s.id);
    return {
      id: s.id, name: s.name, status: statusFor(hw, sub),
      correct: sub?.correct ?? null, total: hw.count, earned: sub?.earned ?? null, penalty: sub?.penalty ?? null, awarded: sub?.awarded ?? 0,
      daysLate: sub?.daysLate ?? 0, submittedAt: sub?.submittedAt ?? null,
    };
  });

  const gradeQ = (req) => (GRADES.includes(Number(req.query.grade)) ? Number(req.query.grade) : 8);

  app.get('/api/teacher/concepts', wrap((req) => conceptsFor(gradeQ(req)).map((c) => ({ id: c.id, name: c.name, strand: c.strand }))));

  app.get('/api/teacher/homework', wrap((req) => getDb().homework.filter((h) => h.grade === gradeQ(req)).map((hw) => {
    const rows = rowsFor(hw);
    const n = (st) => rows.filter((r) => r.status === st).length;
    const sub = rows.filter((r) => r.submittedAt);
    return {
      ...meta(hw), total: rows.length, submitted: sub.length, onTime: n('done'), late: n('late'), overdue: n('overdue'), missing: n('missing'), todo: n('todo'),
      avgPct: sub.length ? Math.round((sub.reduce((a, r) => a + r.correct / r.total, 0) / sub.length) * 100) : null,
      state: Date.now() > new Date(hw.closesAt) ? 'closed' : Date.now() > new Date(hw.dueAt) ? 'past due' : 'open',
    };
  }).sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt))));

  app.get('/api/teacher/homework/:id', wrap((req) => {
    const hw = find(req.params.id);
    return { ...meta(hw), rows: rowsFor(hw) };
  }));

  app.post('/api/teacher/homework', wrap((req) => {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (title.length < 3 || title.length > 80) throw fail(400, 'Give the homework a title of 3 to 80 characters.');
    const grade = Number(b.grade);
    if (!GRADES.includes(grade)) throw fail(400, 'Choose a class.');
    if (!conceptsFor(grade).some((c) => c.id === b.conceptId)) throw fail(400, 'Choose a topic from that class.');
    const level = Number(b.level);
    if (![0, 1, 2, 3].includes(level)) throw fail(400, 'Choose a difficulty.');
    const count = Number(b.count);
    if (!Number.isInteger(count) || count < 3 || count > 15) throw fail(400, 'Use between 3 and 15 questions.');
    const maxPoints = Number(b.maxPoints);
    if (!Number.isInteger(maxPoints) || maxPoints < 10 || maxPoints > 100) throw fail(400, 'Points must be between 10 and 100.');
    const penaltyPerDay = Number(b.penaltyPerDay);
    if (!Number.isInteger(penaltyPerDay) || penaltyPerDay < 0 || penaltyPerDay > maxPoints) throw fail(400, 'The late penalty must be between 0 and the total points.');
    const due = new Date(b.dueAt);
    if (Number.isNaN(due.getTime()) || due.getTime() < Date.now() + 5 * 60000) throw fail(400, 'Set a deadline that is at least a few minutes from now.');
    let resourceId = null;
    if (b.resourceId) {
      const r = getDb().resources.find((x) => x.id === b.resourceId);
      if (!r || r.type !== 'Worksheet' || r.status !== 'Approved') throw fail(400, 'Only approved worksheets can be attached.');
      resourceId = r.id;
    }
    const db = getDb();
    const hw = {
      id: `h${db.hseq++}`, grade, title, conceptId: b.conceptId, level, count, maxPoints, penaltyPerDay,
      dueAt: due.toISOString(), closesAt: closesAt(due), resourceId,
      instructions: String(b.instructions || '').trim().slice(0, 400) || 'Show your working on paper first, then enter your answers. Each question has one correct option.',
      createdAt: new Date().toISOString(), createdBy: req.user.name, submissions: [],
    };
    db.homework.push(hw);
    postGroup(req.user, `New homework: ${title} (${conceptName[hw.conceptId]}, ${hw.count} questions, ${maxPoints} points). Due ${fmtDue(hw.dueAt)}. Handing in late costs ${penaltyPerDay} point${penaltyPerDay === 1 ? '' : 's'} per day.`, grade);
    log(req.user.name, 'Assigned homework', title, `Due ${fmtDue(hw.dueAt)}`);
    return meta(hw);
  }));

  app.post('/api/teacher/homework/:id/remind', wrap((req) => {
    const hw = find(req.params.id);
    const pending = rowsFor(hw).filter((r) => r.status === 'todo' || r.status === 'overdue');
    if (!pending.length) throw fail(400, 'Everyone has already handed this in.');
    const late = Date.now() > new Date(hw.dueAt);
    postGroup(req.user, `Reminder: "${hw.title}" ${late ? `was due ${fmtDue(hw.dueAt)} and each day late now costs ${hw.penaltyPerDay} points` : `is due ${fmtDue(hw.dueAt)}`}. Still to hand in: ${pending.map((r) => r.name).join(', ')}.`, hw.grade);
    log(req.user.name, 'Sent homework reminder', hw.title, `${pending.length} pending`);
    return { reminded: pending.length };
  }));
}
