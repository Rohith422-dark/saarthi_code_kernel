import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { concepts, questions, chunks, badgeDefs, conceptsFor, GRADES } from './seed.js';
import { getDb, save, reset, log } from './store.js';
import {
  byId, bkt, r2, statusOf, GAP, MASTERED, avgMastery, conceptView, groupOf, rootGaps,
  recommend, publicQuestion, touchDay, lockedBy, initialDifficulty, dependents, mine,
} from './engine.js';
import { retrieve, sentences } from './retrieval.js';
import * as llm from './llm.js';
import { generate } from './gen.js';
import mountContests, { allBoards } from './contests.js';
import mountExams, { readiness } from './exams.js';
import mountResources from './resources.js';
import mountAuth, { gate, requireRole } from './auth.js';
import mountMessages from './messages.js';
import mountHomework, { statusFor } from './homework.js';

const PROD = process.env.NODE_ENV === 'production';
if (PROD && (!process.env.SAARTHI_TEACHER_PASSWORD || !process.env.SAARTHI_STUDENT_PASSWORD)) {
  console.error('Set SAARTHI_TEACHER_PASSWORD and SAARTHI_STUDENT_PASSWORD before running in production.');
  process.exit(1);
}

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
if (!PROD || process.env.CORS_ORIGIN) app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : undefined));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});
app.use(express.json({ limit: '6mb' }));

const wrap = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined) res.json(out);
    save();
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
const fail = (status, message) => Object.assign(new Error(message), { status });
const student = (req) => {
  if (req.user?.role !== 'student') throw fail(403, 'This is a learner-only feature.');
  const s = getDb().students.find((x) => x.id === req.user.id);
  if (!s) throw fail(404, 'Unknown learner');
  return s;
};
const pct = (p) => Math.round(p * 100);

function awardBadges(s, ctx) {
  const earned = [];
  const give = (id) => {
    if (!s.badges.includes(id)) { s.badges.push(id); earned.push(badgeDefs.find((b) => b.id === id)); }
  };
  if (ctx.correct && s.answered >= 1) give('first_step');
  if (s.correctRun >= 5) give('on_a_roll');
  if (s.streak >= 3) give('streak_3');
  if (s.streak >= 7) give('streak_7');
  if (ctx.masteredNow) give('mastery_1');
  if (ctx.gapClosed) give('gap_closer');
  return earned;
}

app.use('/api', gate);
const teacherOnly = requireRole('teacher');
app.use(['/api/teacher', '/api/resources', '/api/events', '/api/reset', '/api/students'], teacherOnly);
mountAuth(app, { wrap, fail });

app.get('/api/health', wrap(() => ({ ok: true, time: new Date().toISOString() })));

// Teachers choose a class with ?grade=; learners are always scoped to their own class.
const gradeParam = (req) => (GRADES.includes(Number(req.query.grade)) ? Number(req.query.grade) : 8);

app.get('/api/students', wrap((req) => {
  const board = allBoards();
  const grade = gradeParam(req);
  return getDb().students.filter((s) => s.grade === grade).map((s) => ({
    id: s.id, name: s.name, grade: s.grade, avg: r2(avgMastery(s)), group: groupOf(s), streak: s.streak, xp: s.xp,
    gaps: mine(s).filter((c) => s.mastery[c.id] < GAP).length, lastActiveAt: s.lastActiveAt,
    contestPoints: board[s.id].contestPoints, contests: board[s.id].contests, problemsSolved: board[s.id].problemsSolved, rank: board[s.id].rank,
  }));
}));

app.get('/api/me', wrap((req) => {
  const s = student(req);
  return { id: s.id, name: s.name, grade: s.grade, streak: s.streak, xp: s.xp, level: Math.floor(s.xp / 200) + 1 };
}));

app.get('/api/concepts', wrap((req) => conceptView(student(req))));

