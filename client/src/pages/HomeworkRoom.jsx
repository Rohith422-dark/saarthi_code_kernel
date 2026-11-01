import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlarmClock, ArrowLeft, Check, FileText, TriangleAlert, X } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import QuestionCard from '../components/QuestionCard';
import Scratchpad from '../components/Scratchpad';
import { Badge, Button, Card, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { Dialog } from '../components/ui/overlay';
import { useApp } from '../context/AppContext';
import { api, errorText } from '../lib/api';
import { useT } from '../i18n';
import { cn, dueIn, fmtDue } from '../lib/utils';

const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

function Result({ hw }) {
  const { t } = useT();
  const m = hw.mine;
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-4">
        <div><p className="label">{t('Marks')}</p><p className="num mt-1 text-[28px] font-semibold leading-none">{m.correct}<span className="text-[15px] font-medium text-slate"> / {m.total}</span></p></div>
        <div><p className="label">{t('Points earned')}</p><p className="num mt-1 text-[28px] font-semibold leading-none">{m.earned}</p></div>
        <div><p className="label">{t('Late penalty')}</p><p className={cn('num mt-1 text-[28px] font-semibold leading-none', m.penalty ? 'text-critical' : '')}>{m.penalty ? `−${m.penalty}` : '0'}</p>{m.daysLate > 0 && <p className="meta mt-1">{m.daysLate} {t('days late')} × {hw.penaltyPerDay}</p>}</div>
        <div><p className="label">{t('Final points')}</p><p className="num mt-1 text-[28px] font-semibold leading-none text-primary">{m.awarded}<span className="text-[15px] font-medium text-slate"> / {hw.maxPoints}</span></p></div>
      </div>
      <p className="meta mt-4">{t('Handed in')} {fmtDue(m.submittedAt)}{m.penalty === 0 && m.daysLate === 0 ? ` · ${t('on time')}` : ''}</p>
    </Card>
  );
}

