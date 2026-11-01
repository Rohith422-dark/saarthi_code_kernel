import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import Pager, { td, th } from '../components/Pager';
import { Avatar, Badge, Card, ErrorBox, PageHeader, Select, Skeleton } from '../components/ui';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../components/ui/overlay';
import { useApp } from '../context/AppContext';
import { useFetch } from '../lib/useFetch';
import { cn } from '../lib/utils';
import { useT } from '../i18n';
import { mmss } from './Contests';

const Rank = ({ n }) => (
  <span className={cn('num grid size-7 place-items-center rounded-full text-[12.5px] font-semibold', n <= 3 ? 'bg-primary-subtle text-primary' : 'text-slate')}>{n}</span>
);

function Overall({ me }) {
  const { t } = useT();
  const { grade } = useApp();
  const { data, error, loading, reload } = useFetch(`/leaderboard?grade=${grade}`);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-80" />;
  const top = Math.max(1, ...data.rows.map((r) => r.contestPoints));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.rows.slice(0, 3).map((r) => (
          <Card key={r.id} className={cn('p-4', r.id === me && 'border-primary/40 bg-primary-tint')}>
            <div className="flex items-center gap-3">
              <Rank n={r.rank} /><Avatar name={r.name} size={32} />
              <div className="min-w-0"><p className="truncate text-[14.5px] font-semibold">{r.name}{r.id === me && <span className="meta"> ({t('You').toLowerCase()})</span>}</p><p className="meta">{r.contests} {t('contests')}</p></div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div><p className="label">{t('Contest points')}</p><p className="num text-[24px] font-semibold leading-tight tracking-[-0.02em]">{r.contestPoints}</p></div>
              <div className="text-right"><p className="label">{t('solved')}</p><p className="num text-[16px] font-semibold">{r.problemsSolved}</p></div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead><tr>{[t('Rank'), t('Learner'), t('Contest points'), t('Contests'), t('Problems solved'), t('Homework points')].map((h, i) => <th key={h} className={cn(th, i >= 3 && 'text-right')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => (
                <tr key={r.id} className={cn('transition-colors', r.id === me ? 'bg-primary-tint' : 'hover:bg-neutral/60')}>
                  <td className={td}><Rank n={r.rank} /></td>
                  <td className={td}><div className="flex items-center gap-2.5"><Avatar name={r.name} size={28} /><span className="font-medium">{r.name}</span>{r.id === me && <Badge tone="teal">{t('You')}</Badge>}</div></td>
                  <td className={td}>
                    <div className="flex items-center gap-3"><span className="num w-12 font-semibold">{r.contestPoints}</span><div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-track sm:block"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.contestPoints / top) * 100}%` }} /></div></div>
                  </td>
                  <td className={`${td} num text-right`}>{r.contests}</td>
                  <td className={`${td} text-right`}><span className="num font-medium">{r.problemsSolved}</span><span className="meta block text-[11.5px]">{r.practiceSolved} {t('practice')} · {r.contestSolved} {t('contest')} · {r.homeworkSolved} {t('homework')}</span></td>
                  <td className={`${td} num text-right`}>{r.homeworkPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="meta mt-3">{t(data.rule)}</p>
    </>
  );
}

function ByContest({ me, id, onPick }) {
  const { grade } = useApp();
  const list = useFetch(`/leaderboard?grade=${grade}`);
  const pick = id || list.data?.contests?.[0]?.id;
  const { data, error, loading } = useFetch(pick ? `/leaderboard/${pick}` : '/health');
  if (list.error || error) return <ErrorBox message={list.error || error} />;
  return (
    <>
      <div className="mb-3 max-w-xs">
        <Select aria-label="Contest" value={pick || ''} onChange={(e) => onPick(e.target.value)}>
          {(list.data?.contests || []).map((c) => <option key={c.id} value={c.id}>{c.title}{c.status === 'live' ? ' (live)' : ''}</option>)}
        </Select>
      </div>
      {loading || !data?.rows ? <Skeleton className="h-64" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead><tr>{['Rank', 'Learner', 'Score', 'Correct', 'Time'].map((h, i) => <th key={h} className={cn(th, i >= 2 && 'text-right')}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((r) => (
                  <tr key={r.id} className={cn(r.id === me ? 'bg-primary-tint' : 'hover:bg-neutral/60')}>
                    <td className={td}><Rank n={r.rank} /></td>
                    <td className={td}><div className="flex items-center gap-2.5"><Avatar name={r.name} size={28} /><span className="font-medium">{r.name}</span>{r.id === me && <Badge tone="teal">You</Badge>}</div></td>
                    <td className={`${td} num text-right font-semibold`}>{r.score}<span className="font-normal text-slate"> / {data.contest.maxScore}</span></td>
                    <td className={`${td} num text-right`}>{r.correct} / {r.total}</td>
                    <td className={`${td} num text-right`}>{mmss(r.timeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={0} pages={1} total={data.rows.length} size={Math.max(1, data.rows.length)} onPage={() => {}} />
        </Card>
      )}
      <p className="meta mt-3">Within a contest, higher scores rank first and the faster time wins a tie.</p>
    </>
  );
}

export default function Leaderboard() {
  const { t } = useT();
  const { profile, grade } = useApp();
  const [params, setParams] = useSearchParams();
  const contest = params.get('contest');
  const tab = params.get('tab') === 'contest' || contest ? 'contest' : 'overall';
  const me = profile.role === 'student' ? profile.id : null;
  return (
    <Page className="max-w-5xl">
      <PageHeader title={t('Leaderboard')} description={t('Ranked mainly by contest points. When points are equal, the learner who has solved more problems ranks higher.')} meta={<span className="flex items-center gap-1.5"><Trophy className="size-3.5" />{t('Class {g}', { g: grade })} · {t('Contests first, problems solved second')}</span>} />
      <TabsRoot value={tab} onValueChange={(v) => setParams(v === 'contest' ? { tab: 'contest' } : {})}>
        <TabsList className="mb-4">
          <TabsTrigger value="overall">{t('Overall')}</TabsTrigger>
          <TabsTrigger value="contest">{t('By contest')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="outline-none"><Overall me={me} /></TabsContent>
        <TabsContent value="contest" className="outline-none"><ByContest me={me} id={contest || undefined} onPick={(id) => setParams({ tab: 'contest', contest: id })} /></TabsContent>
      </TabsRoot>
    </Page>
  );
}