app.get('/api/dashboard', wrap((req) => {
  const s = student(req);
  const view = conceptView(s);
  const strands = [...new Set(mine(s).map((c) => c.strand))].map((name) => {
    const list = view.filter((c) => c.strand === name);
    return { name, mastery: r2(list.reduce((a, c) => a + c.mastery, 0) / list.length) };
  });
  const days = [];
  for (let d = 6; d >= 0; d--) {
    const dt = new Date(Date.now() - d * 86400000);
    const key = dt.toISOString().slice(0, 10);
    days.push({ date: key, label: dt.toLocaleDateString('en-US', { weekday: 'short' }), count: s.activity[key] || 0 });
  }
  const rec = recommend(s);
  return {
    student: { id: s.id, name: s.name, grade: s.grade, streak: s.streak, xp: s.xp, level: Math.floor(s.xp / 200) + 1, nextLevelXp: Math.floor(s.xp / 200 + 1) * 200 },
    stats: {
      avg: r2(avgMastery(s)),
      mastered: view.filter((c) => c.status === 'mastered').length,
      gaps: view.filter((c) => c.status === 'gap').length,
      total: view.length,
      answered: s.answered,
    },
    recommended: { ...rec, conceptName: rec.concept ? byId[rec.concept].name : null },
    strands,
    activity: days,
    concepts: view,
    badges: badgeDefs.map((b) => ({ ...b, unlocked: s.badges.includes(b.id) })),
    exam: (() => {
      const next = getDb().exams.filter((e) => e.grade === s.grade && new Date(e.date) > Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      return { next: next ? { ...next, daysLeft: Math.ceil((new Date(next.date) - Date.now()) / 86400000) } : null, readiness: readiness(s) };
    })(),
    homework: getDb().homework.filter((h) => h.grade === s.grade).map((h) => ({ id: h.id, title: h.title, dueAt: h.dueAt, maxPoints: h.maxPoints, status: statusFor(h, h.submissions.find((x) => x.studentId === s.id)) }))
      .filter((h) => h.status === 'todo' || h.status === 'overdue').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 3),
    recent: s.history.slice(-6).reverse().map((h) => ({ ...h, conceptName: byId[h.conceptId].name })),
  };
}));

// ---------- Activity heatmap ----------
/** A year of per-day counts (oldest first) with the numbers a contribution-style calendar shows. */
function activityView(map, days = 371) {
  const out = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    out.push({ date, count: map[date] || 0 });
  }
  let longest = 0, run = 0;
  for (const x of out) { run = x.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].count > 0) current++;
    else if (i === out.length - 1) continue; // today may not have started yet
    else break;
  }
  return { days: out, total: out.reduce((a, x) => a + x.count, 0), activeDays: out.filter((x) => x.count > 0).length, longest, current, max: Math.max(0, ...out.map((x) => x.count)) };
}

app.get('/api/activity', wrap((req) => activityView(student(req).activity)));

// ---------- Diagnostic ----------
function diagnosticQueue(targetId, grade) {
  const inClass = (id) => byId[id].grades.includes(grade);
  const queue = [targetId];
  for (let i = 0; i < queue.length; i++) for (const p of byId[queue[i]].prereqs) if (inClass(p) && !queue.includes(p)) queue.push(p);
  for (const c of conceptsFor(grade)) if (queue.length < 3 && !queue.includes(c.id)) queue.push(c.id);
  return queue.slice(0, 8);
}
const diagQuestion = (cid) => questions.find((q) => q.conceptId === cid && q.difficulty === 2);

app.post('/api/diagnostic/start', wrap((req) => {
  const s = student(req);
  const target = req.body.targetId;
  if (!byId[target] || !byId[target].grades.includes(s.grade)) throw fail(400, 'Choose a concept from your class');
  const queue = diagnosticQueue(target, s.grade);
  s.diagnostic = { targetId: target, queue, index: 0, results: {} };
  log(s.name, 'Started diagnostic', byId[target].name, `${queue.length} questions`);
  return { total: queue.length, index: 0, question: publicQuestion(diagQuestion(queue[0])), target: byId[target] };
}));

