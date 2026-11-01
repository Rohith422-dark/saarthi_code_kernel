import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Award, Lock, PartyPopper, TrendingDown, TrendingUp } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import QuestionCard from '../components/QuestionCard';
import Scratchpad from '../components/Scratchpad';
import { Badge, Button, Card, CardHeader, ErrorBox, MasteryBar, PageHeader, Skeleton, StatusBadge } from '../components/ui';
import { api, errorText } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useFetch } from '../lib/useFetch';
import { useT } from '../i18n';
import { cn, pct } from '../lib/utils';

export const LEVELS = [
  { id: 1, slug: 'easy', name: 'Easy', hint: 'Build the basics' },
  { id: 2, slug: 'medium', name: 'Medium', hint: 'Apply the idea' },
  { id: 3, slug: 'hard', name: 'Hard', hint: 'Stretch yourself' },
];
const bySlug = Object.fromEntries(LEVELS.map((l) => [l.slug, l]));

function Picker() {
  const { t } = useT();
  const nav = useNavigate();
  const { data, error, loading, reload } = useFetch('/concepts');
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const strands = data && [...new Set(data.map((c) => c.strand))];
  return (
    <Page>
      <PageHeader title={t('Practice')} description={t('Pick a concept, then a level. Every problem is freshly generated, so you can keep practising as long as you like.')} />
      {loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : (
        <div className="space-y-8">
          {strands.map((strand) => (
            <section key={strand}>
              <h2 className="mb-3 text-[16px]">{t(strand)}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.filter((c) => c.strand === strand).map((c) => (
                  <Card key={c.id} className={cn('p-4', c.locked && 'bg-neutral/60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="code">{c.code}</p>
                        <p className="mt-0.5 text-[15px] font-semibold leading-snug">{c.name}</p>
                      </div>
                      {c.locked ? <Badge tone="neutral"><Lock className="size-3" />{t('Locked')}</Badge> : <StatusBadge status={c.status} />}
                    </div>
                    <div className="mt-2.5 flex items-center gap-3"><MasteryBar value={c.mastery} /><span className="num meta w-9 text-right">{pct(c.mastery)}</span></div>
                    {c.locked && <p className="meta mt-2">{t('Strengthen the earlier concepts first.')}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {LEVELS.map((l) => (
                        <button
                          key={l.id} disabled={c.locked}
                          onClick={() => nav(`/practice/${c.id}/${l.slug}`)}
                          className={cn(
                            'rounded-field border border-line px-2.5 py-2 text-left transition-colors duration-150',
                            c.locked ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/50 hover:bg-primary-tint',
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <span className="flex gap-0.5" aria-hidden>
                              {[1, 2, 3].map((i) => <span key={i} className={cn('h-2.5 w-1 rounded-full', i <= l.id ? 'bg-primary' : 'bg-track')} />)}
                            </span>
                            {t(l.name)}
                          </span>
                          <span className="num meta mt-0.5 block text-[12px]">{c.solved[l.id]} {t('solved')}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

function Session({ conceptId, levelSlug }) {
  const { t } = useT();
  const nav = useNavigate();
  const { version } = useApp();
  const [state, setState] = useState({ loading: true });
  const [choice, setChoice] = useState(null);
  const [fb, setFb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ n: 0, ok: 0 });

  const load = useCallback(() => {
    setChoice(null); setFb(null);
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get('/practice/next', { params: { conceptId, level: bySlug[levelSlug]?.id } })
      .then((r) => setState({ ...r.data, loading: false }))
      .catch((e) => setState({ loading: false, error: errorText(e) }));
  }, [conceptId, levelSlug]);
  useEffect(() => { setTally({ n: 0, ok: 0 }); load(); }, [load, version]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/practice/answer', { questionId: state.question.id, choice });
      setFb(data);
      setTally((t) => ({ n: t.n + 1, ok: t.ok + (data.correct ? 1 : 0) }));
      data.newBadges.forEach((b) => toast.success(`Badge earned: ${b.name}`, { icon: '🏅' }));
      if (data.masteredNow) toast.success(`${state.concept.name} mastered`);
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  if (state.error) return <Page><ErrorBox message={state.error} onRetry={load} /></Page>;
  if (state.loading && !state.concept) return <Page className="max-w-3xl"><Skeleton className="h-8 w-60" /><Skeleton className="mt-6 h-72" /></Page>;

  if (state.locked) {
    const b = state.blockers[0];
    return (
      <Page className="max-w-2xl">
        <PageHeader title={state.concept.name} description="This concept is locked for now." />
        <Card className="p-6">
          <span className="grid size-10 place-items-center rounded-full bg-neutral text-slate"><Lock className="size-5" /></span>
          <p className="mt-3 text-[15px] font-medium">Strengthen {state.blockers.map((x) => x.name).join(' and ')} first</p>
          <p className="mt-1 text-[14px] text-slate">{state.concept.name} builds on {b.name}, where you are at {pct(b.mastery)}. Reach 50% there and this concept opens up.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => nav(`/practice/${b.id}`)}>Revisit {b.name} <ArrowRight /></Button>
            <Button variant="secondary" onClick={() => nav('/path')}>See learning path</Button>
          </div>
        </Card>
      </Page>
    );
  }

  const m = fb ? fb.mastery.after : state.mastery;
  const delta = fb ? fb.mastery.after - fb.mastery.before : 0;
  return (
    <Page className="max-w-5xl">
      <PageHeader
        title={state.concept.name}
        description="Answer, check, and learn from the explanation. Saarthi adjusts the next question for you."
        meta={<span className="code">{state.concept.code}</span>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex rounded-field border border-line p-0.5" role="group" aria-label="Level">
              {LEVELS.map((l) => (
                <button
                  key={l.id} onClick={() => nav(`/practice/${conceptId}/${l.slug}`, { replace: true })} aria-pressed={state.level === l.id}
                  className={cn('h-7 rounded-md px-3 text-[12.5px] font-medium transition-colors duration-150', state.level === l.id ? 'bg-primary-subtle text-primary' : 'text-slate hover:text-ink')}
                >{t(l.name)}</button>
              ))}
            </div>
            <span className="meta">{t('Question')} {tally.n + (fb ? 0 : 1)}</span>
          </div>
          {state.loading ? <Skeleton className="h-60" /> : (
            <QuestionCard question={state.question} choice={choice} onChoose={setChoice} reveal={fb ? { correctIndex: fb.correctIndex } : null} />
          )}
          {fb && (
            <div className={cn('mt-5 rounded-field border p-3.5 text-[14px]', fb.correct ? 'border-success/30 bg-success-surface' : 'border-critical/25 bg-critical-surface')}>
              <p className={cn('font-medium', fb.correct ? 'text-success' : 'text-critical')}>{fb.correct ? t('Correct') : t('Not quite')}</p>
              <p className="mt-0.5">{fb.explanation}</p>
            </div>
          )}
          {fb?.hint && (
            <div className="mt-3 rounded-field border border-[#f3d9b1] bg-warning-surface p-3.5 text-[14px]">
              <p className="font-medium text-warning">Stuck? The gap may be earlier.</p>
              <p className="mt-0.5">{fb.hint.name} is at {pct(fb.hint.mastery)} and this concept builds on it.</p>
              <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => nav(`/practice/${fb.hint.conceptId}`)}>Revisit {fb.hint.name}</Button>
            </div>
          )}
          {fb?.suggest && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-field border border-primary/30 bg-primary-tint p-3.5 text-[14px]">
              <p>{fb.suggest.level > fb.level ? 'Three solid answers in a row.' : 'A few misses in a row.'} Try <b className="font-semibold">{fb.suggest.name}</b>?</p>
              <Button size="sm" variant="subtle" onClick={() => nav(`/practice/${conceptId}/${LEVELS[fb.suggest.level - 1].slug}`, { replace: true })}>Switch to {fb.suggest.name}</Button>
            </div>
          )}
          {fb?.masteredNow && (
            <div className="mt-3 flex items-start gap-3 rounded-field border border-primary/30 bg-primary-tint p-3.5 text-[14px]">
              <PartyPopper className="mt-0.5 size-[18px] shrink-0 text-primary" />
              <div>
                <p className="font-medium text-primary">{t('Concept mastered')}</p>
                {fb.unlocked.length > 0 && <p className="mt-0.5">Unlocked: {fb.unlocked.map((u) => u.name).join(', ')}.</p>}
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            {fb ? <Button onClick={load}>{t('Next question')} <ArrowRight /></Button>
              : <Button disabled={choice === null || busy || state.loading} onClick={submit}>{t('Check answer')}</Button>}
          </div>
        </Card>
        {!state.loading && <Scratchpad key={state.question.id} />}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('Mastery')} />
            <div className="p-5 pt-3">
              <div className="flex items-end justify-between">
                <span className="num text-[30px] font-semibold leading-none tracking-[-0.02em]">{pct(m)}</span>
                {fb && Math.abs(delta) >= 0.005 && (
                  <span className={cn('flex items-center gap-1 text-[13px] font-medium', delta > 0 ? 'text-success' : 'text-critical')}>
                    {delta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{delta > 0 ? '+' : ''}{Math.round(delta * 100)}
                  </span>
                )}
              </div>
              <MasteryBar value={m} className="mt-3" />
              <p className="meta mt-2">{t('Mastered at 80%. Gap below 40%.')}</p>
            </div>
          </Card>
          <Card>
            <CardHeader title={t('This session')} />
            <dl className="grid grid-cols-2 gap-3 p-5 pt-3">
              <div><dt className="label">{t('Answered')}</dt><dd className="num mt-0.5 text-[20px] font-semibold">{tally.n}</dd></div>
              <div><dt className="label">{t('Correct')}</dt><dd className="num mt-0.5 text-[20px] font-semibold">{tally.ok}</dd></div>
              <div className="col-span-2 border-t border-line pt-3">
                <dt className="label mb-1.5">{t('Solved at each level')}</dt>
                <dd className="grid grid-cols-3 gap-2 text-center">
                  {LEVELS.map((l) => <div key={l.id} className="rounded-field bg-neutral py-1.5"><p className="num text-[16px] font-semibold">{(fb?.solved ?? state.solved)[l.id]}</p><p className="meta text-[11.5px]">{t(l.name)}</p></div>)}
                </dd>
              </div>
              {fb && <div className="col-span-2 flex items-center gap-2 text-[13px] text-slate"><Award className="size-4 text-primary" />{fb.xp} XP · {fb.streak} day streak</div>}
            </dl>
          </Card>
          <Link to="/practice" className="block text-center text-[13px] font-medium text-primary hover:text-primary-hover">{t('Choose another concept')}</Link>
        </div>
      </div>
    </Page>
  );
}

export default function Practice() {
  const { conceptId, level } = useParams();
  return conceptId ? <Session key={conceptId} conceptId={conceptId} levelSlug={level} /> : <Picker />;
}
