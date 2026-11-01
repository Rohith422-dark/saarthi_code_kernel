import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, Clock, Flag, X } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import QuestionCard from '../components/QuestionCard';
import Scratchpad from '../components/Scratchpad';
import { Badge, Bar, Button, Card, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { Dialog } from '../components/ui/overlay';
import { useT } from '../i18n';
import { api, errorText } from '../lib/api';
import { cn } from '../lib/utils';
import { mmss } from './Contests';

const SECTION_NAME = { A: 'Section A · 1 mark', B: 'Section B · 2 marks', C: 'Section C · 3 marks' };

function Result({ data, onBack, nav }) {
  const { t } = useT();
  const r = data.result;
  return (
    <Page className="max-w-4xl">
      <PageHeader title={t('Mock paper result')} description={t(r.label ?? (r.size === 'full' ? 'Full mock paper' : 'Quick test'))} />
      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div><p className="label">{t('Score')}</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{r.score}<span className="text-[16px] font-medium text-slate"> / {r.max}</span></p></div>
          <div><p className="label">{t('Percentage')}</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{Math.round(r.pct * 100)}%</p></div>
          <div><p className="label">{t('Time taken')}</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{mmss(r.timeSec)}</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {r.bySection.map((s) => (
            <div key={s.section} className="rounded-field border border-line p-3">
              <div className="flex justify-between text-[13px]"><span className="font-medium">{t(SECTION_NAME[s.section])}</span><span className="num">{s.score}/{s.max}</span></div>
              <Bar value={s.max ? s.score / s.max : 0} className="mt-2" label={s.section} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={onBack}>{t('Back to Exam centre')}</Button></div>
      </Card>

      <Card className="mt-4">
        <div className="px-5 pt-4"><h3>{t('Where to focus next')}</h3><p className="meta mt-0.5">{t('Topics where you answered fewer than 60% correctly')}</p></div>
        <ul className="divide-y divide-line px-5 pb-2 pt-2">
          {r.byConcept.map((c) => (
            <li key={c.conceptId} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.name}</span>
              <span className="num meta">{c.correct}/{c.total}</span>
              <Badge tone={c.correct / c.total >= 0.6 ? 'success' : 'critical'}>{c.correct / c.total >= 0.6 ? t('Secure') : t('Revise')}</Badge>
              {c.correct / c.total < 0.6 && <Button variant="ghost" size="sm" onClick={() => nav(`/practice/${c.conceptId}/easy`)}>{t('Practise')}</Button>}
            </li>
          ))}
        </ul>
      </Card>

      {data.review && (
        <ol className="mt-4 space-y-3">
          {data.review.map((q) => (
            <Card key={q.index} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-neutral text-[12px] font-semibold">{q.index + 1}</span>
                <Badge tone="neutral">{q.section} · {q.marks}</Badge>
                {q.correct ? <Badge tone="success"><Check className="size-3" />{t('Correct')}</Badge> : <Badge tone="critical"><X className="size-3" />{q.chosen === null ? t('Skipped') : t('Wrong')}</Badge>}
                <span className="meta">{q.concept}</span>
              </div>
              <p className="mt-2.5 text-[15px] font-medium">{q.prompt}</p>
              <p className="mt-2 text-[13.5px]"><span className="text-slate">{t('Correct answer')}: </span><b className="font-semibold text-success">{q.options[q.answer]}</b>
                {!q.correct && q.chosen !== null && <span className="text-slate"> · {t('You chose')} <span className="text-critical">{q.options[q.chosen]}</span></span>}</p>
              <p className="meta mt-1.5 text-[13px]">{q.explanation}</p>
            </Card>
          ))}
        </ol>
      )}
    </Page>
  );
}

function Running({ run, onDone }) {
  const { t } = useT();
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const deadline = useRef(Date.now() + run.remainingSec * 1000);
  const [sec, setSec] = useState(run.remainingSec);
  const sent = useRef(false);

  const submit = useCallback(async () => {
    if (sent.current) return;
    sent.current = true; setBusy(true);
    try { onDone((await api.post(`/mock/${run.id}/submit`, { answers })).data); }
    catch (e) { sent.current = false; toast.error(errorText(e)); setBusy(false); }
  }, [answers, onDone, run.id]);

  useEffect(() => {
    const id = setInterval(() => setSec(Math.max(0, Math.round((deadline.current - Date.now()) / 1000))), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (sec === 0) { toast(t('Time is up. Handing in your paper.')); submit(); } }, [sec, submit, t]);

  const q = run.questions[cur];
  const done = Object.keys(answers).length;
  return (
    <Page className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-[22px] sm:text-[24px]">{t(run.label)}</h1><p className="meta">{t('{n} of {total} answered', { n: done, total: run.questions.length })} · {run.maxMarks} {t('marks')}</p></div>
        <div className={cn('flex items-center gap-2 rounded-field border px-3.5 py-2 text-[18px] font-semibold tabular-nums', sec < 180 ? 'border-critical/40 bg-critical-surface text-critical' : 'border-line bg-surface')} role="timer" aria-label={t('Time left')}>
          <Clock className="size-[18px]" />{mmss(sec)}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary-subtle text-[12.5px] font-semibold text-primary">{cur + 1}</span>
              <Badge tone="neutral">{t(SECTION_NAME[q.section])}</Badge>
              <button onClick={() => setFlags((f) => ({ ...f, [cur]: !f[cur] }))} className={cn('ml-auto flex h-8 items-center gap-1.5 rounded-field px-2.5 text-[12.5px] font-medium transition-colors', flags[cur] ? 'bg-warning-surface text-warning' : 'text-slate hover:bg-neutral')}>
                <Flag className="size-3.5" />{flags[cur] ? t('Marked') : t('Mark for review')}
              </button>
            </div>
            <QuestionCard key={cur} question={q} choice={answers[cur] ?? null} onChoose={(i) => setAnswers((a) => ({ ...a, [cur]: i }))} />
            <div className="mt-6 flex items-center justify-between">
              <Button variant="secondary" disabled={cur === 0} onClick={() => setCur(cur - 1)}><ArrowLeft />{t('Previous')}</Button>
              {cur < run.questions.length - 1 ? <Button onClick={() => setCur(cur + 1)}>{t('Next')} <ArrowRight /></Button> : <Button onClick={() => setConfirm(true)}>{t('Hand in paper')}</Button>}
            </div>
          </Card>
          {run.questions.map((_, i) => <Scratchpad key={i} hint={t('Your rough work for this question stays here while you move around.')} className={i === cur ? '' : 'hidden'} />)}
        </div>
        <Card className="h-fit p-4">
          <p className="label mb-2.5">{t('Questions')}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {run.questions.map((qq, i) => (
              <button key={i} onClick={() => setCur(i)} aria-label={`${i + 1}`} className={cn('relative grid h-9 place-items-center rounded-field border text-[13px] font-medium tabular-nums transition-colors duration-150', i === cur ? 'border-primary bg-primary text-white' : answers[i] !== undefined ? 'border-primary/40 bg-primary-subtle text-primary' : 'border-line hover:bg-neutral')}>
                {i + 1}{flags[i] && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#D97706]" />}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => setConfirm(true)}>{t('Hand in paper')}</Button>
        </Card>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm} title={t('Hand in paper')} className="max-w-[440px]">
        <div className="p-5">
          <h3 className="text-[16px]">{t('Hand in your paper?')}</h3>
          <p className="mt-1.5 text-[14px] text-slate">{t('You answered {n} of {total} questions. You can only hand in once.', { n: done, total: run.questions.length })}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>{t('Keep working')}</Button>
            <Button onClick={submit} disabled={busy}>{t('Hand in')}</Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

export default function MockExam() {
  const { id } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setState(null); setError(''); api.get(`/mock/${id}`).then((r) => setState(r.data)).catch((e) => setError(errorText(e))); }, [id]);
  if (error) return <Page><ErrorBox message={error} /></Page>;
  if (!state) return <Page className="max-w-3xl"><Skeleton className="h-64" /></Page>;
  if (state.status === 'done') return <Result data={state} nav={nav} onBack={() => nav('/exams')} />;
  return <Running run={state} onDone={(d) => setState(d)} />;
}