app.post('/api/diagnostic/answer', wrap((req) => {
  const s = student(req);
  const d = s.diagnostic;
  if (!d) throw fail(400, 'No diagnostic in progress');
  const q = questions.find((x) => x.id === req.body.questionId);
  if (!q || q.conceptId !== d.queue[d.index]) throw fail(400, 'Unexpected question');
  const correct = Number(req.body.choice) === q.answer;
  s.mastery[q.conceptId] = bkt(s.mastery[q.conceptId], correct);
  d.results[q.conceptId] = correct;
  d.index += 1;
  touchDay(s);
  const out = { correct, correctIndex: q.answer, explanation: q.explanation, total: d.queue.length, index: d.index };
  if (d.index < d.queue.length) {
    out.question = publicQuestion(diagQuestion(d.queue[d.index]));
    return out;
  }
  const wrong = d.queue.filter((c) => d.results[c] === false);
  const roots = wrong.filter((c) => byId[c].prereqs.every((p) => d.results[p] !== false));
  const right = d.queue.filter((c) => d.results[c]).length;
  const path = [...new Set([...roots, ...wrong, d.targetId])].sort((a, b) => byId[a].order - byId[b].order);
  out.result = {
    target: byId[d.targetId], score: { correct: right, total: d.queue.length },
    assessed: d.queue.map((c) => ({ conceptId: c, name: byId[c].name, correct: d.results[c] })),
    rootGaps: roots.map((c) => ({ id: c, name: byId[c].name })),
    path: path.map((c) => ({ id: c, name: byId[c].name, mastery: r2(s.mastery[c]) })),
    nextConcept: path[0],
  };
  log(s.name, 'Completed diagnostic', byId[d.targetId].name, roots.length ? `Root gap: ${roots.map((c) => byId[c].name).join(', ')}` : 'No gaps found');
  s.diagnostic = null;
  return out;
}));

// ---------- Practice: Easy / Medium / Hard, generated problems ----------
const LEVEL_NAME = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const solvedOf = (s, cid) => (s.solved[cid] ||= { 1: 0, 2: 0, 3: 0 });

app.get('/api/practice/next', wrap((req) => {
  const s = student(req);
  const cid = req.query.conceptId;
  const c = byId[cid];
  if (!c || !c.grades.includes(s.grade)) throw fail(400, 'Unknown concept');
  const blockers = lockedBy(s, c);
  if (blockers.length) {
    return { locked: true, blockers: blockers.map((id) => ({ id, name: byId[id].name, mastery: r2(s.mastery[id]) })), concept: c };
  }
  const level = [1, 2, 3].includes(Number(req.query.level)) ? Number(req.query.level) : initialDifficulty(s.mastery[cid]);
  const q = generate(cid, level);
  const id = `g${getDb().seq++}`;
  s.pending[id] = { answer: q.answer, explanation: q.explanation, conceptId: cid, level };
  for (const k of Object.keys(s.pending).slice(0, -30)) delete s.pending[k];
  return {
    locked: false, concept: c, level, levelName: LEVEL_NAME[level], mastery: r2(s.mastery[cid]), solved: solvedOf(s, cid),
    question: { id, conceptId: cid, conceptName: c.name, difficulty: level, prompt: q.prompt, options: q.options },
  };
}));

