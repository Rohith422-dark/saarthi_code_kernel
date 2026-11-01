import { chunks } from './seed.js';

const HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
export const MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
export const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

const post = (path, body, ms) =>
  fetch(`${HOST}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(ms),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return r.json();
  });

let cache = { at: 0, value: null };
/** Is Ollama reachable, and are the chat / embedding models pulled? Cached for a few seconds. */
export async function status() {
  if (cache.value && Date.now() - cache.at < 8000) return cache.value;
  let value;
  try {
    const r = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    const names = ((await r.json()).models || []).map((m) => m.name);
    const has = (m) => names.some((n) => n === m || n.startsWith(`${m}:`));
    value = has(MODEL)
      ? { ok: true, model: MODEL, embeddings: has(EMBED_MODEL), embedModel: EMBED_MODEL }
      : { ok: false, model: MODEL, reason: `Model “${MODEL}” is not installed. Run: ollama pull ${MODEL}` };
  } catch {
    value = { ok: false, model: MODEL, reason: 'Ollama is not running. Start it (ollama serve) so the tutor can solve any question.' };
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function generate(messages) {
  const r = await post('/api/chat', {
    model: MODEL, stream: false, messages,
    options: { temperature: 0.3, num_ctx: 4096 },
  }, 120000);
  return r.message?.content?.trim() || '';
}

// ---- embeddings (optional): chunk vectors are built once, lazily ----
let chunkVecs = null;
let building = null;
const norm = (v) => { const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1; return v.map((x) => x / n); };
const embed = async (input) => (await post('/api/embed', { model: EMBED_MODEL, input }, 60000)).embeddings.map(norm);

async function ensureIndex() {
  if (chunkVecs) return chunkVecs;
  building ||= embed(chunks.map((c) => `${c.title}. ${c.section}. ${c.text}`))
    .then((v) => (chunkVecs = v))
    .finally(() => { building = null; });
  return building;
}

/** Cosine similarity per chunk id, or null when embeddings are unavailable. */
export async function semanticScores(query) {
  const st = await status();
  if (!st.ok || !st.embeddings) return null;
  try {
    const [q] = await embed([query]);
    const vecs = await ensureIndex();
    return Object.fromEntries(chunks.map((c, i) => [c.id, Math.max(0, vecs[i].reduce((a, x, j) => a + x * q[j], 0))]));
  } catch (e) {
    console.warn('Embedding search unavailable:', e.message);
    return null;
  }
}
