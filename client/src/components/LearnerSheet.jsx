import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Heatmap from './Heatmap';
import { Sheet } from './ui/overlay';
import { Badge, Button, MasteryBar, Skeleton, StatusBadge } from './ui';
import { useFetch } from '../lib/useFetch';
import { ago, pct } from '../lib/utils';

const GROUP = { needs: ['critical', 'Needs revision'], on_track: ['neutral', 'On track'], ready: ['success', 'Ready to advance'] };

export default function LearnerSheet({ id, onClose }) {
  const nav = useNavigate();
  const { data } = useFetch(id ? `/teacher/students/${id}` : '/health');
  const d = id && data?.concepts ? data : null;
  const [tone, label] = d ? GROUP[d.group] : [];
  return (
    <Sheet
      width="sm:max-w-[640px]" open={!!id} onOpenChange={(o) => !o && onClose()} title={d?.name ?? 'Learner'}
      description={d && <span className="flex flex-wrap items-center gap-2"><Badge tone={tone}>{label}</Badge><span>Active {ago(d.lastActiveAt)}</span><span>· {d.streak} day streak</span></span>}
    >
      {!d ? (
        <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="p-5">
          <Button className="mb-4 w-full" onClick={() => { onClose(); nav(`/messages?thread=dm:${d.id}`); }}><MessageCircle />Message {d.name}</Button>
          <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[['Contest rank', `#${d.rank}`], ['Contest points', d.contestPoints], ['Problems solved', d.problemsSolved]].map(([k, v]) => (
              <div key={k} className="rounded-field bg-neutral py-2"><dd className="num text-[17px] font-semibold">{v}</dd><dt className="meta text-[11.5px]">{k}</dt></div>
            ))}
          </dl>
          <p className="meta mb-4">Practice solved: {d.solvedByLevel[1]} easy · {d.solvedByLevel[2]} medium · {d.solvedByLevel[3]} hard</p>
          <div className="mb-4 rounded-field border border-line p-3.5 text-[13.5px]">
            <p className="label">Homework</p>
            <p className="mt-1"><b className="num font-semibold">{d.homework.points}</b> points · {d.homework.onTime} on time · {d.homework.late} late
              {d.homework.overdue > 0 && <span className="text-warning"> · {d.homework.overdue} overdue</span>}
              {d.homework.missing > 0 && <span className="text-critical"> · {d.homework.missing} missing</span>}</p>
          </div>
          {d.exam && (
            <div className="mb-4 rounded-field border border-line p-3.5 text-[13.5px]">
              <p className="label">Exam readiness</p>
              <p className="mt-1"><b className="num font-semibold">{d.exam.score}%</b> · mastery {d.exam.mastery}% · mock papers {d.exam.mocks === null ? 'none yet' : `${d.exam.mocks}%`}{d.exam.stress >= 4 && <span className="text-critical"> · feeling stressed ({d.exam.stress} of 5)</span>}</p>
            </div>
          )}
          <div className="rounded-field border border-line bg-neutral p-3.5 text-[13.5px]">
            <p className="label">Suggested next step</p>
            <p className="mt-1">{d.recommended.reason}</p>
          </div>
          <p className="label mb-2 mt-5">Learning activity</p>
          <Heatmap data={d.activity} unit="questions" />
          <p className="label mb-1 mt-5">Concept mastery · average {pct(d.avg)}</p>
          <ul className="divide-y divide-line">
            {d.concepts.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.name}</span>
                <MasteryBar value={c.mastery} className="w-20" />
                <span className="num w-9 text-right text-[12.5px] font-medium">{pct(c.mastery)}</span>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