app.post('/api/practice/answer', wrap((req) => {
  const s = student(req);
  const qid = String(req.body.questionId);
  const p = s.pending[qid];
  if (!p) throw fail(400, 'This question has expired. Load a new one.');
  delete s.pending[qid]; // one attempt per question
  const { conceptId: cid, level } = p;
  const correct = Number(req.body.choice) === p.answer;
  const before = s.mastery[cid];
  const st = (s.state[cid] ||= { difficulty: level, okRun: 0, wrongRun: 0 });
  s.mastery[cid] = bkt(before, correct);
  s.answered += 1;
  s.correctRun = correct ? s.correctRun + 1 : 0;
  if (correct) { st.okRun += 1; st.wrongRun = 0; s.xp += 5 * level; solvedOf(s, cid)[level] += 1; }
  else { st.wrongRun += 1; st.okRun = 0; s.xp += 2; }
  touchDay(s);
  const masteredNow = before < MASTERED && s.mastery[cid] >= MASTERED;
  const gapClosed = masteredNow && (st.wasGap ?? false);
  if (before < GAP) st.wasGap = true;
  s.history.push({ ts: new Date().toISOString(), conceptId: cid, questionId: qid, correct });
  s.history = s.history.slice(-60);
  const newBadges = awardBadges(s, { correct, masteredNow, gapClosed });
  if (masteredNow) log(s.name, 'Mastered concept', byId[cid].name, `${pct(s.mastery[cid])}% mastery`);

  let hint = null;
  if (st.wrongRun >= 2) {
    const weak = byId[cid].prereqs.filter((id) => byId[id].grades.includes(s.grade)).map((id) => byId[id]).sort((a, b) => s.mastery[a.id] - s.mastery[b.id])[0];
    if (weak && s.mastery[weak.id] < 0.7) hint = { conceptId: weak.id, name: weak.name, mastery: r2(s.mastery[weak.id]) };
  }
  // Nudge towards a better-fitting level, but the learner stays in charge of it.
  const suggest = st.okRun >= 3 && level < 3 ? level + 1 : st.wrongRun >= 3 && level > 1 ? level - 1 : null;
  if (suggest) st.okRun = st.wrongRun = 0;
  const unlocked = masteredNow ? dependents(cid, s.grade).filter((d) => lockedBy(s, d).length === 0 && s.mastery[d.id] < MASTERED).map((d) => ({ id: d.id, name: d.name })) : [];
  return {
    correct, correctIndex: p.answer, explanation: p.explanation,
    mastery: { before: r2(before), after: r2(s.mastery[cid]) }, masteredNow, hint, unlocked,
    level, solved: solvedOf(s, cid), suggest: suggest ? { level: suggest, name: LEVEL_NAME[suggest] } : null,
    xp: s.xp, streak: s.streak, newBadges,
  };
}));

// ---------- Tutor: Ollama agent + RAG over teacher-approved notes ----------
const src = (h, n) => ({
  n, id: h.chunk.id, conceptId: h.chunk.conceptId, title: h.chunk.title, code: h.chunk.code, version: h.chunk.version,
  page: h.chunk.page, section: h.chunk.section, status: h.chunk.status, score: h.score,
  excerpt: sentences(h.chunk.text).slice(0, h.chunk.section === 'Worked example' ? 2 : 1).join(' '), text: h.chunk.text,
});

const LANGS = { en: 'English', hi: 'Hindi', te: 'Telugu' };
const SYSTEM = (name, mastery, grade, lang) => `You are Saarthi, a patient maths tutor for ${name}, a Class ${grade} student in India (CBSE, ICSE or State board).
Reply in ${LANGS[lang] || 'English'}, keeping numbers, symbols and maths notation as they are.
Solve every question the student asks, fully and correctly: show short numbered steps, then state the final answer. Be warm and brief.
You are given numbered NOTES from the teacher-approved syllabus. When a note supports a sentence, add its number in square brackets right after it, like [1]. Never cite a number that is not in the notes.
If the notes do not cover the question, solve it from your own knowledge and do not cite anything. If the question is not about school maths or study skills, say politely that you can only help with studying.
Write plain text only: use Unicode symbols (×, ÷, ², √, ½, π), no LaTeX, no markdown headings, no bold.
${mastery}`;

function parseAnswer(text, sources) {
  const valid = new Set(sources.map((s) => s.n));
  const used = new Set();
  const paragraphs = text.split(/\n\s*\n/).map((raw) => {
    const cites = [];
    const clean = raw.replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, list) => {
      for (const n of list.split(',').map(Number)) if (valid.has(n) && !cites.includes(n)) { cites.push(n); used.add(n); }
      return '';
    }).trim();
    return { text: clean, cites };
  }).filter((p) => p.text);
  return { paragraphs, used };
}

function extractive(s, message, hits) {
  const cls = `Class ${s.grade}`;
  const top = hits[0];
  if (!top || top.score < 0.3) {
    return {
      kind: 'external',
      paragraphs: [{ text: `I could not find this in the teacher-approved ${cls} Maths notes, so I will not answer from memory.`, cites: [] }],
      note: 'Your question has been shared with your teacher. Try rephrasing with a concept name such as “exponents” or “area of a trapezium”.',
      sources: hits.filter((h) => h.score > 0.1).slice(0, 2).map((h, i) => src(h, i + 1)),
    };
  }
  const used = hits.filter((h) => h.score >= 0.3 && h.raw >= top.raw * 0.45).slice(0, 3);
  const paragraphs = used.map((h, i) => {
    const sn = sentences(h.chunk.text);
    const worked = h.chunk.section === 'Worked example';
    return { text: (worked ? sn : sn.slice(0, i === 0 ? 2 : 1)).join(' '), cites: [i + 1] };
  });
  return { kind: 'grounded', paragraphs, sources: used.map((h, i) => src(h, i + 1)) };
}

