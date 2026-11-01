import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, Plus } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { td, th } from '../components/Pager';
import { Badge, Button, Card, Empty, ErrorBox, Input, PageHeader, Select, Skeleton, Textarea } from '../components/ui';
import { Dialog, Sheet } from '../components/ui/overlay';
import { api, errorText } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useFetch } from '../lib/useFetch';
import { ago, cn, dueIn, fmtDue } from '../lib/utils';
import { STATUS } from './Homework';

const STATE = { open: ['teal', 'Open'], 'past due': ['warning', 'Past due'], closed: ['neutral', 'Closed'] };
const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const defaultDue = () => { const d = new Date(Date.now() + 3 * 86400000); d.setHours(18, 0, 0, 0); return toLocalInput(d); };

function Detail({ id, onClose, onChanged }) {
  const { data, loading } = useFetch(id ? `/teacher/homework/${id}` : '/health');
  const hw = id && data?.rows ? data : null;
  const [busy, setBusy] = useState(false);
  const pending = hw?.rows.filter((r) => r.status === 'todo' || r.status === 'overdue').length ?? 0;

  const remind = async () => {
    setBusy(true);
    try { const { data: r } = await api.post(`/teacher/homework/${id}/remind`); toast.success(`Reminder posted to the class chat (${r.reminded} still to hand in)`); }
    catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
    onChanged();
  };

  return (
    <Sheet
      open={!!id} onOpenChange={(o) => !o && onClose()} title={hw?.title ?? 'Homework'} width="sm:max-w-[560px]"
      description={hw && <span>{hw.concept} · {hw.levelName} · {hw.count} questions · due {fmtDue(hw.dueAt)}</span>}
    >
      {loading || !hw ? <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div> : (
        <div className="p-5">
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[['Total points', hw.maxPoints], ['Late penalty', `${hw.penaltyPerDay}/day`], ['Closes', fmtDue(hw.closesAt).split(',')[0]]].map(([k, v]) => (
              <div key={k} className="rounded-field bg-neutral py-2"><p className="num text-[15px] font-semibold">{v}</p><p className="meta text-[11.5px]">{k}</p></div>
            ))}
          </div>
          {hw.worksheet && <p className="meta mb-3">Worksheet attached: {hw.worksheet.title} <span className="code">({hw.worksheet.code})</span></p>}
          <Button className="mb-4 w-full" variant="secondary" disabled={!pending || busy} onClick={remind}><BellRing />{pending ? `Remind the ${pending} who have not handed in` : 'Everyone has handed in'}</Button>
          <ul className="divide-y divide-line">
            {hw.rows.map((r) => {
              const [tone, label] = STATUS[r.status];
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{r.name}</p>
                    <p className="meta">{r.submittedAt ? `Handed in ${ago(r.submittedAt)}` : r.status === 'overdue' ? dueIn(hw.dueAt) : r.status === 'missing' ? 'Closed, nothing handed in' : dueIn(hw.dueAt)}</p>
                  </div>
                  {r.submittedAt && (
                    <div className="text-right text-[13px]">
                      <p className="num font-semibold">{r.awarded} <span className="font-normal text-slate">/ {hw.maxPoints}</span></p>
                      <p className={cn('meta num', r.penalty && 'text-critical')}>{r.correct}/{r.total} correct{r.penalty ? ` · −${r.penalty} late` : ''}</p>
                    </div>
                  )}
                  <Badge tone={tone} dot>{label}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function Create({ open, onOpenChange, onCreated }) {
  const { grade } = useApp();
  const concepts = useFetch(`/teacher/concepts?grade=${grade}`);
  const resources = useFetch('/resources');
  const blank = () => ({ title: '', conceptId: concepts.data?.[0]?.id ?? '', level: '0', count: 6, maxPoints: 30, penaltyPerDay: 3, dueAt: defaultDue(), resourceId: '', instructions: '' });
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(blank()); setError(''); } }, [open, concepts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const sheets = (resources.data || []).filter((r) => r.type === 'Worksheet' && r.status === 'Approved' && r.grade === grade && r.conceptId === f.conceptId);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/teacher/homework', {
        ...f, grade, level: Number(f.level), count: Number(f.count), maxPoints: Number(f.maxPoints), penaltyPerDay: Number(f.penaltyPerDay),
        dueAt: new Date(f.dueAt).toISOString(), resourceId: f.resourceId || null,
      });
      toast.success('Homework assigned and announced in the class chat');
      onOpenChange(false); onCreated();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-[13px] font-medium">{children}</label>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Assign homework" className="top-[5vh] max-h-[90vh] overflow-y-auto">
      <form onSubmit={submit} className="p-5">
        <h3 className="text-[17px]">Assign homework · Class {grade}</h3>
        <p className="meta mt-1">Every learner gets the same questions. They are generated for the topic and level you choose.</p>
        <div className="mt-4 space-y-3.5">
          <div><L id="hw-title">Title</L><Input id="hw-title" className="mt-1.5" value={f.title} onChange={set('title')} placeholder="e.g. Integers revision" maxLength={80} autoFocus /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><L id="hw-topic">Topic</L><Select id="hw-topic" className="mt-1.5" value={f.conceptId} onChange={(e) => setF((x) => ({ ...x, conceptId: e.target.value, resourceId: '' }))}>{(concepts.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><L id="hw-level">Difficulty</L><Select id="hw-level" className="mt-1.5" value={f.level} onChange={set('level')}><option value="0">Mixed</option><option value="1">Easy</option><option value="2">Medium</option><option value="3">Hard</option></Select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><L id="hw-count">Questions</L><Input id="hw-count" type="number" min={3} max={15} className="mt-1.5" value={f.count} onChange={set('count')} /></div>
            <div><L id="hw-points">Total points</L><Input id="hw-points" type="number" min={10} max={100} className="mt-1.5" value={f.maxPoints} onChange={set('maxPoints')} /></div>
            <div><L id="hw-pen">Late penalty per day</L><Input id="hw-pen" type="number" min={0} className="mt-1.5" value={f.penaltyPerDay} onChange={set('penaltyPerDay')} /></div>
          </div>
          <div><L id="hw-due">Deadline</L><Input id="hw-due" type="datetime-local" className="mt-1.5" value={f.dueAt} onChange={set('dueAt')} /><p className="meta mt-1">Late work is accepted for 3 days after this, losing the penalty for every day (or part of a day) late. After that it closes.</p></div>
          <div><L id="hw-sheet">Attach an approved worksheet <span className="font-normal text-slate">(optional)</span></L>
            <Select id="hw-sheet" className="mt-1.5" value={f.resourceId} onChange={set('resourceId')}><option value="">None</option>{sheets.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.language})</option>)}</Select>
            {sheets.length === 0 && <p className="meta mt-1">No approved worksheet exists for this topic yet. Approve one in Resources.</p>}
          </div>
          <div><L id="hw-ins">Instructions <span className="font-normal text-slate">(optional)</span></L><Textarea id="hw-ins" rows={2} className="mt-1.5 w-full" value={f.instructions} onChange={set('instructions')} maxLength={400} /></div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-field bg-critical-surface px-3 py-2 text-[13px] text-critical">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={busy || !f.title.trim()}>{busy ? 'Assigning…' : 'Assign homework'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function TeacherHomework() {
  const { grade } = useApp();
  const { data, error, loading, reload } = useFetch(`/teacher/homework?grade=${grade}`);
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const attention = (data || []).reduce((a, h) => a + h.overdue + h.missing, 0);

  return (
    <Page>
      <PageHeader
        title="Homework" description="Set homework for the whole class, watch who has handed in, and chase the rest. Late work loses points automatically."
        meta={<span>{data ? `${data.length} assigned` : ''}{attention ? ` · ${attention} learner${attention > 1 ? 's' : ''} late or missing` : ''}</span>}
        action={<Button onClick={() => setCreating(true)}><Plus />Assign homework</Button>}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13.5px]">
            <thead><tr>{['Homework', 'Deadline', 'Status', 'Handed in', 'On time', 'Late', 'Overdue / missing', 'Class average'].map((h, i) => <th key={h} className={cn(th, i >= 4 && 'text-right')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {loading && Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={8} className="p-3"><Skeleton className="h-10" /></td></tr>)}
              {(data || []).map((h) => (
                <tr key={h.id} onClick={() => setOpen(h.id)} className="cursor-pointer transition-colors hover:bg-neutral/60">
                  <td className={td}><p className="font-medium">{h.title}</p><p className="meta">{h.concept} · {h.levelName} · {h.count} questions · {h.maxPoints} pts</p></td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDue(h.dueAt)}<p className="meta">{dueIn(h.dueAt)}</p></td>
                  <td className={td}><Badge tone={STATE[h.state][0]} dot>{STATE[h.state][1]}</Badge></td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-primary" style={{ width: `${(h.submitted / h.total) * 100}%` }} /></div><span className="num text-[13px] font-medium">{h.submitted}/{h.total}</span></div>
                  </td>
                  <td className={`${td} num text-right`}>{h.onTime}</td>
                  <td className={`${td} num text-right`}>{h.late}</td>
                  <td className={`${td} num text-right`}>{h.overdue + h.missing ? <span className="font-medium text-critical">{h.overdue + h.missing}</span> : <span className="text-slate">0</span>}</td>
                  <td className={`${td} num text-right`}>{h.avgPct === null ? '–' : `${h.avgPct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && data?.length === 0 && <Empty title="No homework yet">Assign the first one to get started.</Empty>}
        </div>
      </Card>
      <Detail id={open} onClose={() => setOpen(null)} onChanged={reload} />
      <Create open={creating} onOpenChange={setCreating} onCreated={reload} />
    </Page>
  );
}
