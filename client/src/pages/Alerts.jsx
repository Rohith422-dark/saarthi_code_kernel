import { useState } from 'react';
import { Page } from '../components/layout/Shell';
import LearnerSheet from '../components/LearnerSheet';
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useFetch } from '../lib/useFetch';
import { BellRing } from 'lucide-react';

export default function Alerts() {
  const { grade } = useApp();
  const { data, error, loading, reload } = useFetch(`/teacher/overview?grade=${grade}`);
  const [learner, setLearner] = useState(null);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  return (
    <Page className="max-w-4xl">
      <PageHeader title="Alerts" description="Learners who may be struggling without saying so." />
      <Card>
        {loading || !data ? <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          : data.alerts.length === 0 ? <Empty icon={BellRing} title="No alerts">Everyone is active and progressing.</Empty> : (
            <ul className="divide-y divide-line">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={a.severity === 'critical' ? 'critical' : 'warning'} dot>{a.type}</Badge>
                      <span className="text-[14px] font-medium">{a.student}</span>
                    </div>
                    <p className="meta mt-1.5 text-[13.5px]">{a.message}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setLearner(a.studentId)}>View learner</Button>
                </li>
              ))}
            </ul>
          )}
      </Card>
      <LearnerSheet id={learner} onClose={() => setLearner(null)} />
    </Page>
  );
}
