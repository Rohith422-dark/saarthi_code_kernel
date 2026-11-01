import { getDb, save } from './store.js';
import { verifyPassword, newToken } from './crypto.js';
import { DEMO } from './seed.js';

const TTL = 7 * 86400000;
const OPEN = new Set(['/health', '/auth/login', '/auth/demo']);
const fails = new Map(); // "ip:username" -> { n, until }

/** Resolves the bearer token to req.user; everything except login and health needs it. */
export function gate(req, res, next) {
  if (OPEN.has(req.path)) return next();
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const sess = token && getDb().sessions[token];
  if (!sess || sess.exp < Date.now()) return res.status(401).json({ error: 'Please sign in to continue.' });
  const pool = sess.role === 'student' ? getDb().students : getDb().teachers;
  const u = pool.find((x) => x.id === sess.userId);
  if (!u) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = { id: u.id, name: u.name, role: sess.role, grade: u.grade, token };
  next();
}

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : res.status(403).json({ error: `This area is for ${role}s only.` });

export default function mountAuth(app, { wrap, fail }) {
  app.get('/api/auth/demo', wrap(() => {
    if (process.env.NODE_ENV === 'production') return { demo: false };
    const db = getDb();
    return {
      demo: true,
      students: db.students.map((s) => ({ name: s.name, username: s.username })),
      teacher: { name: DEMO.teacher.name, username: DEMO.teacher.username },
      studentPassword: DEMO.studentPassword,
      teacherPassword: DEMO.teacherPassword,
    };
  }));

  app.post('/api/auth/login', wrap((req) => {
    const { role, username, password } = req.body || {};
    if (!['student', 'teacher'].includes(role)) throw fail(400, 'Choose the student or teacher sign-in.');
    const name = String(username || '').trim().toLowerCase();
    const key = `${req.ip}:${name}`;
    const f = fails.get(key);
    if (f && f.n >= 5 && f.until > Date.now()) throw fail(429, 'Too many attempts. Wait a minute and try again.');

    const db = getDb();
    const user = (role === 'student' ? db.students : db.teachers).find((x) => x.username === name);
    if (!user || !verifyPassword(password, user.passHash)) {
      fails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 60000 });
      throw fail(401, 'Wrong username or password.');
    }
    fails.delete(key);
    for (const [t, s] of Object.entries(db.sessions)) if (s.exp < Date.now()) delete db.sessions[t];
    const token = newToken();
    db.sessions[token] = { userId: user.id, role, exp: Date.now() + TTL };
    return { token, user: { id: user.id, name: user.name, role, grade: user.grade } };
  }));

  app.get('/api/auth/me', wrap((req) => ({ id: req.user.id, name: req.user.name, role: req.user.role, grade: req.user.grade })));

  app.post('/api/auth/logout', wrap((req) => {
    delete getDb().sessions[req.user.token];
    save();
    return { ok: true };
  }));
}
