import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, Clock, Flag, Trophy, X } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import QuestionCard from '../components/QuestionCard';
import Scratchpad from '../components/Scratchpad';
import { Badge, Button, Card, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { Dialog } from '../components/ui/overlay';
import { mmss } from './Contests';
import { api, errorText } from '../lib/api';
import { cn } from '../lib/utils';

const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

function Result({ r, onBoard, onBack }) {
  return (
    <Page className="max-w-3xl">
      <PageHeader title="Contest result" description="Your answers are locked in. Here is how you did." />
      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div><p className="label">Score</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{r.score}<span className="text-[16px] font-medium text-slate"> / {r.maxScore}</span></p></div>
          <div><p className="label">Rank</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{r.rank}<span className="text-[16px] font-medium text-slate"> of {r.participants}</span></p></div>
          <div><p className="label">Correct</p><p className="num mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{r.correct}<span className="text-[16px] font-medium text-slate"> / {r.total}</span></p><p className="meta mt-1">in {mmss(r.timeSec)}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onBoard}><Trophy />See leaderboard</Button>
          <Button variant="secondary" onClick={onBack}>All contests</Button>
        </div>
      </Card>

      {r.review ? (
        <ol className="mt-4 space-y-3">
          {r.review.map((q) => (
            <Card key={q.index} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-neutral text-[12px] font-semibold">{q.index + 1}</span>
                <Badge tone="neutral">{LEVEL[q.level]} · {q.points} pts</Badge>
                {q.correct ? <Badge tone="success"><Check className="size-3" />Correct</Badge> : <Badge tone="critical"><X className="size-3" />{q.chosen === null ? 'Skipped' : 'Wrong'}</Badge>}
                <span className="meta">{q.concept}</span>
              </div>
              <p className="mt-2.5 text-[15px] font-medium">{q.prompt}</p>
              <p className="mt-2 text-[13.5px]">
                <span className="text-slate">Correct answer: </span><b className="font-semibold text-success">{q.options[q.answer]}</b>
                {!q.correct && q.chosen !== null && <span className="text-slate"> · You chose <span className="text-critical">{q.options[q.chosen]}</span></span>}
              </p>
              <p className="meta mt-1.5 text-[13px]">{q.explanation}</p>
            </Card>
          ))}
        </ol>
      ) : <p className="meta mt-4">A question-by-question review is not available for this contest.</p>}
    </Page>
  );
}

function Running({ run, onDone }) {
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
    try { onDone((await api.post(`/contests/${run.id}/submit`, { answers })).data); }
    catch (e) { sent.current = false; toast.error(errorText(e)); setBusy(false); }
  }, [answers, onDone, run.id]);

  useEffect(() => {
    const t = setInterval(() => setSec(Math.max(0, Math.round((deadline.current - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (sec === 0) { toast('Time is up. Submitting your answers.'); submit(); } }, [sec, submit]);

  const q = run.questions[cur];
  const done = Object.keys(answers).length;
  return (
    <Page className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-[22px] sm:text-[24px]">{run.title}</h1><p className="meta">{done} of {run.questions.length} answered</p></div>
        <div className={cn('flex items-center gap-2 rounded-field border px-3.5 py-2 text-[18px] font-semibold tabular-nums', sec < 120 ? 'border-critical/40 bg-critical-surface text-critical' : 'border-line bg-surface')} role="timer" aria-label="Time left">
          <Clock className="size-[18px]" />{mmss(sec)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary-subtle text-[12.5px] font-semibold text-primary">{cur + 1}</span>
              <Badge tone="neutral">{LEVEL[q.level]} · {q.points} pts</Badge>
              <button onClick={() => setFlags((f) => ({ ...f, [cur]: !f[cur] }))} className={cn('ml-auto flex h-8 items-center gap-1.5 rounded-field px-2.5 text-[12.5px] font-medium transition-colors', flags[cur] ? 'bg-warning-surface text-warning' : 'text-slate hover:bg-neutral')}>
                <Flag className="size-3.5" />{flags[cur] ? 'Marked' : 'Mark for review'}
              </button>
            </div>
            <QuestionCard key={cur} question={q} choice={answers[cur] ?? null} onChoose={(i) => setAnswers((a) => ({ ...a, [cur]: i }))} />
            <div className="mt-6 flex items-center justify-between">
              <Button variant="secondary" disabled={cur === 0} onClick={() => setCur(cur - 1)}><ArrowLeft />Previous</Button>
              {cur < run.questions.length - 1
                ? <Button onClick={() => setCur(cur + 1)}>Next <ArrowRight /></Button>
                : <Button onClick={() => setConfirm(true)}>Submit contest</Button>}
            </div>
          </Card>
          {run.questions.map((_, i) => <Scratchpad key={i} hint="Your rough work for this question stays here while you move around." className={i === cur ? '' : 'hidden'} />)}
        </div>

        <Card className="h-fit p-4">
          <p className="label mb-2.5">Questions</p>
          <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-5">
            {run.questions.map((_, i) => (
              <button
                key={i} onClick={() => setCur(i)} aria-label={`Question ${i + 1}${answers[i] !== undefined ? ', answered' : ''}`}
                className={cn(
                  'relative grid h-9 place-items-center rounded-field border text-[13px] font-medium tabular-nums transition-colors duration-150',
                  i === cur ? 'border-primary bg-primary text-white' : answers[i] !== undefined ? 'border-primary/40 bg-primary-subtle text-primary' : 'border-line hover:bg-neutral',
                )}
              >
                {i + 1}
                {flags[i] && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#D97706]" />}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => setConfirm(true)}>Submit contest</Button>
        </Card>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm} title="Submit contest" className="max-w-[440px]">
        <div className="p-5">
          <h3 className="text-[16px]">Submit your answers?</h3>
          <p className="mt-1.5 text-[14px] text-slate">
            You answered {done} of {run.questions.length} questions{Object.values(flags).some(Boolean) ? ' and marked some for review' : ''}. You can only submit once.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button>
            <Button onClick={submit} disabled={busy}>Submit</Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

export default function ContestRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    setState({ phase: 'loading' });
    Promise.all([api.get('/contests'), api.get(`/contests/${id}/me`).then((r) => r.data).catch(() => null)])
      .then(([list, mine]) => {
        const meta = list.data.find((c) => c.id === id);
        if (!meta) return setState({ phase: 'error', error: 'Contest not found' });
        setState(mine ? { phase: 'result', result: mine } : { phase: 'intro', meta });
      })
      .catch((e) => setState({ phase: 'error', error: errorText(e) }));
  }, [id]);

  const start = async () => {
    try { setState({ phase: 'running', run: (await api.post(`/contests/${id}/start`)).data }); }
    catch (e) { toast.error(errorText(e)); }
  };

  if (state.phase === 'loading') return <Page className="max-w-3xl"><Skeleton className="h-64" /></Page>;
  if (state.phase === 'error') return <Page><ErrorBox message={state.error} /></Page>;
  if (state.phase === 'result') return <Result r={state.result} onBoard={() => nav(`/leaderboard?contest=${id}`)} onBack={() => nav('/contests')} />;
  if (state.phase === 'running') return <Running run={state.run} onDone={(result) => { setState({ phase: 'result', result }); toast.success('Contest submitted'); }} />;

  const m = state.meta;
  return (
    <Page className="max-w-2xl">
      <PageHeader title={m.title} description="Read the rules, then start when you are ready." />
      <Card className="p-5 sm:p-6">
        <ul className="space-y-2.5 text-[14.5px]">
          <li>{m.questions} questions: 4 easy (10 points), 4 medium (20 points), 2 hard (30 points). Maximum {m.maxScore}.</li>
          <li>You have {m.durationMin} minutes from the moment you press start. Answers are submitted automatically when time runs out.</li>
          <li>You can attempt this contest once. Wrong answers do not lose points.</li>
          <li>Use the rough work page under each question. Ties are broken by the time you take.</li>
        </ul>
        <div className="mt-6 flex gap-2">
          {m.status === 'live'
            ? <Button size="lg" onClick={start}>{m.inProgress ? 'Resume contest' : 'Start contest'} <ArrowRight /></Button>
            : <Badge tone="neutral">This contest is {m.status === 'ended' ? 'over and you did not take it' : 'not open yet'}</Badge>}
          <Button size="lg" variant="secondary" onClick={() => nav('/contests')}>Back</Button>
        </div>
      </Card>
    </Page>
  );
}
