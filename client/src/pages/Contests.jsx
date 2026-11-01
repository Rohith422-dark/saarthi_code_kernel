import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, ListChecks, Trophy, Users } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { useT } from '../i18n';
import { useFetch } from '../lib/useFetch';

export const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const left = (iso) => {
  const h = Math.max(0, Math.round((new Date(iso) - Date.now()) / 3600000));
  return h >= 48 ? `${Math.round(h / 24)} days` : `${h} hours`;
};

export default function Contests() {
  const { t } = useT();
  const nav = useNavigate();
  const { data, error, loading, reload } = useFetch('/contests');
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const live = data?.find((c) => c.status === 'live');
  const past = (data || []).filter((c) => c.status === 'ended');

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title={t('Contests')} description={t('One paper, written by every learner in the class. Contest points decide your place on the leaderboard.')}
        action={<Button variant="secondary" onClick={() => nav('/leaderboard')}><Trophy />{t('Leaderboard')}</Button>}
      />

      {loading || !data ? <Skeleton className="h-52" /> : live ? (
        <Card className="border-primary/30 bg-primary-tint">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="success" dot>{t('Live')}</Badge><span className="meta">{t('Closes in')} {left(live.endsAt)}</span></div>
            <h2 className="mt-2 text-[22px]">{live.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-slate">
              <span className="flex items-center gap-1.5"><ListChecks className="size-4" />{live.questions} {t('questions')}: {t('4 easy, 4 medium, 2 hard')}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4" />{live.durationMin} {t('minutes once you start')}</span>
              <span className="flex items-center gap-1.5"><Trophy className="size-4" />{live.maxScore} {t('points')}: {t('10, 20, 30 per question')}</span>
              <span className="flex items-center gap-1.5"><Users className="size-4" />{live.participants} {t('submitted')}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {live.mine ? (
                <>
                  <Button onClick={() => nav(`/contests/${live.id}`)}>{t('View my result')} <ArrowRight /></Button>
                  <span className="text-[14px]">{t('You scored')} <b className="num font-semibold">{live.mine.score}</b> / {live.maxScore} · {t('rank')} <b className="num font-semibold">{live.mine.rank}</b> / {live.participants}</span>
                </>
              ) : (
                <>
                  <Button size="lg" onClick={() => nav(`/contests/${live.id}`)}>{live.inProgress ? t('Resume contest') : t('Start contest')} <ArrowRight /></Button>
                  <span className="meta">{t('You can attempt it once. The timer starts when you press start.')}</span>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : <Card><Empty icon={Trophy} title={t('No contest is live')}>{t('The next contest will appear here when it opens.')}</Empty></Card>}

      <Card className="mt-4">
        <CardHeader title={t('Past contests')} />
        {past.length === 0 ? <Empty title="Nothing yet" /> : (
          <ul className="divide-y divide-line px-5 pb-2 pt-1">
            {past.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{c.title}</p>
                  <p className="meta">Ended {day(c.endsAt)} · {c.participants} took part</p>
                </div>
                {c.mine ? <span className="text-[13.5px]"><b className="num font-semibold">{c.mine.score}</b><span className="text-slate"> / {c.maxScore} · rank {c.mine.rank}</span></span> : <Badge tone="neutral">{t('Not taken')}</Badge>}
                {c.mine && <Button variant="ghost" size="sm" onClick={() => nav(`/contests/${c.id}`)}>{t('Review')}</Button>}
                <Button variant="ghost" size="sm" onClick={() => nav(`/leaderboard?contest=${c.id}`)}>{t('Results')}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
