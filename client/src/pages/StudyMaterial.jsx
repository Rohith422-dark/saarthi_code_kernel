import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BookText, Download, ExternalLink, FileText } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui';
import { useT } from '../i18n';
import { downloadFile, errorText } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { ago, cn } from '../lib/utils';

const TYPES = ['Worksheet', 'Notes', 'Talking points', 'Parent summary'];
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function StudyMaterial() {
  const { t } = useT();
  const { data, error, loading, reload } = useFetch('/study-material');
  const [type, setType] = useState('all');
  const list = useMemo(() => (data || []).filter((r) => type === 'all' || r.type === type), [data, type]);
  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const get = async (r) => { try { await downloadFile(r.id, r.file.name); } catch (e) { toast.error(errorText(e)); } };

  return (
    <Page className="max-w-4xl">
      <PageHeader title={t('Study material')} description={t('Worksheets and notes your teacher has approved for your class.')} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['all', ...TYPES].map((k) => (
          <button key={k} onClick={() => setType(k)} aria-pressed={type === k} className={cn('rounded-full border px-3 py-1 text-[13px] font-medium transition-colors', type === k ? 'border-primary/50 bg-primary-subtle text-primary' : 'border-line hover:bg-neutral')}>
            {k === 'all' ? t('All') : t(k)}
          </button>
        ))}
      </div>
      <Card>
        {loading ? <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          : list.length === 0 ? <Empty icon={BookText} title={t('Nothing here yet')}>{t('Approved worksheets and notes will appear here.')}</Empty> : (
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary sm:grid"><FileText className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-[14.5px] font-semibold">{r.title}</p><Badge tone="neutral">{t(r.type)}</Badge></div>
                    <p className="meta mt-0.5">{r.conceptName} · {r.language} · {ago(r.updatedAt)}</p>
                    {r.description && <p className="mt-1 text-[13.5px] text-slate">{r.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {r.file && <Button variant="secondary" size="sm" onClick={() => get(r)}><Download />{t('Download')} · {kb(r.file.size)}</Button>}
                    {r.link && <Button variant="secondary" size="sm" onClick={() => window.open(r.link, '_blank', 'noopener,noreferrer')}><ExternalLink />{t('Open link')}</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </Page>
  );
}
