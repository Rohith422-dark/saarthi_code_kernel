import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { cn } from '../lib/utils';

const LEVEL = ['bg-track', 'bg-primary/25', 'bg-primary/45', 'bg-primary/70', 'bg-primary'];
const CELL = 12;
const GAP = 3;
const LOCALE = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

const levelOf = (count, max) => (count <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((count / Math.max(1, max)) * 4))));

/** A year of daily activity as a calendar grid, one column per week (the same idea as a coding-profile activity map). */
export default function Heatmap({ data, unit }) {
  const { t, lang } = useT();
  const scroller = useRef(null);
  const [tip, setTip] = useState(null);
  const loc = LOCALE[lang];

  // Columns are weeks starting on Sunday; leading blanks line the first day up with its weekday.
  const { weeks, months } = useMemo(() => {
    const days = data.days;
    const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    const cells = [...Array(lead).fill(null), ...days];
    const cols = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    const labels = [];
    let last = -1;
    cols.forEach((col, ci) => {
      const first = col.find(Boolean);
      const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
      if (m !== last && (ci === 0 ? col.filter(Boolean).length >= 4 : true)) labels.push({ ci, m, date: first.date });
      last = m;
    });
    return { weeks: cols, months: labels };
  }, [data]);

  useEffect(() => { scroller.current?.scrollTo({ left: scroller.current.scrollWidth }); }, [data]);

  const fmt = (iso, o) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(loc, { timeZone: 'UTC', ...o });
  const dayNames = [1, 3, 5].map((d) => ({ d, label: new Date(Date.UTC(2023, 0, 1 + d)).toLocaleDateString(loc, { weekday: 'short', timeZone: 'UTC' }) }));

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-[15px]"><b className="num text-[22px] font-semibold tracking-[-0.02em]">{data.total}</b> <span className="text-slate">{t('{unit} in the past year', { unit })}</span></p>
        <p className="meta">{t('Active days')}: <b className="num font-semibold text-ink">{data.activeDays}</b></p>
        <p className="meta">{t('Longest streak')}: <b className="num font-semibold text-ink">{data.longest}</b></p>
        <p className="meta">{t('Current streak')}: <b className="num font-semibold text-ink">{data.current}</b></p>
      </div>

      <div className="relative mt-3">
        <div className="flex">
          <div className="mr-1.5 shrink-0 text-right text-[10.5px] text-slate" style={{ paddingTop: 18 }} aria-hidden>
            {[0, 1, 2, 3, 4, 5, 6].map((r) => {
              const n = dayNames.find((x) => x.d === r);
              return <div key={r} style={{ height: CELL, marginBottom: GAP, lineHeight: `${CELL}px` }}>{n?.label ?? ''}</div>;
            })}
          </div>
          <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1" onMouseLeave={() => setTip(null)}>
            <div style={{ width: weeks.length * (CELL + GAP) }}>
              <div className="relative h-[18px]" aria-hidden>
                {months.map((m) => (
                  <span key={m.ci} className="absolute text-[10.5px] text-slate" style={{ left: m.ci * (CELL + GAP) }}>{fmt(m.date, { month: 'short' })}</span>
                ))}
              </div>
              <div className="flex" style={{ gap: GAP }}>
                {weeks.map((col, ci) => (
                  <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
                    {col.map((d, ri) => d ? (
                      <div
                        key={d.date} role="img" aria-label={`${d.count} ${unit}, ${fmt(d.date, { day: 'numeric', month: 'short' })}`}
                        onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); const p = e.currentTarget.closest('.relative').getBoundingClientRect(); setTip({ d, x: r.left - p.left + r.width / 2, y: r.top - p.top }); }}
                        className={cn('rounded-[3px] transition-colors duration-100', LEVEL[levelOf(d.count, data.max)])}
                        style={{ width: CELL, height: CELL }}
                      />
                    ) : <div key={`b${ri}`} style={{ width: CELL, height: CELL }} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {tip && (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white shadow-pop" style={{ left: tip.x, top: tip.y - 6 }}>
            {tip.d.count > 0 ? `${tip.d.count} ${unit}` : t('No activity')} · {fmt(tip.d.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11.5px] text-slate" aria-hidden>
        <span>{t('Less')}</span>
        {LEVEL.map((c) => <span key={c} className={cn('rounded-[3px]', c)} style={{ width: CELL, height: CELL }} />)}
        <span>{t('More')}</span>
      </div>
    </div>
  );
}
