import { GRADES } from './seed.js';
import { getDb } from './store.js';
import { avgMastery, groupOf } from './engine.js';

/** Posts into a class group chat on someone's behalf (used when homework is assigned or chased). */
export function postGroup(user, text, grade) {
  const db = getDb();
  const msg = { id: `m${db.mseq}`, seq: db.mseq++, ts: new Date().toISOString(), thread: `group:${grade}`, from: { id: user.id, name: user.name, role: user.role }, text };
  db.messages.push(msg);
  return msg;
}

const groupBase = (g) => ({ id: `group:${g}`, kind: 'group', grade: g, title: `Class ${g} Maths`, subtitle: 'Everyone in the class and your teacher' });

export default function mount(app, { wrap, fail }) {
  const db = () => getDb();
  const me = (req) => req.user;
  const gradeOf = (u) => db().students.find((s) => s.id === u.id)?.grade;

  const isGroup = (t) => /^group:(6|7|8|9|10)$/.test(t);
  const canSee = (u, t) => {
    if (isGroup(t)) return u.role === 'teacher' || t === `group:${gradeOf(u)}`;
    return t.startsWith('dm:') && (u.role === 'teacher' || t === `dm:${u.id}`);
  };
  const known = (t) => isGroup(t) || (t.startsWith('dm:') && db().students.some((s) => `dm:${s.id}` === t));
  const access = (req) => {
    const t = req.params.id;
    if (!known(t) || !canSee(me(req), t)) throw fail(404, 'Conversation not found');
    return t;
  };
  const inThread = (t) => db().messages.filter((m) => m.thread === t);
  const unread = (u, t) => {
    const seen = db().reads[u.id]?.[t] ?? 0;
    return inThread(t).filter((m) => m.seq > seen && m.from.id !== u.id).length;
  };
  const markRead = (u, t) => {
    const last = inThread(t).at(-1)?.seq ?? 0;
    (db().reads[u.id] ||= {})[t] = last;
  };
  const view = (u, t, base) => {
    const last = inThread(t).at(-1) ?? null;
    return { ...base, last: last && { text: last.text, ts: last.ts, from: last.from.name }, unread: unread(u, t) };
  };
  const visible = (u) => (u.role === 'student' ? [`group:${gradeOf(u)}`, `dm:${u.id}`] : [...GRADES.map((g) => `group:${g}`), ...db().students.map((s) => `dm:${s.id}`)]);

  app.get('/api/messages/threads', wrap((req) => {
    const u = me(req);
    if (u.role === 'student') {
      const g = gradeOf(u);
      const t = db().teachers[0];
      return [
        view(u, `group:${g}`, { ...groupBase(g), subtitle: `${db().students.filter((s) => s.grade === g).length} learners and your teacher` }),
        view(u, `dm:${u.id}`, { id: `dm:${u.id}`, kind: 'dm', title: t.name, subtitle: 'Your teacher', peerId: t.id }),
      ];
    }
    const groups = GRADES.map((g) => view(u, `group:${g}`, { ...groupBase(g), subtitle: `${db().students.filter((s) => s.grade === g).length} learners` }));
    const dms = db().students.map((s) => view(u, `dm:${s.id}`, {
      id: `dm:${s.id}`, kind: 'dm', grade: s.grade, title: s.name, subtitle: `Class ${s.grade} · mastery ${Math.round(avgMastery(s) * 100)}%`, peerId: s.id, group: groupOf(s),
    }));
    // Conversations with something new first, then recent ones, then the rest.
    dms.sort((a, b) => b.unread - a.unread || (b.last?.ts ?? '').localeCompare(a.last?.ts ?? '') || a.title.localeCompare(b.title));
    return [...groups, ...dms];
  }));

  app.get('/api/messages/unread', wrap((req) => {
    const u = me(req);
    return { total: visible(u).reduce((a, t) => a + unread(u, t), 0) };
  }));

  app.get('/api/messages/threads/:id', wrap((req) => {
    const t = access(req);
    const after = Number(req.query.after) || 0;
    const list = inThread(t).filter((m) => m.seq > after).slice(-200);
    markRead(me(req), t);
    return list;
  }));

  app.post('/api/messages/threads/:id', wrap((req) => {
    const t = access(req);
    const text = String(req.body?.text ?? '').trim();
    if (!text) throw fail(400, 'Type a message first.');
    if (text.length > 1000) throw fail(400, 'Messages can be up to 1000 characters.');
    const u = me(req);
    const msg = { id: `m${db().mseq}`, seq: db().mseq++, ts: new Date().toISOString(), thread: t, from: { id: u.id, name: u.name, role: u.role }, text };
    db().messages.push(msg);
    if (db().messages.length > 2000) db().messages.splice(0, db().messages.length - 2000);
    markRead(u, t);
    return msg;
  }));
}
