import { useNavigate } from 'react-router-dom';
import { AlarmClock, ArrowRight, CheckCircle2, ClipboardList, TriangleAlert } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { useFetch } from '../lib/useFetch';
import { useT } from '../i18n';
import { cn, dueIn, fmtDue } from '../lib/utils';

export const STATUS = {
  todo: ['warning', 'To do'], overdue: ['critical', 'Overdue'], done: ['success', 'Handed in'],
  late: ['warning', 'Handed in late'], missing: ['critical', 'Missed'],
};

function Item({ h, onOpen }) {
  const { t } = useT();
  const open = h.status === 'todo' || h.status === 'overdue';
  const [tone, label] = STATUS[h.status];
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-semibold">{h.title}</p>
          <Badge tone={tone} dot>{t(label)}</Badge>
        </div>
        <p className="meta mt-1">{h.concept} · {t(h.levelName)} · {h.count} {t('questions')} · {h.maxPoints} {t('points')}</p>
        <p className={cn('mt-1.5 flex items-center gap-1.5 text-[13px]', h.status === 'overdue' ? 'font-medium text-critical' : 'text-slate')}>
          {h.status === 'overdue' ? <TriangleAlert className="size-3.5" /> : <AlarmClock className="size-3.5" />}
          {open ? `${dueIn(h.dueAt)} · ${fmtDue(h.dueAt)}` : `${t('Due')} ${fmtDue(h.dueAt)}`}
        </p>
        {h.status === 'overdue' && (
          <p className="mt-1 text-[13px] text-critical">{t('Handing in today costs {p} of your {m} points ({d} days late, {r} points a day).', { p: h.now.penalty, m: h.maxPoints, d: h.now.daysLate, r: h.penaltyPerDay })}</p>
        )}
        {h.mine && (
          <p className="mt-1.5 text-[13px]">
            <b className="num font-semibold">{h.mine.awarded}</b> / {h.maxPoints} {t('points')} · {t('{a} of {b} correct', { a: h.mine.correct, b: h.mine.total })}
            {h.mine.penalty > 0 && <span className="text-critical"> · {t('−{p} for lateness', { p: h.mine.penalty })}</span>}
          </p>
        )}
        {h.status === 'missing' && <p className="mt-1 text-[13px] text-critical">{t('This homework closed without a submission, so it scored 0.')}</p>}
      </div>
      {h.status !== 'missing' && (
        <Button variant={open ? 'primary' : 'secondary'} onClick={onOpen} className="shrink-0">
          {h.status === 'overdue' ? t('Hand in late') : open ? t('Start homework') : t('View result')} <ArrowRight />
        </Button>
      )}
    </li>
  );
}

export default function Homework() {
  const { t } = useT();
  const nav = useNavigate();
  const { data, error, loading, reload } = useFetch('/homework');
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const by = (...st) => (data || []).filter((h) => st.includes(h.status));
  const todo = by('overdue', 'todo').sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1) || new Date(a.dueAt) - new Date(b.dueAt));
  const finished = by('done', 'late', 'missing').sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt));
  const points = (data || []).reduce((a, h) => a + (h.mine?.awarded ?? 0), 0);
  const lost = (data || []).reduce((a, h) => a + (h.mine?.penalty ?? 0), 0);

  return (
    <Page className="max-w-4xl">
      <PageHeader title={t('Homework')} description={t('Everyone hands in by the deadline. Late work is still accepted for a few days, but loses points for every day it is late.')} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t('To hand in'), todo.length, todo.some((h) => h.status === 'overdue') ? t('{n} overdue', { n: by('overdue').length }) : t('All on schedule')],
          [t('Points earned'), points, t('across all homework')],
          [t('Lost to lateness'), lost, lost ? t('try to beat the deadline') : t('none so far')],
          [t('Handed in'), by('done', 'late').length, t('of {n} set', { n: (data || []).length })],
        ].map(([k, v, sub]) => (
          <Card key={k} className="p-4"><p className="label">{k}</p><p className="num mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.02em]">{loading ? '–' : v}</p><p className="meta mt-1.5">{sub}</p></Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader title={t('To hand in')} meta={t('Most urgent first')} />
        {loading ? <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          : todo.length === 0 ? <Empty icon={CheckCircle2} title={t('You are all caught up')}>{t('New homework will appear here when your teacher sets it.')}</Empty>
            : <ul className="divide-y divide-line pt-2">{todo.map((h) => <Item key={h.id} h={h} onOpen={() => nav(`/homework/${h.id}`)} />)}</ul>}
      </Card>

      <Card className="mt-4">
        <CardHeader title={t('Finished')} />
        {loading ? <div className="p-5"><Skeleton className="h-16" /></div>
          : finished.length === 0 ? <Empty icon={ClipboardList} title={t('Nothing here yet')} />
            : <ul className="divide-y divide-line pt-2">{finished.map((h) => <Item key={h.id} h={h} onOpen={() => nav(`/homework/${h.id}`)} />)}</ul>}
      </Card>
    </Page>
  );
}
