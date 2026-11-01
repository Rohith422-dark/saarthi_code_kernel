import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GitBranch, Lock } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { Button, Card, ErrorBox, MasteryBar, PageHeader, Skeleton, StatusBadge } from '../components/ui';
import { Sheet } from '../components/ui/overlay';
import { useFetch } from '../lib/useFetch';
import { cn, pct } from '../lib/utils';

export default function Path() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useFetch('/concepts');
  const [open, setOpen] = useState(null);

  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const strands = data && [...new Set(data.map((c) => c.strand))];
  const byId = data && Object.fromEntries(data.map((c) => [c.id, c]));
  const sel = open && byId[open];

  return (
    <Page>
      <PageHeader title="Learning path" description="Concepts unlock when the ones they build on reach 50% mastery. Select a concept to see what it depends on." />
      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="space-y-8">
          {strands.map((s) => (
            <section key={s}>
              <h2 className="mb-3 text-[16px]">{s}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.filter((c) => c.strand === s).map((c) => (
                  <button
                    key={c.id} onClick={() => setOpen(c.id)}
                    className={cn(
                      'card p-4 text-left transition-colors duration-150 hover:border-[#bccad2]',
                      c.locked && 'bg-neutral/60',
                      open === c.id && 'border-primary/50 bg-primary-tint',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="code">{c.code}</p>
                        <p className="mt-1 text-[15px] font-semibold leading-snug">{c.name}</p>
                      </div>
                      {c.locked ? <Lock className="mt-1 size-4 shrink-0 text-faint" /> : <StatusBadge status={c.status} />}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <MasteryBar value={c.mastery} />
                      <span className="num meta w-9 text-right">{pct(c.mastery)}</span>
                    </div>
                    <p className="meta mt-2 truncate">
                      {c.prereqs.length ? `Builds on ${c.prereqs.map((p) => byId[p].name).join(', ')}` : 'Starting concept'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={!!sel} onOpenChange={(o) => !o && setOpen(null)} title={sel?.name} description={sel && <span className="code">{sel.code}</span>}>
        {sel && (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <MasteryBar value={sel.mastery} />
              <span className="num text-[14px] font-semibold">{pct(sel.mastery)}</span>
              <StatusBadge status={sel.status} />
            </div>
            <div>
              <p className="label mb-2 flex items-center gap-1.5"><GitBranch className="size-3.5" />Builds on</p>
              {sel.prereqs.length === 0 ? <p className="meta">Nothing. This is a starting concept.</p> : (
                <ul className="space-y-2">
                  {sel.prereqs.map((id) => (
                    <li key={id}>
                      <button onClick={() => setOpen(id)} className="flex w-full items-center gap-3 rounded-field border border-line px-3 py-2.5 text-left transition-colors hover:bg-neutral">
                        <span className="flex-1 text-[13.5px] font-medium">{byId[id].name}</span>
                        <span className="num meta">{pct(byId[id].mastery)}</span>
                        <StatusBadge status={byId[id].status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="label mb-2">Unlocks</p>
              {data.filter((c) => c.prereqs.includes(sel.id)).length === 0 ? <p className="meta">No later concept depends on this one.</p> : (
                <div className="flex flex-wrap gap-2">
                  {data.filter((c) => c.prereqs.includes(sel.id)).map((c) => (
                    <button key={c.id} onClick={() => setOpen(c.id)} className="rounded-full border border-line px-3 py-1 text-[12.5px] font-medium transition-colors hover:bg-neutral">{c.name}</button>
                  ))}
                </div>
              )}
            </div>
            {sel.locked && (
              <div className="rounded-field border border-[#f3d9b1] bg-warning-surface p-3.5 text-[13.5px] text-warning">
                Locked until {sel.lockedBy.map((id) => byId[id].name).join(' and ')} reach{sel.lockedBy.length === 1 ? 'es' : ''} 50%.
              </div>
            )}
            <Button className="w-full" onClick={() => nav(`/practice/${sel.locked ? sel.lockedBy[0] : sel.id}`)}>
              {sel.locked ? `Revisit ${byId[sel.lockedBy[0]].name}` : 'Practise this concept'} <ArrowRight />
            </Button>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