export default function HomeworkRoom() {
  const { t } = useT();
  const { id } = useParams();
  const nav = useNavigate();
  const { refreshUnread } = useApp();
  const [hw, setHw] = useState(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHw(null); setError(''); setAnswers({});
    api.get(`/homework/${id}`).then((r) => setHw(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);

  if (error) return <Page><ErrorBox message={error} /></Page>;
  if (!hw) return <Page className="max-w-5xl"><Skeleton className="h-10 w-80" /><Skeleton className="mt-6 h-72" /></Page>;

  const open = !!hw.questions;
  const overdue = hw.status === 'overdue';
  const done = hw.questions?.length ? Object.keys(answers).length : 0;

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/homework/${id}/submit`, { answers });
      setHw(data); setConfirm(false); refreshUnread();
      toast.success(data.mine.penalty ? `Handed in late: ${data.mine.awarded} points` : `Handed in: ${data.mine.awarded} points`);
    } catch (e) { toast.error(errorText(e)); setConfirm(false); } finally { setBusy(false); }
  };

  return (
    <Page className="max-w-5xl">
      <button onClick={() => nav('/homework')} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate hover:text-ink"><ArrowLeft className="size-4" />{t('All homework')}</button>
      <PageHeader
        title={hw.title}
        description={hw.instructions}
        meta={<><span>{hw.concept}</span><span>{t(hw.levelName)}</span><span>{hw.count} {t('questions')}</span><span>{hw.maxPoints} {t('points')}</span></>}
      />

      {/* Deadline and what lateness costs, always visible */}
      <div className={cn('mb-4 flex flex-wrap items-start gap-3 rounded-card border p-4', overdue ? 'border-critical/30 bg-critical-surface' : hw.status === 'todo' ? 'border-line bg-surface' : 'border-line bg-surface')}>
        <span className={cn('mt-0.5', overdue ? 'text-critical' : 'text-slate')}>{overdue ? <TriangleAlert className="size-5" /> : <AlarmClock className="size-5" />}</span>
        <div className="min-w-0 flex-1 text-[14px]">
          <p className={cn('font-semibold', overdue && 'text-critical')}>
            {hw.status === 'missing' ? t('Closed without a submission') : open || hw.status === 'overdue' ? `${dueIn(hw.dueAt)} · ${fmtDue(hw.dueAt)}` : `${t('Deadline was')} ${fmtDue(hw.dueAt)}`}
          </p>
          <p className={cn('mt-0.5', overdue ? 'text-critical' : 'text-slate')}>
            {overdue
              ? t('The deadline has passed. Handing in now loses {p} of {m} points ({d} days late × {r}). It closes {c}.', { p: hw.now.penalty, m: hw.maxPoints, d: hw.now.daysLate, r: hw.penaltyPerDay, c: fmtDue(hw.closesAt) })
              : t('Handing in after the deadline loses {r} points for every day (or part of a day) late. Late work is accepted for {n} days.', { r: hw.penaltyPerDay, n: hw.closeAfterDays })}
          </p>
        </div>
        {hw.worksheet && <Badge tone="info"><FileText className="size-3" />Worksheet {hw.worksheet.code}</Badge>}
      </div>

      {hw.mine && <Result hw={hw} />}

      {hw.status === 'missing' && (
        <Card className="p-6"><p className="font-medium">{t('This homework is closed.')}</p><p className="meta mt-1">{t('It scored 0 because nothing was handed in. Speak to your teacher if there was a reason.')}</p></Card>
      )}

      {open && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {hw.questions.map((q) => (
              <Card key={q.index} className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-neutral text-[12px] font-semibold">{q.index + 1}</span>
                  <Badge tone="neutral">{t(LEVEL[q.level])}</Badge>
                </div>
                <QuestionCard question={q} choice={answers[q.index] ?? null} onChoose={(i) => setAnswers((a) => ({ ...a, [q.index]: i }))} />
              </Card>
            ))}
          </div>
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <Card className="p-4">
              <div className="flex items-center justify-between"><p className="text-[14px] font-semibold">{t('Your progress')}</p><span className="num meta">{t('{n} of {total} answered', { n: done, total: hw.count })}</span></div>
              <div className="mt-2.5 flex gap-1">{hw.questions.map((q) => <span key={q.index} className={cn('h-1.5 flex-1 rounded-full transition-colors', answers[q.index] !== undefined ? 'bg-primary' : 'bg-track')} />)}</div>
              <Button className="mt-4 w-full" size="lg" onClick={() => setConfirm(true)}>{overdue ? t('Hand in late (−{p} points)', { p: hw.now.penalty }) : t('Hand in homework')}</Button>
              <p className="meta mt-2 text-center">{t('You can hand in once. Unanswered questions score 0.')}</p>
            </Card>
            <Scratchpad hint={t('Work things out here. Scroll inside the page for more room.')} />
          </aside>
        </div>
      )}

      {hw.review && (
        <ol className="mt-4 space-y-3">
          {hw.review.map((q) => (
            <Card key={q.index} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-neutral text-[12px] font-semibold">{q.index + 1}</span>
                <Badge tone="neutral">{LEVEL[q.level]}</Badge>
                {q.correct ? <Badge tone="success"><Check className="size-3" />Correct</Badge> : <Badge tone="critical"><X className="size-3" />{q.chosen === null ? 'Skipped' : 'Wrong'}</Badge>}
              </div>
              <p className="mt-2.5 text-[15px] font-medium">{q.prompt}</p>
              <p className="mt-2 text-[13.5px]"><span className="text-slate">Correct answer: </span><b className="font-semibold text-success">{q.options[q.answer]}</b>
                {!q.correct && q.chosen !== null && <span className="text-slate"> · You chose <span className="text-critical">{q.options[q.chosen]}</span></span>}</p>
              <p className="meta mt-1.5 text-[13px]">{q.explanation}</p>
            </Card>
          ))}
        </ol>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm} title="Hand in homework" className="max-w-[440px]">
        <div className="p-5">
          <h3 className="text-[16px]">Hand in now?</h3>
          <p className="mt-1.5 text-[14px] text-slate">You answered {done} of {hw.count} questions. You cannot change your answers afterwards.</p>
          {overdue && <p className="mt-3 rounded-field bg-critical-surface px-3 py-2 text-[13.5px] text-critical">This is late, so {hw.now.penalty} point{hw.now.penalty === 1 ? '' : 's'} will be deducted from your score.</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button>
            <Button onClick={submit} disabled={busy}>{busy ? 'Handing in…' : 'Hand in'}</Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