app.get('/api/llm/status', wrap(() => llm.status()));

app.post('/api/chat', wrap(async (req) => {
  const s = student(req);
  const message = String(req.body.message || '').trim();
  if (!message) throw fail(400, 'Ask a question first');
  const chats = (s.tutorChats ||= []);
  let chat = req.body.chatId ? chats.find((c) => c.id === req.body.chatId) : null;
  if (req.body.chatId && !chat) throw fail(404, 'That chat no longer exists.');
  // Saves the exchange in this learner's own history and tells the client which chat it belongs to.
  const remember = (answer) => {
    const now = new Date().toISOString();
    if (!chat) { chat = { id: `c${getDb().seq++}`, title: message.slice(0, 60), createdAt: now, updatedAt: now, messages: [] }; chats.unshift(chat); }
    const n = chat.messages.length;
    chat.messages.push({ id: `${chat.id}-${n + 1}`, role: 'user', text: message, ts: now }, { id: `${chat.id}-${n + 2}`, role: 'assistant', response: answer, ts: now });
    if (chat.messages.length > 100) chat.messages.splice(0, chat.messages.length - 100);
    chat.updatedAt = now;
    chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (chats.length > 30) chats.length = 30;
    return { ...answer, chatId: chat.id, title: chat.title, userMsgId: `${chat.id}-${n + 1}`, assistantMsgId: `${chat.id}-${n + 2}` };
  };
  const history = (Array.isArray(req.body.history) ? req.body.history : []).slice(-6)
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));

  // Short follow-ups ("why?", "show me again") borrow the previous question for retrieval.
  const prevUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const query = message.split(/\s+/).length < 6 ? `${prevUser} ${message}` : message;

  const st = await llm.status();
  const semantic = st.ok ? await llm.semanticScores(query) : null;
  const { tokens, hits } = retrieve(query, 4, semantic);
  if (!tokens && !st.ok) {
    return remember({ kind: 'smalltalk', paragraphs: [{ text: `Hi! Ask me about any Class ${s.grade} Maths question and I will solve it step by step.`, cites: [] }], sources: [] });
  }

  const relevant = hits.filter((h) => h.score >= 0.3).slice(0, 3);
  const sources = relevant.map((h, i) => src(h, i + 1));
  const top = relevant[0]?.chunk;

  let out;
  if (st.ok) {
    try {
      const weak = mine(s).filter((c) => s.mastery[c.id] < GAP).map((c) => c.name);
      const mastery = weak.length ? `The student is currently weak in: ${weak.join(', ')}. Gently revisit those basics if they matter for the answer.` : '';
      const notes = sources.length ? sources.map((x) => `[${x.n}] ${x.title} (${x.section}): ${x.text}`).join('\n') : '(no matching notes)';
      const reply = await llm.generate([
        { role: 'system', content: `${SYSTEM(s.name, mastery, s.grade, req.body.lang)}\n\nNOTES:\n${notes}` },
        ...history, { role: 'user', content: message },
      ]);
      if (!reply) throw new Error('The model returned an empty answer');
      const { paragraphs, used } = parseAnswer(reply, sources);
      out = used.size
        ? { kind: 'grounded', paragraphs, sources }
        : {
          kind: 'external', paragraphs,
          note: `Generated by ${llm.MODEL}. This answer is not from your teacher's approved notes, so check it with your teacher.`,
          sources: sources.slice(0, 2),
        };
      out.model = llm.MODEL;
      if (!used.size) {
        getDb().gaps.unshift({ query: message, student: s.name, ts: new Date().toISOString() });
        getDb().gaps.length = Math.min(getDb().gaps.length, 100);
      }
    } catch (e) {
      console.warn('Ollama failed:', e.message);
      out = { ...extractive(s, message, hits), warning: `The AI model did not respond (${e.message}). Showing notes only.` };
    }
  } else {
    out = { ...extractive(s, message, hits), warning: st.reason };
    if (out.kind === 'external') {
      getDb().gaps.unshift({ query: message, student: s.name, ts: new Date().toISOString() });
      getDb().gaps.length = Math.min(getDb().gaps.length, 100);
    }
  }

  const c = byId[(top || hits[0]?.chunk)?.conceptId];
  if (c && out.kind === 'grounded') {
    const m = s.mastery[c.id];
    const gap = c.prereqs.filter((id) => byId[id].grades.includes(s.grade)).map((id) => byId[id]).find((p) => s.mastery[p.id] < GAP);
    let follow = `Your current mastery in ${c.name} is ${pct(m)}%.`;
    if (gap) follow += ` ${gap.name} is a gap at ${pct(s.mastery[gap.id])}%, so it helps to revisit that first.`;
    else if (m < MASTERED) follow += ' A few practice questions will close the rest.';
    out.follow = { text: follow, conceptId: gap ? gap.id : c.id, label: gap ? `Revisit ${gap.name}` : `Practise ${c.name}` };
  }
  log(s.name, 'Tutor question', message.slice(0, 80), `${out.kind}${out.model ? ` · ${out.model}` : ''} · ${sources.length} sources`);
  return remember(out);
}));

