import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import LearnerSheet from '../components/LearnerSheet';
import Pager, { td, th } from '../components/Pager';
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Input, MasteryBar, PageHeader, Select, Skeleton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useFetch } from '../lib/useFetch';
import { ago, cn, pct } from '../lib/utils';

const GROUP = { needs: ['critical', 'Needs revision'], on_track: ['neutral', 'On track'], ready: ['success', 'Ready to advance'] };
const SIZE = 10;

export default function Students() {
  const nav = useNavigate();
  const { grade } = useApp();
  const { data, error, loading, reload } = useFetch(`/students?grade=${grade}`);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => {
    const list = (data || []).filter((s) => (group === 'all' || s.group === group) && s.name.toLowerCase().includes(q.toLowerCase()));
    const by = { name: (a, b) => a.name.localeCompare(b.name), avg: (a, b) => a.avg - b.avg, contest: (a, b) => b.contestPoints - a.contestPoints, active: (a, b) => new Date(a.lastActiveAt) - new Date(b.lastActiveAt) };
    return [...list].sort(by[sort]);
  }, [data, q, group, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / SIZE));
  const p = Math.min(page, pages - 1);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;

  return (
    <Page>
      <PageHeader title="Students" description="Every learner's progress in one place. Open a learner to see concept-level detail, or message them directly." meta={<span>{data ? `${data.length} learners` : ''}</span>} />
      <Card>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Search learners" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search learners" />
          </div>
          <Select className="sm:w-48" value={group} onChange={(e) => { setGroup(e.target.value); setPage(0); }} aria-label="Group">
            <option value="all">All groups</option>
            {Object.entries(GROUP).map(([k, [, l]]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select className="sm:w-48" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            <option value="name">Sort: name</option><option value="avg">Sort: lowest mastery</option><option value="contest">Sort: contest points</option><option value="active">Sort: least recently active</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13.5px]">
            <thead><tr>{['Learner', 'Group', 'Mastery', 'Gaps', 'Streak', 'Contest points', 'Solved', 'Last active', ''].map((h, i) => <th key={h + i} className={cn(th, [3, 4, 5, 6].includes(i) && 'text-right')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={9} className="p-3"><Skeleton className="h-9" /></td></tr>)}
              {rows.slice(p * SIZE, p * SIZE + SIZE).map((s) => (
                <tr key={s.id} onClick={() => setOpen(s.id)} className="cursor-pointer transition-colors hover:bg-neutral/60">
                  <td className={td}><div className="flex items-center gap-2.5"><Avatar name={s.name} size={30} /><span className="font-medium">{s.name}</span></div></td>
                  <td className={td}><Badge tone={GROUP[s.group][0]} dot>{GROUP[s.group][1]}</Badge></td>
                  <td className={td}><div className="flex items-center gap-2.5"><MasteryBar value={s.avg} className="w-24" /><span className="num w-9 text-[13px] font-medium">{pct(s.avg)}</span></div></td>
                  <td className={`${td} num text-right`}>{s.gaps ? <span className="font-medium text-critical">{s.gaps}</span> : <span className="text-slate">0</span>}</td>
                  <td className={`${td} num text-right`}>{s.streak}</td>
                  <td className={`${td} num text-right`}><span className="font-medium">{s.contestPoints}</span><span className="meta block text-[11.5px]">rank {s.rank}</span></td>
                  <td className={`${td} num text-right`}>{s.problemsSolved}</td>
                  <td className={`${td} meta whitespace-nowrap`}>{ago(s.lastActiveAt)}</td>
                  <td className={`${td} text-right`}>
                    <Button variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); nav(`/messages?thread=dm:${s.id}`); }}><MessageCircle />Message</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty title="No learners match">Try clearing a filter.</Empty>}
        </div>
        <Pager page={p} pages={pages} total={rows.length} size={SIZE} onPage={setPage} />
      </Card>
      <LearnerSheet id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
