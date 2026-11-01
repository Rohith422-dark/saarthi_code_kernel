import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTip, XAxis, YAxis } from 'recharts';
import { BedDouble, CalendarClock, FileText, HeartPulse, MessageCircle, PenLine, RotateCcw, Timer } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { Badge, Bar, Button, Card, CardHeader, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n';
import { api, errorText } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { cn } from '../lib/utils';

const KIND = { unit: 'Unit test', halfyearly: 'Half-yearly', annual: 'Annual exam', preboard: 'Pre-board', board: 'Board exam' };
const BAND = { focus: ['critical', 'Needs focus'], getting: ['warning', 'Getting there'], track: ['info', 'On track'], ready: ['success', 'Exam ready'] };
const MOODS = ['Calm', 'Fine', 'A bit worried', 'Stressed', 'Very stressed'];
const TIPS = {
  1: 'Great. Keep a steady routine and protect your sleep.',
  2: 'Good. A short daily plan beats a long last-minute rush.',
  3: 'Worry before exams is normal. Pick one small topic today and finish it.',
  4: 'That sounds heavy. Break the work into 30 minute blocks with breaks, and tell your teacher how you feel.',
  5: 'Please talk to your teacher or a trusted adult today. You do not have to carry this alone.',
};

const dateFmt = (iso, lang) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'te-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export default function ExamCentre() {
  const nav = useNavigate();
  const { t, lang } = useT();
  const { profile } = useApp();
  const { data, error, loading, reload } = useFetch('/exams/centre');
  const [busy, setBusy] = useState('');
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;

  const startMock = async (size) => {
    setBusy(size);
    try { const { data: r } = await api.post('/mock/start', { size }); nav(`/exams/mock/${r.id}`); }
    catch (e) { toast.error(errorText(e)); setBusy(''); }
  };
  const checkin = async (level) => {
    try { await api.post('/wellbeing', { level }); toast.success(t('Thanks for checking in')); reload(); }
    catch (e) { toast.error(errorText(e)); }
  };

  if (loading || !data) return <Page><Skeleton className="mb-6 h-9 w-64" /><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div><Skeleton className="mt-4 h-72" /></Page>;
  const { exams, readiness: r, plan, mocks, checkin: ci, sizes } = data;
  const [bandTone, bandLabel] = BAND[r.band];
  const chart = [...mocks].reverse().map((m) => ({ at: dateFmt(m.at, lang), pct: Math.round(m.pct * 100) }));

  const go = (task) => {
    if (task.type === 'mock') startMock(task.size);
    else nav(`/practice/${task.conceptId}/${['easy', 'medium', 'hard'][(task.level || 1) - 1]}`);
  };

  return (
    <Page>
      <PageHeader title={t('Exam centre')} description={t('Your exam dates, mock papers and a study plan, all in one place.')} />

      <div className="grid gap-3 md:grid-cols-3">
        {exams.length === 0 && <Card className="p-5 md:col-span-3"><p className="meta">{t('No exams are scheduled yet. Your teacher will add the dates.')}</p></Card>}
        {exams.slice(0, 3).map((e, i) => (
          <Card key={e.id} className={cn('p-5', i === 0 && 'border-primary/40 bg-primary-tint')}>
            <div className="flex items-center justify-between"><Badge tone={i === 0 ? 'teal' : 'neutral'}>{t(KIND[e.kind])}</Badge>{i === 0 && <span className="meta">{t('Next up')}</span>}</div>
            <p className="num mt-3 text-[40px] font-semibold leading-none tracking-[-0.03em]">{e.daysLeft}<span className="ml-1.5 text-[15px] font-medium text-slate">{t('days left')}</span></p>
            <p className="mt-2 text-[14.5px] font-semibold leading-snug">{e.title}</p>
            <p className="meta mt-0.5 flex items-center gap-1.5"><CalendarClock className="size-3.5" />{dateFmt(e.date, lang)}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t('Exam readiness')} meta={t('An indicator of how prepared you are, not a prediction of your marks.')} />
          <div className="p-5 pt-3">
            <div className="flex items-end gap-3"><span className="num text-[40px] font-semibold leading-none tracking-[-0.03em]">{r.score}%</span><Badge tone={bandTone} dot className="mb-1.5">{t(bandLabel)}</Badge></div>
            <ul className="mt-4 space-y-3">
              {[[t('Topic mastery'), r.mastery], [t('Mock papers'), r.mocks], [t('Homework handed in'), r.homework]].map(([k, v]) => (
                <li key={k}>
                  <div className="mb-1 flex justify-between text-[13px]"><span className="text-slate">{k}</span><span className="num font-medium">{v === null ? t('Not taken yet') : `${v}%`}</span></div>
                  <Bar value={(v ?? 0) / 100} label={k} />
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('Mock papers')} meta={t('Timed papers made from your class topics. Take as many as you like.')} />
          <div className="grid gap-3 p-5 pt-3 sm:grid-cols-2">
            {Object.entries(sizes).map(([k, v]) => (
              <div key={k} className="rounded-card border border-line p-4">
                <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-[14.5px] font-semibold">{t(v.label)}</p></div>
                <p className="meta mt-1">{t('{q} questions · {m} marks · {min} minutes', { q: v.questions, m: v.marks, min: v.minutes })}</p>
                <Button className="mt-3 w-full" variant={k === 'full' ? 'primary' : 'secondary'} disabled={!!busy} onClick={() => startMock(k)}><Timer />{t('Start')}</Button>
              </div>
            ))}
          </div>
          {chart.length > 1 && (
            <div className="h-[130px] px-3 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E6ECEF" />
                  <XAxis dataKey="at" tick={{ fontSize: 11.5, fill: '#536574' }} tickLine={false} axisLine={{ stroke: '#DCE5EA' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11.5, fill: '#536574' }} tickLine={false} axisLine={false} />
                  <RTip formatter={(v) => [`${v}%`, t('Mock score')]} />
                  <Line type="monotone" dataKey="pct" stroke="#0F766E" strokeWidth={2.2} dot={{ r: 3, fill: '#0F766E' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {mocks.length > 0 && (
            <ul className="divide-y divide-line border-t border-line px-5 pb-1">
              {mocks.slice(0, 4).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1"><b className="font-medium">{t(m.label ?? (m.size === 'full' ? 'Full mock paper' : 'Quick test'))}</b><span className="meta"> · {dateFmt(m.at, lang)}</span></span>
                  <span className="num font-semibold">{m.score}/{m.max}</span>
                  <Badge tone={m.pct >= 0.7 ? 'success' : m.pct >= 0.5 ? 'warning' : 'critical'}>{Math.round(m.pct * 100)}%</Badge>
                  {!String(m.id).startsWith('mk-seed') && <Button variant="ghost" size="sm" onClick={() => nav(`/exams/mock/${m.id}`)}>{t('Review')}</Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title={t('Your study plan for this week')}
          meta={plan.daysLeft === null ? t('A steady plan: {min} minutes a day.', { min: plan.minutesPerDay }) : t('About {min} minutes a day, with {d} days to your next exam.', { min: plan.minutesPerDay, d: plan.daysLeft })}
          action={plan.focus.length > 0 && <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">{plan.focus.map((f) => <Badge key={f.id} tone="warning">{f.name}</Badge>)}</div>}
        />
        <ul className="divide-y divide-line px-5 pb-2 pt-2">
          {plan.week.map((d, i) => (
            <li key={d.date} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="w-24 shrink-0"><p className="text-[14px] font-semibold">{i === 0 ? t('Today') : new Date(d.date).toLocaleDateString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'te-IN', { weekday: 'short' })}</p><p className="meta">{dateFmt(d.date, lang)}</p></div>
              <div className="flex flex-1 flex-wrap gap-2">
                {d.tasks.map((task, k) => task.type === 'rest' ? (
                  <span key={k} className="inline-flex items-center gap-2 rounded-field bg-neutral px-3 py-2 text-[13.5px] text-slate"><BedDouble className="size-4" />{t('Rest day: sleep well and do something you enjoy')}</span>
                ) : (
                  <button key={k} onClick={() => go(task)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-field border border-line px-3 py-2 text-left text-[13.5px] transition-colors hover:border-primary/50 hover:bg-primary-tint">
                    {task.type === 'mock' ? <Timer className="size-4 text-primary" /> : task.type === 'revise' ? <RotateCcw className="size-4 text-primary" /> : <PenLine className="size-4 text-primary" />}
                    <span><b className="font-medium">{task.type === 'mock' ? t(sizes[task.size].label) : `${t(task.type === 'revise' ? 'Revise' : 'Practise')}: ${task.name}`}</b><span className="meta"> · {t('{min} min', { min: task.minutes })}</span></span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <CardHeader title={t('How are you feeling about the exams?')} meta={t('Only you and your teacher can see this. It helps your teacher support you.')} />
        <div className="p-5 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MOODS.map((m, i) => (
              <button key={m} onClick={() => checkin(i + 1)} aria-pressed={ci.latest?.level === i + 1} className={cn('rounded-field border px-3 py-2.5 text-left transition-colors duration-150', ci.latest?.level === i + 1 ? 'border-primary bg-primary-subtle' : 'border-line hover:bg-neutral')}>
                <span className="num block text-[18px] font-semibold">{i + 1}</span><span className="text-[13px] text-slate">{t(m)}</span>
              </button>
            ))}
          </div>
          {ci.latest && (
            <div className={cn('mt-3 flex flex-wrap items-center gap-3 rounded-field px-3.5 py-3 text-[14px]', ci.latest.level >= 4 ? 'bg-warning-surface text-warning' : 'bg-neutral')}>
              <HeartPulse className="size-4 shrink-0" /><p className="min-w-0 flex-1">{t(TIPS[ci.latest.level])}</p>
              {ci.latest.level >= 4 && <Button size="sm" variant="secondary" onClick={() => nav(`/messages?thread=dm:${profile.id}`)}><MessageCircle />{t('Talk to your teacher')}</Button>}
            </div>
          )}
        </div>
      </Card>
    </Page>
  );
}
