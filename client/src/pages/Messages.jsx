import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowUp, LineChart, Search, Users } from 'lucide-react';
import LearnerSheet from '../components/LearnerSheet';
import { Avatar, Badge, Button, Empty, Skeleton, Textarea } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n';
import { api, errorText } from '../lib/api';
import { cn } from '../lib/utils';

const time = (iso) => {
  const d = new Date(iso);
  const same = d.toDateString() === new Date().toDateString();
  return same ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function ThreadIcon({ t, size = 36 }) {
  return t.kind === 'group'
    ? <span className="grid shrink-0 place-items-center rounded-full bg-primary-subtle text-primary" style={{ width: size, height: size }}><Users className="size-[18px]" /></span>
    : <Avatar name={t.title} size={size} />;
}

function ThreadList({ threads, active, onPick, teacher }) {
  const { t: tr } = useT();
  const [q, setQ] = useState('');
  const list = useMemo(() => threads.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())), [threads, q]);
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 border-b border-line p-3">
        <h2 className="mb-2 px-1 text-[16px]">{tr('Messages')}</h2>
        {teacher && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Find a learner')} aria-label={tr('Find a learner')} className="h-9 w-full rounded-field bg-neutral pl-9 pr-3 text-[13.5px] outline-none placeholder:text-faint focus:ring-2 focus:ring-primary/25" />
          </div>
        )}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {list.map((t) => (
          <li key={t.id}>
            <button onClick={() => onPick(t.id)} className={cn('flex w-full items-center gap-3 rounded-field px-2.5 py-2.5 text-left transition-colors duration-150', active === t.id ? 'bg-primary-subtle' : 'hover:bg-neutral')}>
              <ThreadIcon t={t} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate text-[14px]', t.unread ? 'font-semibold' : 'font-medium')}>{t.title}</span>
                  {t.last && <span className="meta shrink-0 text-[11.5px]">{time(t.last.ts)}</span>}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="meta truncate">{t.last ? `${t.kind === 'group' ? `${t.last.from}: ` : ''}${t.last.text}` : t.subtitle}</span>
                  {t.unread > 0 && <span className="grid min-w-[18px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[10.5px] font-semibold leading-[18px] text-white">{t.unread}</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="meta p-4 text-center">{tr('Nothing matches')} “{q}”.</li>}
      </ul>
    </div>
  );
}

function Conversation({ thread, me, teacher, onBack, onViewLearner, onSeen }) {
  const { t: tr } = useT();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  const stick = useRef(true);
  const last = useRef(0);

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    last.current = Math.max(last.current, ...incoming.map((m) => m.seq));
    setMessages((cur) => {
      const seen = new Set((cur || []).map((m) => m.seq));
      return [...(cur || []), ...incoming.filter((m) => !seen.has(m.seq))].sort((a, b) => a.seq - b.seq);
    });
  }, []);

  // Load, then poll for anything new every few seconds.
  useEffect(() => {
    let alive = true;
    setMessages(null); last.current = 0; stick.current = true;
    const pull = () => api.get(`/messages/threads/${thread.id}`, { params: { after: last.current } })
      .then((r) => { if (!alive) return; merge(r.data); if (r.data.length) onSeen(); if (last.current === 0) setMessages((c) => c ?? []); })
      .catch(() => {});
    pull();
    const t = setInterval(pull, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [thread.id, merge, onSeen]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/messages/threads/${thread.id}`, { text: body });
      stick.current = true; merge([data]); setText('');
      onSeen();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  const grouped = thread.kind === 'group';
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <button onClick={onBack} className="grid size-9 place-items-center rounded-field text-slate hover:bg-neutral lg:hidden" aria-label="Back to conversations"><ArrowLeft className="size-5" /></button>
        <ThreadIcon t={thread} />
        <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-[14.5px] font-semibold">{thread.title}</p><p className="meta truncate">{thread.subtitle}</p></div>
        {teacher && thread.kind === 'dm' && <Button variant="secondary" size="sm" onClick={() => onViewLearner(thread.peerId)}><LineChart />{tr('Performance')}</Button>}
      </div>

      <div
        ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-canvas px-3 py-4 sm:px-5"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
      >
        <div className="mx-auto max-w-[720px] space-y-1.5">
          {messages === null && <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-10 w-3/5" /></div>}
          {messages?.length === 0 && <Empty title={tr('No messages yet')}>{thread.kind === 'group' ? tr('Say hello to the class.') : tr('Start the conversation.')}</Empty>}
          {messages?.map((m, i) => {
            const mine = m.from.id === me.id;
            const first = messages[i - 1]?.from.id !== m.from.id;
            return (
              <div key={m.seq} className={cn('flex flex-col', mine ? 'items-end' : 'items-start', first && i > 0 && 'pt-2.5')}>
                {first && !mine && grouped && (
                  <p className="mb-0.5 flex items-center gap-1.5 px-1 text-[12px] font-medium text-slate">{m.from.name}{m.from.role === 'teacher' && <Badge tone="teal" className="h-[18px] px-1.5 text-[10.5px]">{tr('Teacher')}</Badge>}</p>
                )}
                <div className={cn('max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2 text-[14.5px] leading-[1.5] sm:max-w-[75%]', mine ? 'bg-primary-subtle' : 'border border-line bg-surface')}>
                  {m.text}
                  <span className="meta ml-2 inline-block translate-y-0.5 text-[11px] text-faint">{time(m.ts)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="shrink-0 border-t border-line bg-surface px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-card border border-line p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000} aria-label={tr('Message')}
            placeholder={grouped ? tr('Message the whole class') : `${tr('Message')} ${teacher ? thread.title : tr('your teacher')}`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="max-h-32 min-h-[40px] flex-1 border-0 bg-transparent px-2 py-2.5 hover:border-0 focus:ring-0" style={{ fieldSizing: 'content' }}
          />
          <Button type="submit" size="icon" disabled={!text.trim() || busy} aria-label="Send"><ArrowUp /></Button>
        </div>
      </form>
    </div>
  );
}

export default function Messages() {
  const { t: tr } = useT();
  const { profile, refreshUnread, grade, setGrade } = useApp();
  const [params, setParams] = useSearchParams();
  const [threads, setThreads] = useState(null);
  const [learner, setLearner] = useState(null);
  const teacher = profile.role === 'teacher';
  const wanted = params.get('thread');

  const load = useCallback(() => api.get('/messages/threads').then((r) => setThreads(r.data)).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const seen = useCallback(() => { load(); refreshUnread(); }, [load, refreshUnread]);
  const all = threads;
  // A teacher works one class at a time; a link to a learner in another class switches the class.
  useEffect(() => {
    const w = all?.find((t) => t.id === wanted);
    if (teacher && w && w.grade !== grade) setGrade(w.grade);
  }, [all, wanted, teacher, grade, setGrade]);
  const visible = teacher && all ? all.filter((t) => t.grade === grade) : all;
  const active = visible?.find((t) => t.id === wanted) ?? null;
  // Large screens always show a conversation; small screens show the list until one is picked.
  const shown = active ?? (visible && window.matchMedia('(min-width: 1024px)').matches ? visible[0] : null);

  return (
    <div className="flex h-full min-h-0">
      <aside className={cn('w-full shrink-0 border-r border-line lg:block lg:w-[320px]', shown && active ? 'hidden' : 'block')}>
        {visible ? <ThreadList threads={visible} active={shown?.id} teacher={teacher} onPick={(id) => setParams({ thread: id })} /> : <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
      </aside>
      <section className={cn('min-w-0 flex-1', !active && 'hidden lg:block')}>
        {shown ? (
          <Conversation key={shown.id} thread={shown} me={profile} teacher={teacher} onBack={() => setParams({})} onViewLearner={setLearner} onSeen={seen} />
        ) : <Empty title={tr('Choose a conversation')} />}
      </section>
      <LearnerSheet id={learner} onClose={() => setLearner(null)} />
    </div>
  );
}