// Each learner's saved tutor conversations. Only the learner who had them can read or delete them.
app.get('/api/chats', wrap((req) => (student(req).tutorChats || []).map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt, count: c.messages.length }))));

app.get('/api/chats/:id', wrap((req) => {
  const c = (student(req).tutorChats || []).find((x) => x.id === req.params.id);
  if (!c) throw fail(404, 'Chat not found');
  return c;
}));

app.delete('/api/chats/:id', wrap((req) => {
  const s = student(req);
  const before = (s.tutorChats || []).length;
  s.tutorChats = (s.tutorChats || []).filter((x) => x.id !== req.params.id);
  if (s.tutorChats.length === before) throw fail(404, 'Chat not found');
  return { ok: true };
}));

// ---------- Teacher ----------
app.get('/api/teacher/overview', wrap((req) => {
  const db = getDb();
  const grade = gradeParam(req);
  const cs = conceptsFor(grade);
  const classmates = db.students.filter((s) => s.grade === grade);
  const rows = classmates.map((s) => ({
    id: s.id, name: s.name, avg: r2(avgMastery(s)), group: groupOf(s), streak: s.streak,
    lastActiveAt: s.lastActiveAt, gaps: cs.filter((c) => s.mastery[c.id] < GAP).length,
    cells: Object.fromEntries(cs.map((c) => [c.id, r2(s.mastery[c.id])])),
  }));
  const conceptAvg = cs.map((c) => ({
    id: c.id, name: c.name, short: c.short, order: c.order,
    avg: r2(rows.reduce((a, r) => a + r.cells[c.id], 0) / rows.length),
    below: rows.filter((r) => r.cells[c.id] < MASTERED).length,
  }));
  const groups = { needs: [], on_track: [], ready: [] };
  rows.forEach((r) => groups[r.group].push({ id: r.id, name: r.name }));

  const now = Date.now();
  const alerts = [];
  for (const s of classmates) {
    const idle = Math.floor((now - new Date(s.lastActiveAt)) / 86400000);
    if (idle >= 4 && avgMastery(s) < 0.65) {
      alerts.push({ id: `a-idle-${s.id}`, severity: 'critical', type: 'Silently falling behind', studentId: s.id, student: s.name, message: `No activity for ${idle} days and average mastery is ${pct(avgMastery(s))}%.` });
    }
    for (const g of rootGaps(s)) {
      const deps = dependents(g.id, grade).length;
      if (deps) alerts.push({ id: `a-gap-${s.id}-${g.id}`, severity: 'warning', type: 'Root gap', studentId: s.id, student: s.name, message: `${g.name} is at ${pct(s.mastery[g.id])}% and blocks ${deps} later concept${deps > 1 ? 's' : ''}.` });
    }
    const last = (s.checkins || []).at(-1);
    if (last && last.level >= 4) {
      alerts.push({ id: `a-stress-${s.id}`, severity: last.level === 5 ? 'critical' : 'warning', type: 'Exam stress', studentId: s.id, student: s.name, message: `Reported feeling ${last.level === 5 ? 'very ' : ''}stressed about the exams. A kind word from you could help.` });
    }
  }
  for (const hw of db.homework.filter((h) => h.grade === grade)) {
    for (const s of classmates) {
      const st = statusFor(hw, hw.submissions.find((x) => x.studentId === s.id), now);
      if (st === 'overdue' || st === 'missing') {
        alerts.push({
          id: `a-hw-${hw.id}-${s.id}`, severity: st === 'missing' ? 'critical' : 'warning', type: st === 'missing' ? 'Homework missing' : 'Homework overdue',
          studentId: s.id, student: s.name, message: `"${hw.title}" ${st === 'missing' ? 'is closed and was never handed in.' : 'is past its deadline. Each day late costs points.'}`,
        });
      }
    }
  }
  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));

  const talking = [...conceptAvg].sort((a, b) => b.below - a.below).slice(0, 3).map((c) => {
    const note = chunks.find((n) => n.conceptId === c.id && n.section === 'Key idea');
    return { conceptId: c.id, concept: c.name, below: c.below, total: rows.length, opener: sentences(note.text)[0] };
  });
  const res = db.resources;
  return {
    grade,
    counts: { students: rows.length, needs: groups.needs.length, on_track: groups.on_track.length, ready: groups.ready.length },
    classAvg: r2(rows.reduce((a, r) => a + r.avg, 0) / Math.max(1, rows.length)),
    concepts: conceptAvg, rows, groups, alerts, talking,
    resources: {
      worksheets: res.filter((r) => r.type === 'Worksheet' && r.status === 'Approved').length,
      talkingPoints: res.filter((r) => r.type === 'Talking points' && r.status === 'Approved').length,
      pending: res.filter((r) => r.status === 'Pending review').length,
    },
    knowledgeGaps: db.gaps.slice(0, 8),
    activity: activityView(classmates.reduce((acc, s) => { for (const [k, v] of Object.entries(s.activity)) acc[k] = (acc[k] || 0) + v; return acc; }, {})),
  };
}));

