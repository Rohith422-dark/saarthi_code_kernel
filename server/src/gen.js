// Question generators: every problem is computed, so its answer is correct by construction.
// generate(conceptId, level, rand) -> { prompt, options, answer, explanation }

const strHash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function rng(seed) {
  let a = typeof seed === 'number' ? seed : strHash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const N = (x) => (x < 0 ? `−${-x}` : `${x}`);
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
const sup = (n) => `${n}`.split('').map((c) => SUP[c]).join('');
const rupee = (n) => `₹${n}`;
const cm2 = (n) => `${n} cm²`;
const deg = (n) => `${n}°`;
const gt = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);

function frac(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  n /= g; d /= g;
  return d === 1 ? N(n) : `${N(n)}/${d}`;
}
const F = (n, d) => `${N(n)}/${d}`;

/** Builds a 4-option question from a correct answer, plausible wrong answers, and a filler source. */
function mk(r, prompt, correct, wrong, explanation, more) {
  const set = [];
  for (const w of wrong) if (w !== correct && !set.includes(w)) set.push(w);
  for (let i = 1; set.length < 3 && i < 40; i++) {
    const w = more(i);
    if (w !== correct && !set.includes(w)) set.push(w);
  }
  const options = shuffle(r, [correct, ...set.slice(0, 3)]);
  return { prompt, options, answer: options.indexOf(correct), explanation };
}

/** Whole-number answers; wrong answers are common slips around the right one. */
function mkInt(r, prompt, correct, explanation, { fmt = N, extra = [], neg = false } = {}) {
  const base = [...extra, correct + 1, correct - 1, correct + 2, correct - 2, correct + 10, correct * 2, -correct, correct + 5];
  const ok = (v) => Number.isInteger(v) && (neg || correct < 0 || v >= 0);
  return mk(r, prompt, fmt(correct), shuffle(r, base.filter(ok)).map(fmt), explanation,
    (i) => fmt(correct + (i % 2 ? i + 2 : -(i + 2))));
}

function poly(a, b, c) {
  const t = [];
  t.push(a === 1 ? 'x²' : `${a}x²`);
  if (b) t.push(`${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`);
  if (c) t.push(`${c < 0 ? '−' : '+'} ${Math.abs(c)}`);
  return t.join(' ');
}
const term = (a, v = 'x') => (a === 1 ? v : `${a}${v}`);

