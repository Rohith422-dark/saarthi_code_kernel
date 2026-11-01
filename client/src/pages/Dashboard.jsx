import { useNavigate } from 'react-router-dom';
import { Award, ArrowRight, Flame, Gauge, Lock, Sparkles, Target, Trophy } from 'lucide-react';
import { Bar as RBar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RTip, XAxis, YAxis } from 'recharts';
import { Page } from '../components/layout/Shell';
import { Badge, Button, Card, CardHeader, ErrorBox, MasteryBar, PageHeader, Skeleton, StatusBadge } from '../components/ui';
import { useFetch } from '../lib/useFetch';
import { CalendarClock } from 'lucide-react';
import Heatmap from '../components/Heatmap';
import { useT } from '../i18n';
import { cn, dueIn, fmtDue, pct } from '../lib/utils';

const greetKey = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="label">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-primary-subtle text-primary"><Icon className="size-4" strokeWidth={1.9} /></span>
      </div>
      <p className="num mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      <p className="meta mt-1.5">{sub}</p>
    </Card>
  );
}

const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-field border border-line bg-surface px-3 py-2 shadow-pop">
      <p className="text-[13px] font-medium">{d.name || d.label}</p>
      <p className="meta">{d.mastery !== undefined ? `Mastery ${pct(d.mastery)}` : `${d.count} questions`}</p>
    </div>
  );
};
const axis = { fontSize: 11.5, fill: '#536574' };