app.get('/api/teacher/students/:id', wrap((req) => {
  const s = getDb().students.find((x) => x.id === req.params.id);
  if (!s) throw fail(404, 'Learner not found');
  const board = allBoards()[s.id];
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  for (const l of Object.values(s.solved || {})) for (const k of [1, 2, 3]) byLevel[k] += l[k];
  return {
    id: s.id, name: s.name, grade: s.grade, streak: s.streak, xp: s.xp, avg: r2(avgMastery(s)), group: groupOf(s), lastActiveAt: s.lastActiveAt,
    exam: { ...readiness(s), stress: (s.checkins || []).at(-1)?.level ?? null },
    activity: activityView(s.activity),
    concepts: conceptView(s), recommended: recommend(s),
    rank: board.rank, contestPoints: board.contestPoints, contests: board.contests,
    problemsSolved: board.problemsSolved, practiceSolved: board.practiceSolved, solvedByLevel: byLevel,
    homework: (() => {
      const st = getDb().homework.filter((h) => h.grade === s.grade).map((h) => statusFor(h, h.submissions.find((x) => x.studentId === s.id)));
      return { points: board.homeworkPoints, onTime: st.filter((x) => x === 'done').length, late: st.filter((x) => x === 'late').length, overdue: st.filter((x) => x === 'overdue').length, missing: st.filter((x) => x === 'missing').length };
    })(),
  };
}));

app.get('/api/events', wrap(() => getDb().events.slice(0, 100)));

app.post('/api/reset', wrap(() => { reset(); return { ok: true }; }));

mountContests(app, { wrap, fail, student });
mountMessages(app, { wrap, fail });
mountHomework(app, { wrap, fail, student });
mountExams(app, { wrap, fail, student });
mountResources(app, { wrap, fail, student });

// In production one process serves both the API and the built client.
const clientDir = process.env.CLIENT_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir, { index: false, maxAge: '1h', setHeaders: (res, f) => { if (f.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable'); } }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Saarthi API listening on http://localhost:${port}`));