const G = {
  // ---- Integers
  c1: [
    (r) => { const a = -int(r, 2, 9), b = int(r, 10, 20); return mkInt(r, `What is ${N(a)} + ${b}?`, a + b, `Start at ${N(a)} and move ${b} steps right: you land on ${a + b}.`); },
    (r) => { const a = pick(r, [-1, 1]) * int(r, 2, 9), b = pick(r, [-1, 1]) * int(r, 2, 9); return mkInt(r, `What is (${N(a)}) × (${N(b)})?`, a * b, `Same signs give a positive product, different signs a negative one: ${N(a)} × ${N(b)} = ${N(a * b)}.`, { neg: true }); },
    (r) => { const b = int(r, 2, 9), q = int(r, 2, 9), c = -int(r, 2, 9); return mkInt(r, `What is (${N(-b * q)}) ÷ (${N(-b)}) + (${N(c)})?`, q + c, `(${N(-b * q)}) ÷ (${N(-b)}) = ${q}, then ${q} + (${N(c)}) = ${N(q + c)}.`, { neg: true }); },
  ],
  // ---- Fractions & decimals
  c2: [
    (r) => { const d = int(r, 5, 12), a = int(r, 1, d - 3), b = int(r, 1, d - 2 - a + 1); return mk(r, `What is ${a}/${d} + ${b}/${d}?`, frac(a + b, d), [`${a + b}/${2 * d}`, frac(a * b, d), frac(a + b + 1, d), frac(a + b, d + 1)], `Same denominator, so add the numerators: ${a + b}/${d}${gcd(a + b, d) > 1 ? ' = ' + frac(a + b, d) : ''}.`, (i) => frac(a + b + i + 1, d + i)); },
    (r) => { const a = int(r, 1, 5), b = int(r, a + 1, 9), c = int(r, 1, 5), d = int(r, c + 1, 9); return mk(r, `What is ${a}/${b} × ${c}/${d}?`, frac(a * c, b * d), [frac(a * d, b * c), `${a + c}/${b + d}`, frac(a * c, b + d), frac(a + c, b * d)], `Multiply numerators and denominators: ${a * c}/${b * d}${gcd(a * c, b * d) > 1 ? ' = ' + frac(a * c, b * d) : ''}.`, (i) => frac(a * c + i, b * d)); },
    (r) => { const a = int(r, 1, 5), b = int(r, a + 1, 9), c = int(r, 1, 5), d = int(r, c + 1, 9); return mk(r, `What is ${a}/${b} ÷ ${c}/${d}?`, frac(a * d, b * c), [frac(a * c, b * d), frac(b * c, a * d), frac(a * d, b + c), frac(a + d, b * c)], `Multiply by the reciprocal: ${a}/${b} × ${d}/${c} = ${frac(a * d, b * c)}.`, (i) => frac(a * d + i, b * c)); },
  ],
  // ---- Rational numbers
  c3: [
    (r) => { let a, b; do { a = int(r, 1, 9); b = int(r, 2, 9); } while (gcd(a, b) !== 1); return mk(r, `What is the additive inverse of ${a}/${b}?`, `−${a}/${b}`, [`${b}/${a}`, `−${b}/${a}`, `${a}/${b}`, `−${a}/${b + 1}`], `The additive inverse changes the sign, so that the sum is 0: −${a}/${b}.`, (i) => `−${a + i}/${b}`); },
    (r) => { const a = pick(r, [-1, 1]) * int(r, 1, 5), b = int(r, 2, 6), c = int(r, 1, 5), d = int(r, 2, 6); const n = a * d + c * b; return mk(r, `What is ${F(a, b)} + ${F(c, d)}?`, frac(n, b * d), [frac(a + c, b + d), frac(n, b + d), frac(a * d - c * b, b * d), frac(n + 1, b * d)], `Common denominator ${b * d}: (${N(a * d)} + ${c * b})/${b * d} = ${frac(n, b * d)}.`, (i) => frac(n + i + 1, b * d)); },
    (r) => { let a, b; do { a = int(r, 1, 5); b = int(r, 2, 6); } while (gcd(a, b) !== 1); const c = int(r, 1, 5), d = int(r, 2, 6); const n = c * b + a * d; return mk(r, `Find x if x + (−${a}/${b}) = ${c}/${d}.`, frac(n, b * d), [frac(c * b - a * d, b * d), frac(a * d - c * b, b * d), frac(c + a, b + d), frac(n + 1, b * d)], `x = ${c}/${d} + ${a}/${b} = ${frac(n, b * d)}.`, (i) => frac(n + i + 1, b * d)); },
  ],
  // ---- Exponents
  c4: [
    (r) => { const a = pick(r, [2, 3, 4, 5]), n = int(r, 2, a > 3 ? 3 : 5); return mkInt(r, `What is ${a}${sup(n)}?`, a ** n, `${Array(n).fill(a).join(' × ')} = ${a ** n}.`, { extra: [a * n, a + n, a ** (n - 1), a ** (n + 1)] }); },
    (r) => { const a = pick(r, [2, 3, 5, 7]), m = int(r, 2, 6), n = int(r, 2, 6); return mk(r, `Simplify ${a}${sup(m)} × ${a}${sup(n)}.`, `${a}${sup(m + n)}`, [`${a}${sup(m * n)}`, `${a * a}${sup(m + n)}`, `${a}${sup(m + n + 1)}`, `${a}${sup(Math.abs(m - n))}`], `Same base, so add the exponents: ${m} + ${n} = ${m + n}.`, (i) => `${a}${sup(m + n + i + 1)}`); },
    (r) => { const a = pick(r, [2, 3, 5, 7]), m = int(r, 1, 4), n = m + int(r, 1, 4); return mk(r, `Write ${a}${sup(m)} ÷ ${a}${sup(n)} as a single power of ${a}.`, `${a}${sup(m - n)}`, [`${a}${sup(n - m)}`, `${a}${sup(m + n)}`, `${a}${sup(m * n)}`, `${a}${sup(m - n - 1)}`], `Same base, so subtract the exponents: ${m} − ${n} = ${N(m - n)}, which gives a negative power.`, (i) => `${a}${sup(m - n - i - 1)}`); },
  ],
  // ---- Squares and roots
  c5: [
    (r) => { const n = int(r, 11, 25); return mkInt(r, `What is the square of ${n}?`, n * n, `${n} × ${n} = ${n * n}.`, { extra: [2 * n, n * n + n, (n + 1) ** 2, n * n - 10] }); },
    (r) => { const n = int(r, 11, 25); return mkInt(r, `What is √${n * n}?`, n, `${n} × ${n} = ${n * n}, so √${n * n} = ${n}.`, { extra: [n * n / 2 | 0] }); },
    (r) => { const p = pick(r, [2, 3, 5, 6, 7, 10]), s = int(r, 2, 5), num = p * s * s; return mkInt(r, `What is the smallest number to multiply ${num} by to get a perfect square?`, p, `${num} = ${p} × ${s}². The factor ${p} appears once, so multiply by ${p}: ${num * p} = ${p * s}².`, { extra: [2, 3, 5, 6, 7, 10].filter((x) => x !== p) }); },
  ],
  // ---- Algebraic expressions
  c6: [
    (r) => { const v = pick(r, ['x', 'y', 'n']), a = int(r, 2, 9), b = int(r, 1, 9); return mkInt(r, `In ${a}${v} + ${b}, what is the coefficient of ${v}?`, a, 'The coefficient is the number multiplying the variable.', { extra: [b, a + b, a * b] }); },
    (r) => { const a = int(r, 2, 9), b = int(r, 2, 9), c = int(r, 1, a + b - 1), k = a + b - c; return mk(r, `Simplify ${a}x + ${b}x − ${c}x.`, `${k}x`, [`${a + b + c}x`, `${a - b + c}x`, `${k}`, `${a * b - c}x`], `Combine like terms: ${a} + ${b} − ${c} = ${k}, so ${k}x.`, (i) => `${k + i + 1}x`); },
    (r) => { const a = pick(r, [-6, -5, -4, -3, -2, 1, 2, 3, 4, 5, 6, 7]), b = pick(r, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]); return mk(r, `Expand (x ${gt(a)})(x ${gt(b)}).`, poly(1, a + b, a * b), [poly(1, a + b, a + b), poly(1, a * b, a + b), poly(1, a + b, -(a * b)), poly(1, a + b + 1, a * b)], `Multiply each pair of terms, then combine the like terms: ${poly(1, a + b, a * b)}.`, (i) => poly(1, a + b + i + 1, a * b)); },
  ],
  // ---- Linear equations
  c7: [
    (r) => { const x = int(r, 2, 15), a = int(r, 2, 12); return mkInt(r, `Solve x + ${a} = ${x + a}.`, x, `Subtract ${a} from both sides: x = ${x}.`, { extra: [x + a, x + 2 * a] }); },
    (r) => { const x = int(r, 2, 12), a = int(r, 2, 9), b = int(r, 1, 12), c = a * x - b; return mkInt(r, `Solve ${a}x − ${b} = ${c}.`, x, `Add ${b} to get ${a}x = ${c + b}, then divide by ${a}: x = ${x}.`, { extra: [c + b, c - b] }); },
    (r) => { const x = int(r, 2, 10), a = int(r, 4, 9), c = int(r, 1, a - 1), b = int(r, 1, 12), d = b + (a - c) * x; return mkInt(r, `Solve ${a}x + ${b} = ${c}x + ${d}.`, x, `Collect x terms on the left: ${a - c}x = ${d - b}, so x = ${x}.`, { extra: [d - b, a - c] }); },
  ],
  // ---- Factorisation
  c8: [
    (r) => { let a, b; do { a = int(r, 1, 4); b = int(r, 1, 9); } while (gcd(a, b) !== 1); const k = int(r, 2, 7); return mk(r, `Factorise ${term(k * a)} + ${k * b}.`, `${k}(${term(a)} + ${b})`, [`${k}(${term(a)} + ${k * b})`, `${k * b}(${term(a)} + 1)`, `${a}(${term(k)} + ${b})`, `${k}(${term(a)} − ${b})`], `The highest common factor of ${k * a} and ${k * b} is ${k}. Taking it out gives ${k}(${term(a)} + ${b}).`, (i) => `${k + i}(${term(a)} + ${b})`); },
    (r) => {
      if (r() < 0.5) {
        const n = int(r, 2, 12);
        return mk(r, `Factorise x² − ${n * n}.`, `(x − ${n})(x + ${n})`, [`(x − ${n})²`, `(x − ${n * n})(x + 1)`, `x(x − ${n * n})`, `(x + ${n})²`], `Use a² − b² = (a − b)(a + b) with a = x and b = ${n}.`, (i) => `(x − ${n + i})(x + ${n + i})`);
      }
      const a = int(r, 2, 8), b = int(r, a, 9);
      return mk(r, `Factorise x² + ${a + b}x + ${a * b}.`, `(x + ${a})(x + ${b})`, [`(x − ${a})(x − ${b})`, `(x + 1)(x + ${a * b})`, `(x + ${a + b})(x + 1)`, `(x + ${a})(x + ${a + b})`], `Two numbers with product ${a * b} and sum ${a + b} are ${a} and ${b}.`, (i) => `(x + ${a + i})(x + ${b + i})`);
    },
    (r) => { const p = int(r, 2, 5), q = int(r, 2, 7); return mk(r, `Factorise ${p * p}x² − ${2 * p * q}x + ${q * q}.`, `(${p}x − ${q})²`, [`(${p}x + ${q})²`, `(${p * p}x − ${q})(x − ${q})`, `(${p}x − ${q * q})(${p}x − 1)`, `(${p * p}x − ${q})²`], `It is a perfect square: (${p}x)² − 2(${p}x)(${q}) + ${q}² = (${p}x − ${q})².`, (i) => `(${p}x − ${q + i})²`); },
  ],
  // ---- Proportion
  c9: [
    (r) => { const n = int(r, 3, 9), p = int(r, 4, 15), m = int(r, n + 1, 16); return mkInt(r, `If ${n} notebooks cost ${rupee(n * p)}, what do ${m} notebooks cost?`, m * p, `One notebook costs ${rupee(p)}, so ${m} cost ${rupee(m * p)}.`, { fmt: rupee, extra: [n * p + m, m + p] }); },
    (r) => { let w1, d1, t, opts; do { w1 = int(r, 3, 9); d1 = int(r, 6, 18); t = w1 * d1; opts = []; for (let w = 2; w <= 18; w++) if (t % w === 0 && w !== w1) opts.push(w); } while (!opts.length); const w2 = pick(r, opts); return mkInt(r, `${w1} workers finish a job in ${d1} days. How many days will ${w2} workers take?`, t / w2, `Workers × days stays constant: ${w1} × ${d1} = ${t}, and ${t} ÷ ${w2} = ${t / w2}.`, { extra: [d1, w2 * d1 / w1 | 0] }); },
    (r) => { const l = int(r, 4, 15), per = int(r, 5, 15); let m; do { m = int(r, 2, 25); } while (m === l); return mkInt(r, `A car uses ${l} L of fuel for ${l * per} km. How many litres does it need for ${m * per} km?`, m, `Fuel is directly proportional to distance: ${l} ÷ ${l * per} × ${m * per} = ${m} litres.`, { extra: [l, l + m] }); },
  ],
  // ---- Comparing quantities
  c10: [
    (r) => { const p = pick(r, [5, 10, 20, 25, 30, 40, 50]), n = 20 * int(r, 2, 15); return mkInt(r, `What is ${p}% of ${n}?`, p * n / 100, `${p}/100 × ${n} = ${p * n / 100}.`, { extra: [p * n / 10, n - p * n / 100] }); },
    (r) => { const m = 100 * int(r, 3, 20), d = pick(r, [10, 20, 25, 30, 40]), disc = m * d / 100; return mkInt(r, `A bag marked ${rupee(m)} is sold at a ${d}% discount. What is the selling price?`, m - disc, `Discount = ${d}/100 × ${m} = ${rupee(disc)}, so the price is ${m} − ${disc} = ${rupee(m - disc)}.`, { fmt: rupee, extra: [disc, m + disc] }); },
    (r) => { const P = 500 * int(r, 2, 10), R = int(r, 2, 10), T = int(r, 2, 5), si = P * R * T / 100; return mkInt(r, `What is the simple interest on ${rupee(P)} at ${R}% per year for ${T} years?`, si, `I = P × R × T ÷ 100 = ${P} × ${R} × ${T} ÷ 100 = ${rupee(si)}.`, { fmt: rupee, extra: [P + si, si * 10, si / T] }); },
  ],
  // ---- Quadrilaterals
  c11: [
    (r) => { let a, b, c, d; do { a = 5 * int(r, 12, 24); b = 5 * int(r, 12, 24); c = 5 * int(r, 12, 24); d = 360 - a - b - c; } while (d < 40 || d > 160); return mkInt(r, `Three angles of a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth angle?`, d, `The angles add up to 360°: 360° − (${a}° + ${b}° + ${c}°) = ${d}°.`, { fmt: deg, extra: [d + 10, d - 10, 180 - d] }); },
    (r) => { const a = pick(r, [50, 55, 60, 65, 70, 75, 110, 115, 120, 125, 130]); return mkInt(r, `In a parallelogram one angle is ${a}°. What is the angle next to it?`, 180 - a, `Adjacent angles of a parallelogram add up to 180°: 180° − ${a}° = ${180 - a}°.`, { fmt: deg, extra: [a, 360 - a, 90] }); },
    (r) => { const [rt, k] = pick(r, [[[1, 2, 3, 4], 36], [[1, 2, 4, 5], 30], [[2, 3, 4, 6], 24], [[1, 3, 4, 4], 30], [[2, 3, 5, 5], 24]]); const big = Math.max(...rt) * k; return mkInt(r, `The angles of a quadrilateral are in the ratio ${rt.join(' : ')}. What is the largest angle?`, big, `The ratio parts add up to ${rt.reduce((a, b) => a + b)}, so one part is ${k}°. The largest angle is ${Math.max(...rt)} × ${k}° = ${big}°.`, { fmt: deg, extra: rt.map((x) => x * k).filter((x) => x !== big) }); },
  ],
  // ---- Mensuration
  c12: [
    (r) => { const l = int(r, 5, 15), w = int(r, 3, l - 1); return mkInt(r, `What is the area of a rectangle ${l} cm by ${w} cm?`, l * w, `Length × breadth = ${l} × ${w} = ${l * w} cm².`, { fmt: cm2, extra: [2 * (l + w), l + w] }); },
    (r) => { const b = 2 * int(r, 3, 9), h = int(r, 3, 12); return mkInt(r, `What is the area of a triangle with base ${b} cm and height ${h} cm?`, b * h / 2, `½ × base × height = ½ × ${b} × ${h} = ${b * h / 2} cm².`, { fmt: cm2, extra: [b * h, b + h] }); },
    (r) => {
      if (r() < 0.5) { const a = int(r, 4, 12), b = int(r, a + 1, 16), h = 2 * int(r, 2, 6); return mkInt(r, `What is the area of a trapezium with parallel sides ${a} cm and ${b} cm and height ${h} cm?`, (a + b) * h / 2, `½ × (${a} + ${b}) × ${h} = ${(a + b) * h / 2} cm².`, { fmt: cm2, extra: [(a + b) * h, a * b * h / 2] }); }
      const s = int(r, 5, 15); return mkInt(r, `A square has an area of ${s * s} cm². What is its perimeter?`, 4 * s, `Side = √${s * s} = ${s} cm, so the perimeter is 4 × ${s} = ${4 * s} cm.`, { fmt: (n) => `${n} cm`, extra: [2 * s, s * s] });
    },
  ],
};

export function generate(conceptId, level, rand = Math.random) {
  const list = G[conceptId];
  if (!list) throw new Error(`No generator for ${conceptId}`);
  return list[Math.min(3, Math.max(1, level)) - 1](rand);
}
