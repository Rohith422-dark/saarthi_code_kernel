import fs from 'node:fs';
import path from 'node:path';
import { concepts, conceptsFor, GRADES } from './seed.js';
import { getDb, log, dataDir } from './store.js';

const uploads = path.join(dataDir, 'uploads');
const TYPES = ['Worksheet', 'Talking points', 'Parent summary', 'Notes'];
const LANGS = ['English', 'Hindi', 'Telugu'];
const STATUSES = ['Draft', 'Pending review', 'Approved', 'Retired'];
const EXT = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };
const MAX_BYTES = 3 * 1024 * 1024;
const name = Object.fromEntries(concepts.map((c) => [c.id, c.name]));

const view = (r) => ({
  id: r.id, code: r.code, title: r.title, type: r.type, grade: r.grade, conceptId: r.conceptId, conceptName: name[r.conceptId], language: r.language,
  status: r.status, author: r.author, version: r.version, updatedAt: r.updatedAt, description: r.description || '', link: r.link || null,
  file: r.file ? { name: r.file.name, size: r.file.size } : null,
});

export default function mount(app, { wrap, fail, student }) {
  const db = () => getDb();
  const find = (id) => {
    const r = db().resources.find((x) => x.id === id);
    if (!r) throw fail(404, 'Resource not found');
    return r;
  };

  // ---------- teacher ----------
  app.get('/api/resources', wrap((req) => {
    const g = Number(req.query.grade);
    return db().resources.filter((r) => !GRADES.includes(g) || r.grade === g).map(view);
  }));

  app.post('/api/resources', wrap((req) => {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    if (title.length < 3 || title.length > 100) throw fail(400, 'Give the resource a title of 3 to 100 characters.');
    if (!TYPES.includes(b.type)) throw fail(400, 'Choose the kind of resource.');
    const grade = Number(b.grade);
    if (!GRADES.includes(grade)) throw fail(400, 'Choose a class.');
    if (!conceptsFor(grade).some((c) => c.id === b.conceptId)) throw fail(400, 'Choose a topic from that class.');
    if (!LANGS.includes(b.language)) throw fail(400, 'Choose a language.');
    const status = b.status || 'Draft';
    if (!STATUSES.includes(status) || status === 'Retired') throw fail(400, 'Choose Draft, Pending review or Approved.');
    const description = String(b.description || '').trim().slice(0, 600);
    const link = String(b.link || '').trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) throw fail(400, 'The link must start with http:// or https://');

    const id = `r${db().rseq++}`;
    let file = null;
    if (b.file?.data) {
      const ext = String(b.file.name || '').split('.').pop().toLowerCase();
      if (!EXT[ext]) throw fail(400, 'Upload a PDF, Word document, image or text file.');
      const buf = Buffer.from(String(b.file.data), 'base64');
      if (!buf.length) throw fail(400, 'That file is empty.');
      if (buf.length > MAX_BYTES) throw fail(400, 'Files can be up to 3 MB.');
      fs.mkdirSync(uploads, { recursive: true });
      const safe = String(b.file.name).replace(/[^\w.-]+/g, '_').slice(-80);
      file = { name: String(b.file.name).slice(-120), size: buf.length, path: `${id}-${safe}`, mime: EXT[ext] };
      fs.writeFileSync(path.join(uploads, file.path), buf);
    }
    if (!file && !link && !description) throw fail(400, 'Add a file, a link or a short description so learners have something to use.');

    const n = Math.max(0, ...db().resources.map((r) => Number(String(r.code).split('-').pop()) || 0)) + 1;
    const res = {
      id, code: `SAR-RES-${String(n).padStart(3, '0')}`, title, type: b.type, grade, conceptId: b.conceptId, language: b.language, status,
      author: 'Teacher', version: 'v1.0', updatedAt: new Date().toISOString(), description, link: link || null, file,
    };
    db().resources.push(res);
    log(req.user.name, 'Added resource', title, `${res.code} · Class ${grade} · ${res.language}`);
    return view(res);
  }));

  app.patch('/api/resources/:id', wrap((req) => {
    const r = find(req.params.id);
    const status = req.body?.status;
    if (!STATUSES.includes(status)) throw fail(400, 'Invalid status');
    log(req.user.name, `Marked ${status.toLowerCase()}`, r.title, `${r.code} · ${r.language}`);
    r.status = status;
    r.updatedAt = new Date().toISOString();
    return view(r);
  }));

  app.delete('/api/resources/:id', wrap((req) => {
    const r = find(req.params.id);
    if (db().homework.some((h) => h.resourceId === r.id)) throw fail(400, 'This worksheet is attached to homework. Retire it instead.');
    if (r.file) fs.rmSync(path.join(uploads, r.file.path), { force: true });
    db().resources = db().resources.filter((x) => x.id !== r.id);
    log(req.user.name, 'Deleted resource', r.title, r.code);
    return { ok: true };
  }));

  // ---------- teachers and learners ----------
  const canOpen = (req, r) => {
    if (req.user.role === 'teacher') return true;
    const s = student(req);
    return r.status === 'Approved' && r.grade === s.grade;
  };

  app.get('/api/files/:id', (req, res) => {
    try {
      const r = find(req.params.id);
      if (!canOpen(req, r) || !r.file) throw fail(404, 'File not found');
      res.download(path.join(uploads, r.file.path), r.file.name);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  app.get('/api/study-material', wrap((req) => {
    const s = student(req);
    return db().resources.filter((r) => r.grade === s.grade && r.status === 'Approved').map(view)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }));
}
