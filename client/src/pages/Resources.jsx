import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Check, Download, ExternalLink, FileText, Link2, Plus, Search, Trash2, Upload, UserRound } from 'lucide-react';
import { Page } from '../components/layout/Shell';
import Pager, { td, th } from '../components/Pager';
import { Badge, Button, Card, Empty, ErrorBox, Input, PageHeader, Select, Skeleton, StatusBadge, Textarea } from '../components/ui';
import { Dialog } from '../components/ui/overlay';
import { useApp } from '../context/AppContext';
import { api, downloadFile, errorText } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { ago } from '../lib/utils';

const SIZE = 8;
const TYPES = ['Worksheet', 'Talking points', 'Parent summary', 'Notes'];
const MAX = 3 * 1024 * 1024;
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('Could not read that file.'));
  r.readAsDataURL(file);
});

function AddResource({ open, onOpenChange, onCreated }) {
  const { grade } = useApp();
  const concepts = useFetch(`/teacher/concepts?grade=${grade}`);
  const blank = () => ({ title: '', type: 'Worksheet', conceptId: concepts.data?.[0]?.id ?? '', language: 'English', status: 'Approved', description: '', link: '' });
  const [f, setF] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  useEffect(() => { if (open) { setF(blank()); setFile(null); setError(''); } }, [open, concepts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pick = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > MAX) { setError('Files can be up to 3 MB.'); e.target.value = ''; return; }
    setError(''); setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...f, grade, file: file ? { name: file.name, data: await toBase64(file) } : null };
      await api.post('/resources', body);
      toast.success('Resource added');
      onOpenChange(false); onCreated();
    } catch (err) { setError(err.response ? errorText(err) : err.message); } finally { setBusy(false); }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-[13px] font-medium">{children}</label>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add a resource" className="top-[5vh] max-h-[90vh] overflow-y-auto">
      <form onSubmit={submit} className="p-5">
        <h3 className="text-[17px]">Add a resource · Class {grade}</h3>
        <p className="meta mt-1">Upload a worksheet or notes, or share a link. Learners in this class see it once it is approved.</p>
        <div className="mt-4 space-y-3.5">
          <div><L id="rs-title">Title</L><Input id="rs-title" className="mt-1.5" value={f.title} onChange={set('title')} maxLength={100} placeholder="e.g. Fractions: mixed practice" autoFocus /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><L id="rs-type">Kind</L><Select id="rs-type" className="mt-1.5" value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></div>
            <div><L id="rs-topic">Topic</L><Select id="rs-topic" className="mt-1.5" value={f.conceptId} onChange={set('conceptId')}>{(concepts.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><L id="rs-lang">Language</L><Select id="rs-lang" className="mt-1.5" value={f.language} onChange={set('language')}>{['English', 'Hindi', 'Telugu'].map((l) => <option key={l}>{l}</option>)}</Select></div>
            <div><L id="rs-status">Status</L><Select id="rs-status" className="mt-1.5" value={f.status} onChange={set('status')}>{['Draft', 'Pending review', 'Approved'].map((l) => <option key={l}>{l}</option>)}</Select></div>
          </div>
          <div>
            <L id="rs-file">File <span className="font-normal text-slate">(PDF, Word, image or text, up to 3 MB)</span></L>
            <input ref={input} id="rs-file" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={pick} />
            <div className="mt-1.5 flex items-center gap-2.5 rounded-field border border-dashed border-line p-3">
              <Upload className="size-4 shrink-0 text-slate" />
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{file ? <>{file.name} <span className="meta">· {kb(file.size)}</span></> : <span className="text-faint">No file chosen</span>}</span>
              {file && <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (input.current) input.current.value = ''; }}>Remove</Button>}
              <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>{file ? 'Change' : 'Choose file'}</Button>
            </div>
          </div>
          <div><L id="rs-link">Link <span className="font-normal text-slate">(optional)</span></L><Input id="rs-link" className="mt-1.5" value={f.link} onChange={set('link')} placeholder="https://" inputMode="url" /></div>
          <div><L id="rs-desc">Description <span className="font-normal text-slate">(optional)</span></L><Textarea id="rs-desc" rows={3} className="mt-1.5 w-full" value={f.description} onChange={set('description')} maxLength={600} placeholder="What is this for, and how should learners use it?" /></div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-field bg-critical-surface px-3 py-2 text-[13px] text-critical">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={busy || !f.title.trim() || !f.conceptId}>{busy ? 'Adding…' : 'Add resource'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function Resources() {
  const { grade } = useApp();
  const { data, error, loading, reload, setData } = useFetch(`/resources?grade=${grade}`);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [lang, setLang] = useState('all');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const rows = useMemo(() => (data || []).filter((r) =>
    (status === 'all' || r.status === status) && (type === 'all' || r.type === type) && (lang === 'all' || r.language === lang)
    && `${r.title} ${r.code} ${r.conceptName}`.toLowerCase().includes(q.toLowerCase())), [data, q, status, type, lang]);
  const pages = Math.max(1, Math.ceil(rows.length / SIZE));
  const p = Math.min(page, pages - 1);
  const view = rows.slice(p * SIZE, p * SIZE + SIZE);

  const mark = async (r, next) => {
    try {
      const { data: updated } = await api.patch(`/resources/${r.id}`, { status: next });
      setData(data.map((x) => (x.id === r.id ? updated : x)));
      toast.success(next === 'Approved' ? `Approved ${r.code}` : `${r.code} marked ${next.toLowerCase()}`);
    } catch (e) { toast.error(errorText(e)); }
  };
  const remove = async (r) => {
    try { await api.delete(`/resources/${r.id}`); setData(data.filter((x) => x.id !== r.id)); toast.success(`Deleted ${r.code}`); }
    catch (e) { toast.error(errorText(e)); } finally { setConfirm(null); }
  };
  const get = async (r) => { try { await downloadFile(r.id, r.file.name); } catch (e) { toast.error(errorText(e)); } };

  if (error) return <Page><ErrorBox message={error} onRetry={reload} /></Page>;
  const pending = (data || []).filter((r) => r.status === 'Pending review').length;

  return (
    <Page>
      <PageHeader
        title="Resources" description="Worksheets, notes, talking points and parent summaries for this class. AI drafts reach learners only after you approve them."
        meta={<span>Class {grade} · {pending} awaiting your review</span>}
        action={<Button onClick={() => setAdding(true)}><Plus />Add resource</Button>}
      />
      <Card>
        <div className="flex flex-col gap-2.5 border-b border-line p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input className="pl-9" placeholder="Search title, code or topic" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search resources" />
          </div>
          <Select className="lg:w-44" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} aria-label="Kind"><option value="all">All kinds</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Select className="lg:w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status"><option value="all">All statuses</option>{['Approved', 'Pending review', 'Draft', 'Retired'].map((s) => <option key={s}>{s}</option>)}</Select>
          <Select className="lg:w-40" value={lang} onChange={(e) => { setLang(e.target.value); setPage(0); }} aria-label="Language"><option value="all">All languages</option>{['English', 'Hindi', 'Telugu'].map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13.5px]">
            <thead><tr>{['Resource', 'Topic', 'Language', 'Source', 'Status', 'Updated', ''].map((h) => <th key={h || 'a'} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-8" /></td></tr>)}
              {view.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-neutral/60">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral text-slate"><FileText className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="code">{r.code} · {r.type}</p>
                        {r.file && <button onClick={() => get(r)} className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary-hover"><Download className="size-3" />{r.file.name} · {kb(r.file.size)}</button>}
                        {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="mt-0.5 ml-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary-hover"><Link2 className="size-3" />Link<ExternalLink className="size-3" /></a>}
                      </div>
                    </div>
                  </td>
                  <td className={td}>{r.conceptName}</td>
                  <td className={td}>{r.language}</td>
                  <td className={td}><Badge tone={r.author === 'AI draft' ? 'info' : 'neutral'}>{r.author === 'AI draft' ? <Bot className="size-3" /> : <UserRound className="size-3" />}{r.author}</Badge></td>
                  <td className={td}><StatusBadge status={r.status} /></td>
                  <td className={`${td} meta whitespace-nowrap`}>{ago(r.updatedAt)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {r.status === 'Approved'
                      ? <Button variant="ghost" size="sm" onClick={() => mark(r, 'Retired')}>Retire</Button>
                      : r.status === 'Retired'
                        ? <Button variant="ghost" size="sm" onClick={() => mark(r, 'Draft')}>Restore</Button>
                        : <Button variant="subtle" size="sm" onClick={() => mark(r, 'Approved')}><Check />Approve</Button>}
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.title}`} onClick={() => setConfirm(r)}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty icon={FileText} title="No resources match">Add the first worksheet for this class, or clear a filter.</Empty>}
        </div>
        <Pager page={p} pages={pages} total={rows.length} size={SIZE} onPage={setPage} />
      </Card>
      <AddResource open={adding} onOpenChange={setAdding} onCreated={reload} />
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Delete resource" className="max-w-[440px]">
        <div className="p-5">
          <h3 className="text-[16px]">Delete this resource?</h3>
          <p className="mt-1.5 text-[14px] text-slate">{confirm?.title} will be removed for everyone, including its file. A worksheet attached to homework cannot be deleted; retire it instead.</p>
          <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={() => remove(confirm)}>Delete</Button></div>
        </div>
      </Dialog>
    </Page>
  );
}
