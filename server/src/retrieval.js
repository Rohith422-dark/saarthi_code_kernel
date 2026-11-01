import { chunks, concepts } from './seed.js';

const STOP = new Set('a an the is are was were be been do does did how what why when which who whom whose can could should would will shall i me my we you your it its of to in on at for with and or but if then so as by from about into than that this these those hi hello hey thanks please tell explain show give help need want know learn understand mean means'.split(' '));

// Truncating stems let "factorising", "factorise" and "factorisation" meet.
const stem = (w) => {
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w.length > 6 ? w.slice(0, 6) : w;
};
export const tokenize = (t) =>
  (t.toLowerCase().match(/[a-z]+|√|π/g) || []).filter((w) => !STOP.has(w)).map(stem);

const docs = chunks.map((c) => {
  const name = concepts.find((x) => x.id === c.conceptId).name;
  const toks = [...tokenize(`${name} ${c.keywords}`), ...tokenize(`${name} ${c.keywords}`), ...tokenize(c.text)];
  const tf = {};
  for (const t of toks) tf[t] = (tf[t] || 0) + 1;
  return { chunk: c, tf, len: toks.length };
});
const avgLen = docs.reduce((a, d) => a + d.len, 0) / docs.length;
const df = {};
for (const d of docs) for (const t of Object.keys(d.tf)) df[t] = (df[t] || 0) + 1;
const idf = (t) => Math.log(1 + (docs.length - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5));

// Cosine below ~0.45 is noise for sentence embeddings, so it is rescaled before blending.
// BM25, squashed into 0..1 so it reads as a "retrieval score".
export function retrieve(query, k = 4, semantic = null) {
  const lex = lexical(query);
  if (!semantic) return { tokens: lex.tokens, hits: lex.hits.slice(0, k) };
  // Hybrid: blend BM25 with embedding cosine so paraphrased questions still find the right note.
  const bm = Object.fromEntries(lex.hits.map((h) => [h.chunk.id, h.score]));
  const hits = chunks
    .map((chunk) => {
      const score = Math.round((0.45 * (bm[chunk.id] || 0) + 0.55 * Math.min(1, Math.max(0, ((semantic[chunk.id] || 0) - 0.45) / 0.4))) * 100) / 100;
      return { chunk, raw: score, score };
    })
    .sort((a, b) => b.raw - a.raw)
    .slice(0, k);
  return { tokens: Math.max(lex.tokens, 1), hits };
}

function lexical(query) {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return { tokens: 0, hits: [] };
  const hits = docs
    .map(({ chunk, tf, len }) => {
      let s = 0;
      for (const t of q) {
        const f = tf[t] || 0;
        if (f) s += idf(t) * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (len / avgLen))));
      }
      return { chunk, raw: s, score: Math.round((s / (s + 6)) * 100) / 100 };
    })
    .filter((h) => h.raw > 0)
    .sort((a, b) => b.raw - a.raw);
  return { tokens: q.length, hits };
}

export const sentences = (t) => t.match(/[^.!?]+(?:[.!?](?=\s|$)|$)/g)?.map((s) => s.trim()) ?? [t];
