import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Route, Search, XCircle } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import QuestionCard from '../components/QuestionCard';
import { Badge, Button, Card, CardHeader, ErrorBox, PageHeader, Select, Skeleton } from '../components/ui';
import { api, errorText } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { cn } from '../lib/utils';

export default function Diagnostic() {
  const nav = useNavigate();
  const { data: concepts, error, reload } = useFetch('/concepts');
  const [target, setTarget] = useState('');
  const [run, setRun] = useState(null); // { q, index, total, feedback, choice, result }
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/diagnostic/start', { targetId: chosen });
      setRun({ q: data.question, index: 0, total: data.total, choice: null, feedback: null, result: null, target: data.target });
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/diagnostic/answer', { questionId: run.q.id, choice: run.choice });
      setRun((r) => ({ ...r, feedback: data }));
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  const advance = () => setRun((r) => ({
    ...r, q: r.feedback.question ?? r.q, index: r.feedback.index, choice: null,
    result: r.feedback.result ?? null, feedback: null,
  }));

  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const chosen = concepts?.some((c) => c.id === target) ? target : concepts?.[concepts.length - 1]?.id;

  // ---------- result ----------
  if (run?.result) {
    const r = run.result;
    return (
      <Page className="max-w-3xl">
        <PageHeader title="Diagnostic result" description={`Check on ${r.target.name}`} />
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="num text-[34px] font-semibold leading-none tracking-[-0.02em]">{r.score.correct}/{r.score.total}</span>
            <span className="meta">questions correct</span>
          </div>
          <div className="mt-4 rounded-field border border-line bg-neutral p-4">
            {r.rootGaps.length ? (
              <>
                <p className="label">Root gap</p>
                <p className="mt-1 text-[16px] font-semibold">{r.rootGaps.map((g) => g.name).join(' and ')}</p>
                <p className="mt-1 text-[14px] text-slate">
                  This is where understanding first breaks down, so fixing it should repair the later steps too. A low score on {r.target.name} was a symptom, not the cause.
                </p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-semibold">No gaps found</p>
                <p className="mt-1 text-[14px] text-slate">You are ready to move forward on {r.target.name}.</p>
              </>
            )}
          </div>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="What we checked" />
            <ul className="divide-y divide-line px-5 pb-2 pt-1">
              {r.assessed.map((a) => (
                <li key={a.conceptId} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-[13.5px]">{a.name}</span>
                  {a.correct ? <Badge tone="success"><CheckCircle2 className="size-3" />Secure</Badge> : <Badge tone="critical"><XCircle className="size-3" />Gap</Badge>}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Your path" meta="Learn in this order" />
            <ol className="space-y-2 px-5 pb-5 pt-3">
              {r.path.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-primary-subtle text-[11.5px] font-semibold text-primary">{i + 1}</span>
                  <span className="text-[13.5px] font-medium">{p.name}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => nav(`/practice/${r.nextConcept}`)}>Start with {r.path[0].name} <ArrowRight /></Button>
          <Button variant="secondary" onClick={() => setRun(null)}>Check another topic</Button>
        </div>
      </Page>
    );
  }

  // ---------- question ----------
  if (run) {
    const fb = run.feedback;
    return (
      <Page className="max-w-3xl">
        <PageHeader title="Diagnostic" description={`Finding the real gap behind ${run.target.name}.`} />
        <div className="mb-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: run.total }).map((_, i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-200', i < run.index ? 'bg-primary' : i === run.index ? 'bg-primary/40' : 'bg-track')} />
            ))}
          </div>
          <span className="num meta">{run.index + 1} of {run.total}</span>
        </div>
        <Card className="p-5 sm:p-6">
          <Badge tone="neutral" className="mb-4">{run.q.conceptName}</Badge>
          <QuestionCard question={run.q} choice={run.choice} onChoose={(i) => setRun((r) => ({ ...r, choice: i }))} reveal={fb ? { correctIndex: fb.correctIndex } : null} />
          {fb && (
            <div className={cn('mt-5 rounded-field border p-3.5 text-[14px]', fb.correct ? 'border-success/30 bg-success-surface' : 'border-critical/25 bg-critical-surface')}>
              <p className={cn('font-medium', fb.correct ? 'text-success' : 'text-critical')}>{fb.correct ? 'Correct' : 'Not quite'}</p>
              <p className="mt-0.5 text-ink">{fb.explanation}</p>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            {fb ? <Button onClick={advance}>{fb.result ? 'See result' : 'Next question'} <ArrowRight /></Button>
              : <Button disabled={run.choice === null || busy} onClick={submit}>Check answer</Button>}
          </div>
        </Card>
      </Page>
    );
  }

  // ---------- intro ----------
  const grouped = concepts && [...new Set(concepts.map((c) => c.strand))].map((s) => ({ s, list: concepts.filter((c) => c.strand === s) }));
  return (
    <Page className="max-w-3xl">
      <PageHeader title="Diagnostic" description="A short check of 3 to 8 questions that traces a struggle back to the concept where it started, not just a score." />
      <Card className="p-5 sm:p-6">
        <label htmlFor="target" className="text-[13.5px] font-medium">Which topic is giving you trouble?</label>
        {concepts ? (
          <Select id="target" className="mt-2" value={chosen} onChange={(e) => setTarget(e.target.value)}>
            {grouped.map((g) => (
              <optgroup key={g.s} label={g.s}>{g.list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            ))}
          </Select>
        ) : <Skeleton className="mt-2 h-[42px]" />}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [Search, 'Probe', 'We start at your topic, then step back through the concepts it builds on.'],
            [Route, 'Trace', 'Wrong answers lead us to the earliest concept you have not secured.'],
            [CheckCircle2, 'Plan', 'You get an ordered path from the root gap back up to your topic.'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="rounded-field border border-line p-3.5">
              <Icon className="size-[18px] text-primary" strokeWidth={1.9} />
              <p className="mt-2 text-[13.5px] font-medium">{t}</p>
              <p className="meta mt-0.5">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6"><Button size="lg" onClick={start} disabled={busy || !concepts}>Start diagnostic <ArrowRight /></Button></div>
      </Card>
    </Page>
  );
}
