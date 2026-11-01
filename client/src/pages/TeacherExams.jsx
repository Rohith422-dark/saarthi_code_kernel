import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarClock, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import LearnerSheet from '../components/LearnerSheet';
import { td, th } from '../components/Pager';
import { Badge, Bar, Button, Card, CardHeader, Empty, ErrorBox, Input, PageHeader, Select, Skeleton } from '../components/ui';
import { Dialog } from '../components/ui/overlay';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n';
import { api, errorText } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { cn } from '../lib/utils';

const KIND = { unit: 'Unit test', halfyearly: 'Half-yearly', annual: 'Annual exam', preboard: 'Pre-board', board: 'Board exam' };
const BAND = { focus: ['critical', 'Needs focus'], getting: ['warning', 'Getting there'], track: ['info', 'On track'], ready: ['success', 'Exam ready'] };
const MOOD = ['Calm', 'Fine', 'A bit worried', 'Stressed', 'Very stressed'];
const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function AddExam({ open, onOpenChange, onDone }) {
  const { t } = useT();
  const { grade } = useApp();
  const [f, setF] = useState({ title: '', kind: 'unit', date: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ title: '', kind: 'unit', date: '' }); setError(''); } }, [open]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/teacher/exams', { ...f, grade, date: new Date(`${f.date}T09:30:00`).toISOString() }); toast.success(t('Exam added and announced to the class')); onOpenChange(false); onDone(); }
    catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('Add an exam date')}>
      <form onSubmit={submit} className="p-5">
        <h3 className="text-[17px]">{t('Add an exam date')} · {t('Class {g}', { g: grade })}</h3>
        <p className="meta mt-1">{t('Learners see a countdown and the study plan adjusts to the days left.')}</p>
        <div className="mt-4 space-y-3.5">
          <div><label htmlFor="ex-title" className="text-[13px] font-medium">{t('Title')}</label><Input id="ex-title" className="mt-1.5" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} autoFocus /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="ex-kind" className="text-[13px] font-medium">{t('Kind')}</label><Select id="ex-kind" className="mt-1.5" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</Select></div>
            <div><label htmlFor="ex-date" className="text-[13px] font-medium">{t('Date')}</label><Input id="ex-date" type="date" className="mt-1.5" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-field bg-critical-surface px-3 py-2 text-[13px] text-critical">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button><Button type="submit" disabled={busy || !f.title.trim() || !f.date}>{t('Add exam')}</Button></div>
      </form>
    </Dialog>
  );
}

export default function TeacherExams() {
  const { t } = useT();
  const { grade } = useApp();
  const nav = useNavigate();
  const exams = useFetch(`/teacher/exams?grade=${grade}`);
  const ready = useFetch(`/teacher/exams/readiness?grade=${grade}`);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  if (exams.error || ready.error) return <Page><ErrorBox message={exams.error || ready.error} onRetry={() => { exams.reload(); ready.reload(); }} /></Page>;
  const remove = async (id) => { try { await api.delete(`/teacher/exams/${id}`); toast.success(t('Exam removed')); exams.reload(); } catch (e) { toast.error(errorText(e)); } };
  const flagged = (ready.data || []).filter((r) => r.flag).length;

  return (
    <Page>
      <PageHeader
        title={t('Exam preparation')} description={t('Set the exam dates for this class, see who is ready, and notice who is feeling the pressure.')}
        meta={<span>{t('Class {g}', { g: grade })}</span>}
        action={<Button onClick={() => setAdding(true)}><Plus />{t('Add an exam date')}</Button>}
      />
      <Card>
        <CardHeader title={t('Exam dates')} />
        {exams.loading ? <div className="p-5"><Skeleton className="h-20" /></div> : exams.data.length === 0 ? <Empty icon={CalendarClock} title={t('No exams scheduled')} /> : (
          <ul className="divide-y divide-line px-5 pb-2 pt-1">
            {exams.data.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{e.title}</p><p className="meta">{fmt(e.date)}</p></div>
                <Badge tone="neutral">{t(KIND[e.kind])}</Badge>
                <span className="num w-20 text-right text-[13.5px] font-semibold">{t('{n} days', { n: e.daysLeft })}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(e.id)} aria-label={t('Remove')}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title={t('Class {g} readiness', { g: grade })} meta={flagged ? t('{n} learner(s) may need a kind word', { n: flagged }) : t('Built from mastery, mock papers and homework')} />
        <div className="overflow-x-auto pt-3">
          <table className="w-full min-w-[860px] text-[13.5px]">
            <thead><tr>{[t('Learner'), t('Readiness'), t('Mastery'), t('Mock papers'), t('Homework'), t('Feeling'), ''].map((h, i) => <th key={h + i} className={cn(th)}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {(ready.data || []).map((r) => {
                const [tone, label] = BAND[r.band];
                return (
                  <tr key={r.id} onClick={() => setOpen(r.id)} className="cursor-pointer transition-colors hover:bg-neutral/60">
                    <td className={`${td} font-medium`}>{r.name}</td>
                    <td className={td}><div className="flex items-center gap-2.5"><span className="num w-10 font-semibold">{r.score}%</span><Badge tone={tone} dot>{t(label)}</Badge></div></td>
                    <td className={`${td} num`}>{r.mastery}%</td>
                    <td className={`${td} num`}>{r.mocks === null ? '–' : `${r.mocks}%`}<span className="meta"> · {r.mocksTaken}</span></td>
                    <td className={`${td} num`}>{r.homework}%</td>
                    <td className={td}>{r.stress ? <Badge tone={r.stress.level >= 4 ? 'critical' : r.stress.level === 3 ? 'warning' : 'success'}>{r.stress.level} · {t(MOOD[r.stress.level - 1])}</Badge> : <span className="meta">–</span>}</td>
                    <td className={`${td} text-right`}><Button variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); nav(`/messages?thread=dm:${r.id}`); }}><MessageCircle />{t('Message')}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <AddExam open={adding} onOpenChange={setAdding} onDone={exams.reload} />
      <LearnerSheet id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