export default function Dashboard() {
  const { t } = useT();
  const nav = useNavigate();
  const { data, error, loading, reload } = useFetch('/dashboard');
  const act = useFetch('/activity');
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  if (loading || !data) {
    return (
      <Page>
        <Skeleton className="mb-6 h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px]" />)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3"><Skeleton className="h-[420px] lg:col-span-2" /><Skeleton className="h-[420px]" /></div>
      </Page>
    );
  }
  const { student, stats, recommended: rec, strands, activity, concepts, badges, recent, homework, exam } = data;
  const chart = concepts;
  const target = rec.concept ? `/practice/${rec.concept}` : '/path';
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <Page>
      <PageHeader
        title={`${t(greetKey())}, ${student.name}`}
        description={t('Short sessions, one concept at a time. Saarthi picks what to learn next from the gaps it finds.')}
        meta={<><span>{t('Class {g}', { g: student.grade })} · {t('Maths')}</span><span>{t('Level')} {student.level}</span></>}
        action={<Button onClick={() => nav(target)}>{t('Continue learning')} <ArrowRight /></Button>}
      />

      {exam && (
        <Card className="mb-4 border-primary/30 bg-primary-tint">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white"><CalendarClock className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="label">{t('Next exam')}</p>
              <p className="text-[17px] font-semibold">{exam.next ? exam.next.title : t('No exams scheduled yet')}</p>
              {exam.next && <p className="meta">{exam.next.daysLeft} {t('days left')} · {t('Exam readiness')} {exam.readiness.score}%</p>}
            </div>
            <Button variant="secondary" onClick={() => nav('/exams')}>{t('Open Exam centre')}</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Metric icon={Gauge} label={t('Average mastery')} value={pct(stats.avg)} sub={t('across {n} concepts', { n: stats.total })} />
        <Metric icon={Target} label={t('Concepts mastered')} value={`${stats.mastered}/${stats.total}`} sub={stats.gaps ? t('{n} to close', { n: stats.gaps }) : t('No open gaps')} />
        <Metric icon={Flame} label={t('Day streak')} value={student.streak} sub={student.streak ? t('Keep it going today') : t('Start a streak today')} />
        <Metric icon={Trophy} label={t('Experience')} value={`${student.xp} XP`} sub={t('{n} XP to the next level', { n: student.nextLevelXp - student.xp })} />
      </div>

      <Card className="mt-4">
        <CardHeader title={t('Learning activity')} meta={t('Every question you answer, every day, for the past year')} />
        <div className="p-5 pt-3">{act.data ? <Heatmap data={act.data} unit={t('questions')} /> : <Skeleton className="h-36" />}</div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-primary/30 bg-primary-tint">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="teal"><Sparkles className="size-3" />{rec.type === 'revisit' ? t('Revisit basics') : rec.type === 'advance' ? t('Go faster') : t('All done')}</Badge>
                  <span className="meta">{t('Recommended next step')}</span>
                </div>
                <h2>{rec.conceptName || t('Every concept mastered')}</h2>
                <p className="mt-1 max-w-lg text-[14px] text-slate">{rec.reason}</p>
                {rec.concept && <div className="mt-3 flex max-w-xs items-center gap-3"><MasteryBar value={rec.mastery} /><span className="num meta w-9 text-right">{pct(rec.mastery)}</span></div>}
              </div>
              <Button className="shrink-0" onClick={() => nav(target)}>{rec.type === 'revisit' ? t('Start revisit') : t('Start')} <ArrowRight /></Button>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('Mastery by concept')} meta={t('Red bars are gaps below 40%. The dashed line is the 80% mastery line.')} />
            <div className="h-[290px] px-2 pb-3 pt-3 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E6ECEF" />
                  <XAxis dataKey="short" tick={axis} tickLine={false} axisLine={{ stroke: '#DCE5EA' }} interval={0} angle={-30} textAnchor="end" height={54} />
                  <YAxis domain={[0, 1]} ticks={[0, 0.4, 0.8, 1]} tickFormatter={(v) => `${v * 100}%`} tick={axis} tickLine={false} axisLine={false} />
                  <RTip content={<ChartTip />} cursor={{ fill: '#F1F5F7' }} />
                  <ReferenceLine y={0.8} stroke="#83919C" strokeDasharray="4 4" />
                  <RBar dataKey="mastery" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                    {chart.map((c) => <Cell key={c.id} fill={c.status === 'gap' ? '#B91C1C' : '#0F766E'} fillOpacity={c.status === 'mastered' ? 1 : 0.62} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {homework.length > 0 && (
            <Card>
              <CardHeader title={t('Homework to hand in')} meta={t('Late work loses points for every day after the deadline')} action={<Button variant="ghost" size="sm" onClick={() => nav('/homework')}>{t('All homework')}</Button>} />
              <ul className="divide-y divide-line px-5 pb-2 pt-1">
                {homework.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <button onClick={() => nav(`/homework/${h.id}`)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[14px] font-medium hover:text-primary">{h.title}</span>
                      <span className="meta">{fmtDue(h.dueAt)} · {h.maxPoints} {t('points')}</span>
                    </button>
                    <Badge tone={h.status === 'overdue' ? 'critical' : 'warning'} dot>{dueIn(h.dueAt)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title={t('Strands')} meta={t('Average mastery in each part of the syllabus')} />
            <ul className="divide-y divide-line px-5 pb-2 pt-2">
              {strands.map((s) => (
                <li key={s.name} className="flex items-center gap-4 py-3">
                  <span className="w-40 shrink-0 text-[13.5px] font-medium">{s.name}</span>
                  <MasteryBar value={s.mastery} className="flex-1" />
                  <span className="num w-10 text-right text-[13px] font-medium">{pct(s.mastery)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('This week')} meta={t('Questions answered per day')} />
            <div className="h-[170px] px-2 pb-3 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E6ECEF" />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: '#DCE5EA' }} />
                  <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                  <RTip content={<ChartTip />} cursor={{ fill: '#F1F5F7' }} />
                  <RBar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('Badges')} meta={t('{n} of {total} earned', { n: unlocked, total: badges.length })} />
            <ul className="space-y-1 p-3">
              {badges.map((b) => (
                <li key={b.id} className={cn('flex items-center gap-3 rounded-field px-2 py-2', !b.unlocked && 'opacity-55')}>
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', b.unlocked ? 'bg-primary-subtle text-primary' : 'bg-neutral text-faint')}>
                    {b.unlocked ? <Award className="size-4" /> : <Lock className="size-3.5" />}
                  </span>
                  <span className="min-w-0"><span className="block text-[13.5px] font-medium">{b.name}</span><span className="meta block truncate">{b.desc}</span></span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title={t('Recent answers')} />
            {recent.length === 0 ? (
              <p className="meta px-5 pb-5 pt-2">{t('Nothing yet. Answer a practice question to see it here.')}</p>
            ) : (
              <ul className="divide-y divide-line px-5 pb-2 pt-1">
                {recent.map((r) => (
                  <li key={r.ts} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-[13.5px]">{r.conceptName}</span>
                    <Badge tone={r.correct ? 'success' : 'critical'}>{r.correct ? t('Correct') : t('Missed')}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
