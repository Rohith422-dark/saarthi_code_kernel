import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, FileCheck2, ListChecks, Users } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import LearnerSheet from '../components/LearnerSheet';
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { Tooltip } from '../components/ui/overlay';
import Heatmap from '../components/Heatmap';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n';
import { useFetch } from '../lib/useFetch';
import { ago, cn, pct } from '../lib/utils';

const GROUPS = [
  ['needs', 'Needs revision', 'critical'],
  ['on_track', 'On track', 'neutral'],
  ['ready', 'Ready to advance', 'success'],
];

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

const cell = (p) =>
  p < 0.4 ? 'bg-critical-surface text-critical' : p < 0.8 ? 'bg-neutral text-ink' : 'bg-primary-subtle text-primary';

export default function TeacherOverview() {
  const nav = useNavigate();
  const { t } = useT();
  const { grade } = useApp();
  const { data: d, error, loading, reload } = useFetch(`/teacher/overview?grade=${grade}`);
  const [learner, setLearner] = useState(null);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  if (loading || !d) {
    return <Page><Skeleton className="mb-6 h-9 w-64" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px]" />)}</div><Skeleton className="mt-4 h-72" /></Page>;
  }
  const silent = d.alerts.filter((a) => a.severity === 'critical').length;

  return (
    <Page>
      <PageHeader
        title="Class overview" description="See exactly what each learner understands, and who needs you first."
        meta={<><span>{t('Class {g}', { g: grade })} · {t('Maths')}</span><span>{d.counts.students} learners</span></>}
        action={<Button onClick={() => nav('/teacher/resources')}>Review resources</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Metric icon={Users} label="Class average" value={pct(d.classAvg)} sub={`${d.counts.needs} need revision`} />
        <Metric icon={BellRing} label="Silently falling behind" value={silent} sub={`${d.alerts.length} alerts in total`} />
        <Metric icon={FileCheck2} label="Worksheets ready" value={d.resources.worksheets} sub={`${d.resources.pending} awaiting review`} />
        <Metric icon={ListChecks} label="Talking points" value={d.resources.talkingPoints} sub="approved for class" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Class activity" meta="Questions answered by the whole class, every day for the past year" />
        <div className="p-5 pt-3"><Heatmap data={d.activity} unit="questions" /></div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Learner groups" meta="Groups update as learners answer questions" />
        <div className="grid gap-px p-5 pt-4 sm:grid-cols-3 sm:gap-4">
          {GROUPS.map(([k, label, tone]) => (
            <div key={k} className="rounded-field border border-line p-3.5">
              <div className="flex items-center justify-between"><Badge tone={tone} dot>{label}</Badge><span className="num meta">{d.groups[k].length}</span></div>
              <div className="mt-3 flex min-h-8 flex-wrap gap-1.5">
                {d.groups[k].length === 0 && <span className="meta">No one right now</span>}
                {d.groups[k].map((s) => (
                  <button key={s.id} onClick={() => setLearner(s.id)} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:bg-neutral">{s.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Concept mastery" meta="Each cell is one learner's mastery of one concept"
          action={<div className="hidden items-center gap-3 text-[12px] text-slate sm:flex">
            {[['bg-critical-surface', 'Gap'], ['bg-neutral', 'Learning'], ['bg-primary-subtle', 'Mastered']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={cn('size-3 rounded', c)} />{l}</span>)}
          </div>}
        />
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[820px] border-separate border-spacing-y-1 text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface pb-2 pr-3 text-left text-[11.5px] font-medium text-slate">Learner</th>
                {d.concepts.map((c) => (
                  <th key={c.id} className="px-0.5 pb-2 text-center align-bottom">
                    <Tooltip label={c.name} side="top"><span className="block max-w-[64px] cursor-default truncate text-[11px] font-medium text-slate">{c.short}</span></Tooltip>
                  </th>
                ))}
                <th className="pb-2 pl-3 text-right text-[11.5px] font-medium text-slate">Active</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.id} className="group cursor-pointer" onClick={() => setLearner(r.id)}>
                  <td className="sticky left-0 z-10 bg-surface pr-3 font-medium group-hover:text-primary">{r.name}</td>
                  {d.concepts.map((c) => (
                    <td key={c.id} className="px-0.5">
                      <div className={cn('num grid h-8 place-items-center rounded-md text-[12px] font-medium', cell(r.cells[c.id]))}>{Math.round(r.cells[c.id] * 100)}</div>
                    </td>
                  ))}
                  <td className="meta whitespace-nowrap pl-3 text-right">{ago(r.lastActiveAt)}</td>
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 bg-surface pr-3 pt-1 text-[12px] font-medium text-slate">Class average</td>
                {d.concepts.map((c) => <td key={c.id} className="num px-0.5 pt-1 text-center text-[12px] font-medium text-slate">{Math.round(c.avg * 100)}</td>)}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Talking points for class" meta="Concepts where the most learners are below mastery" />
          <ul className="divide-y divide-line px-5 pb-2 pt-1">
            {d.talking.map((t) => (
              <li key={t.conceptId} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium">{t.concept}</p>
                  <Badge tone="warning">{t.below} of {t.total} below mastery</Badge>
                </div>
                <p className="meta mt-1">Open with: &ldquo;{t.opener}&rdquo;</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Questions the tutor could not answer" meta="Add notes for these and they become answerable" />
          {d.knowledgeGaps.length === 0 ? <Empty title="Nothing unanswered">Questions outside the approved notes will show up here.</Empty> : (
            <ul className="divide-y divide-line px-5 pb-2 pt-1">
              {d.knowledgeGaps.map((g) => (
                <li key={g.ts} className="flex items-start justify-between gap-3 py-3">
                  <p className="text-[14px]">&ldquo;{g.query}&rdquo;</p>
                  <span className="meta shrink-0">{g.student} · {ago(g.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <LearnerSheet id={learner} onClose={() => setLearner(null)} />
    </Page>
  );
}
