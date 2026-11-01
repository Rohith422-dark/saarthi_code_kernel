import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import Pager, { td, th } from '../components/Pager';
import { Button, Card, Empty, ErrorBox, Input, PageHeader, Skeleton } from '../components/ui';
import { useFetch } from '../lib/useFetch';
import { when } from '../lib/utils';

const SIZE = 12;

export default function Activity() {
  const { data, error, loading, reload } = useFetch('/events');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => (data || []).filter((e) => `${e.actor} ${e.action} ${e.target} ${e.detail}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const pages = Math.max(1, Math.ceil(rows.length / SIZE));
  const p = Math.min(page, pages - 1);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  return (
    <Page>
      <PageHeader title="Activity log" description="A record of what learners and teachers did, including every approval." action={<Button variant="secondary" onClick={reload}><RefreshCw />Refresh</Button>} />
      <Card>
        <div className="border-b border-line p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Filter by person, action or item" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Filter activity" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-[13px]">
            <thead><tr>{['Time', 'Who', 'Action', 'Item', 'Detail'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {loading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-3"><Skeleton className="h-6" /></td></tr>)}
              {rows.slice(p * SIZE, p * SIZE + SIZE).map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-neutral/60">
                  <td className={`${td} code whitespace-nowrap`}>{when(e.ts)}</td>
                  <td className={`${td} font-medium`}>{e.actor}</td>
                  <td className={td}>{e.action}</td>
                  <td className={`${td} max-w-[280px] truncate`}>{e.target}</td>
                  <td className={`${td} meta`}>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty title="No activity found" />}
        </div>
        <Pager page={p} pages={pages} total={rows.length} size={SIZE} onPage={setPage} />
      </Card>
    </Page>
  );
}
