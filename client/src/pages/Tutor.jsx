import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ArrowUp, BookMarked, GripVertical, History, MessageSquarePlus, PanelRightClose, PanelRightOpen, Sparkles, Trash2 } from 'lucide-react';
import { CitationMarker, DocumentDrawer, ExternalCard, SourceCard } from '../components/tutor/Parts';
import { Badge, Button, Skeleton, Textarea } from '../components/ui';
import { Sheet, Tooltip, TabsContent, TabsList, TabsRoot, TabsTrigger } from '../components/ui/overlay';
import { api, errorText } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n';
import { ago, cn } from '../lib/utils';

const SUGGEST = ['How do I solve a linear equation?', 'What are the laws of exponents?', 'How do I find the area of a trapezium?', 'Explain direct and inverse proportion'];

function Assistant({ msg, selected, onSelect, onFollow }) {
  const { response: r } = msg;
  if (r.kind === 'external') return <ExternalCard paragraphs={r.paragraphs} note={r.note} warning={r.warning} />;
  return (
    <div className="max-w-[740px]">
      <div className="space-y-3 text-[15px] leading-[1.7]">
        {r.paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p.text}
            {p.cites.map((n) => {
              const src = r.sources.find((s) => s.n === n);
              return src && <CitationMarker key={n} source={src} selected={selected?.msgId === msg.id && selected.n === n} onSelect={() => onSelect(msg.id, n)} />;
            })}
          </p>
        ))}
      </div>
      {r.warning && <p className="mt-3 rounded-field bg-warning-surface px-3 py-2 text-[12.5px] text-warning">{r.warning}</p>}
      {r.follow && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-[13.5px] text-slate">{r.follow.text}</p>
          <Button size="sm" variant="subtle" onClick={() => onFollow(r.follow.conceptId)}>{r.follow.label}</Button>
        </div>
      )}
    </div>
  );
}

function Evidence({ msg, all, selected, expanded, setExpanded, onSelect, onOpen, onClose, collapsible }) {
  const current = msg?.response?.sources ?? [];
  const list = (items) => items.length === 0 ? (
    <p className="meta px-1 py-8 text-center">No sources yet. Ask a question and the passages it uses will appear here.</p>
  ) : (
    <div className="space-y-2.5">
      {items.map((s) => (
        <SourceCard
          key={`${s.msgId ?? msg.id}-${s.id}`} source={s} selected={selected?.msgId === (s.msgId ?? msg.id) && selected.n === s.n}
          expanded={!!expanded[`${s.msgId ?? msg.id}-${s.id}`]}
          onSelect={() => onSelect(s.msgId ?? msg.id, s.n)}
          onToggle={() => setExpanded((e) => ({ ...e, [`${s.msgId ?? msg.id}-${s.id}`]: !e[`${s.msgId ?? msg.id}-${s.id}`] }))}
          onOpen={() => onOpen(s)}
        />
      ))}
    </div>
  );
  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-neutral/60 px-4">
        <h3 className="text-[14px]">Retrieved context</h3>
        <span className="num meta">{current.length} {current.length === 1 ? 'passage' : 'passages'}</span>
        <span className="ml-1 inline-flex items-center gap-1.5 text-[12px] text-slate"><span className="size-1.5 rounded-full bg-success" />Approved notes</span>
        <div className="flex-1" />
        {collapsible && (
          <Tooltip label="Collapse panel" side="bottom">
            <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-slate transition-colors hover:bg-neutral hover:text-ink" aria-label="Collapse panel"><PanelRightClose className="size-4" /></button>
          </Tooltip>
        )}
      </div>
      <TabsRoot defaultValue="current" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0 bg-surface px-4 pt-2">
          <TabsTrigger value="current">This answer</TabsTrigger>
          <TabsTrigger value="all">All sources<span className="num ml-1.5 text-faint">{all.length}</span></TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
          <TabsContent value="current" className="outline-none">{list(current)}</TabsContent>
          <TabsContent value="all" className="outline-none">{list(all)}</TabsContent>
        </div>
      </TabsRoot>
    </div>
  );
}

export default function Tutor() {
  const { t, lang } = useT();
  const nav = useNavigate();
  const { profile, version } = useApp();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [doc, setDoc] = useState(null);
  const [width, setWidth] = useState(38); // evidence panel, % of workspace
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [ai, setAi] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [histOpen, setHistOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [opening, setOpening] = useState(false);
  const wrap = useRef(null);
  const scroller = useRef(null);
  const drag = useRef(false);

  const refreshChats = useCallback(() => api.get('/chats').then((r) => { setChats(r.data); return r.data; }).catch(() => []), []);

  const openChat = useCallback(async (id) => {
    setOpening(true);
    try {
      const { data } = await api.get(`/chats/${id}`);
      setMessages(data.messages); setChatId(data.id); setHistOpen(false); setConfirmId(null);
      const last = [...data.messages].reverse().find((m) => m.role === 'assistant' && m.response.kind === 'grounded' && m.response.sources.length);
      setSelected(last ? { msgId: last.id, n: 1 } : null);
    } catch (e) { toast.error(errorText(e)); } finally { setOpening(false); }
  }, []);

  const newChat = () => { setMessages([]); setChatId(null); setSelected(null); setText(''); setHistOpen(false); };

  // Coming back (or switching profile) restores the most recent conversation instead of an empty page.
  useEffect(() => {
    setMessages([]); setSelected(null); setChatId(null);
    refreshChats().then((list) => { if (list[0]) openChat(list[0].id); });
  }, [version, refreshChats, openChat]);

  const removeChat = async (id) => {
    try { await api.delete(`/chats/${id}`); if (id === chatId) newChat(); await refreshChats(); toast.success(t('Chat deleted')); }
    catch (e) { toast.error(errorText(e)); } finally { setConfirmId(null); }
  };
  useEffect(() => { api.get('/llm/status').then((r) => setAi(r.data)).catch(() => setAi({ ok: false, reason: 'Cannot reach the server' })); }, [messages.length]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  useEffect(() => {
    const move = (e) => {
      if (!drag.current || !wrap.current) return;
      const r = wrap.current.getBoundingClientRect();
      setWidth(Math.min(55, Math.max(28, ((r.right - e.clientX) / r.width) * 100)));
    };
    const up = () => { drag.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);

  const send = async (q) => {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    const id = `m${Date.now()}`;
    setMessages((m) => [...m, { id, role: 'user', text: message }]);
    setText(''); setBusy(true);
    try {
      const history = messages.filter((m) => m.role === 'user' || m.response.kind !== 'smalltalk').slice(-6)
        .map((m) => ({ role: m.role, content: m.role === 'user' ? m.text : m.response.paragraphs.map((p) => p.text).join('\n\n') }));
      const { data } = await api.post('/chat', { message, history, lang, chatId }, { timeout: 150000 });
      const { chatId: cid, assistantMsgId, userMsgId, title, ...response } = data;
      setChatId(cid);
      setMessages((m) => [...m.map((x) => (x.id === id ? { ...x, id: userMsgId } : x)), { id: assistantMsgId, role: 'assistant', response }]);
      setSelected(response.sources.length && response.kind === 'grounded' ? { msgId: assistantMsgId, n: 1 } : null);
      refreshChats();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  const assistants = messages.filter((m) => m.role === 'assistant');
  const active = assistants.find((m) => m.id === selected?.msgId) ?? assistants.at(-1);
  const all = useMemo(() => assistants.flatMap((m) => m.response.sources.map((s) => ({ ...s, msgId: m.id }))).reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]);

  const select = (msgId, n) => { setSelected({ msgId, n }); setPanelOpen(true); };
  const evidence = (collapsible) => (
    <Evidence
      msg={active} all={all} selected={selected} expanded={expanded} setExpanded={setExpanded}
      onSelect={select} onOpen={setDoc} collapsible={collapsible} onClose={() => setPanelOpen(false)}
    />
  );
  const count = active?.response?.sources?.length ?? 0;

  return (
    <div ref={wrap} className="flex h-full min-h-0">
      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col" style={{ flexBasis: panelOpen ? `${100 - width}%` : '100%' }}>
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h3 className="whitespace-nowrap text-[14px]">{t('Saarthi Tutor')}</h3>{ai?.ok
            ? <Badge tone="teal" className="hidden sm:inline-flex">Ollama · {ai.model}{ai.embeddings ? ' · RAG' : ''}</Badge>
            : <Tooltip label={ai?.reason || 'Checking the AI model'} side="bottom"><span><Badge tone="warning" className="hidden sm:inline-flex">{ai ? 'AI model offline: notes only' : 'Checking AI model'}</Badge></span></Tooltip>}</div>
          <div className="flex items-center gap-1">
            <Tooltip label={t('New chat')} side="bottom"><Button variant="ghost" size="icon-sm" onClick={newChat} aria-label={t('New chat')}><MessageSquarePlus /></Button></Tooltip>
            <Tooltip label={t('Chat history')} side="bottom"><Button variant="ghost" size="icon-sm" onClick={() => setHistOpen(true)} aria-label={t('Chat history')}><History /></Button></Tooltip>
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setSheet(true)}><BookMarked />{t('Sources')}{count ? ` (${count})` : ''}</Button>
            {!panelOpen && (
              <Tooltip label="Show retrieved context" side="bottom">
                <button onClick={() => setPanelOpen(true)} className="hidden size-8 place-items-center rounded-md text-slate hover:bg-neutral lg:grid" aria-label="Show retrieved context"><PanelRightOpen className="size-4" /></button>
              </Tooltip>
            )}
          </div>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-surface">
          <div className="mx-auto w-full max-w-[760px] space-y-7 px-4 py-6 sm:px-6">
            {messages.length === 0 && (
              <div className="pt-6 sm:pt-12">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-subtle text-primary"><Sparkles className="size-5" /></span>
                <h2 className="mt-4 text-[22px]">{t('What are you stuck on, {name}?', { name: profile.name })}</h2>
                <p className="mt-1.5 max-w-lg text-[14.5px] text-slate">{t('Ask about any Class {g} Maths concept.', { g: profile.grade })} {t("Saarthi solves it step by step, using your teacher's approved notes as numbered sources you can check.")}</p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGEST.map((s) => (
                    <button key={s} onClick={() => send(t(s))} className="rounded-field border border-line px-3.5 py-3 text-left text-[13.5px] font-medium transition-colors hover:border-[#c6d3da] hover:bg-neutral">{t(s)}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {m.role === 'user' ? (
                  <div className="flex justify-end"><p className="max-w-[85%] rounded-xl bg-neutral px-3.5 py-2.5 text-[14.5px]">{m.text}</p></div>
                ) : (
                  <Assistant msg={m} selected={selected} onSelect={select} onFollow={(id) => nav(`/practice/${id}`)} />
                )}
              </motion.div>
            ))}
            {busy && (
              <div className="max-w-[740px] space-y-2.5" aria-live="polite" aria-label="Looking through notes">
                <Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-surface px-4 py-3 sm:px-6">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="mx-auto flex max-w-[760px] items-end gap-2 rounded-card border border-line bg-surface p-2 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"
          >
            <Textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={1} aria-label={t('Ask a question')} placeholder={t('Ask about a concept, e.g. how do I factorise x² + 5x + 6?')}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="max-h-36 min-h-[44px] flex-1 border-0 bg-transparent px-2 py-3 focus:ring-0 hover:border-0"
              style={{ fieldSizing: 'content' }}
            />
            <Button type="submit" size="icon" disabled={!text.trim() || busy} aria-label="Send"><ArrowUp /></Button>
          </form>
          <p className="meta mx-auto mt-1.5 max-w-[760px] text-center text-[11.5px]">{t('Enter to send, Shift + Enter for a new line')}</p>
        </div>
      </section>

      {/* Resizable evidence panel (desktop) */}
      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.aside
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="relative hidden min-h-0 shrink-0 border-l border-line lg:block" style={{ width: `${width}%` }}
          >
            <div
              role="separator" aria-orientation="vertical" aria-label="Resize panels" tabIndex={0}
              onPointerDown={(e) => { drag.current = true; document.body.style.userSelect = 'none'; e.preventDefault(); }}
              onKeyDown={(e) => { if (e.key === 'ArrowLeft') setWidth((w) => Math.min(55, w + 2)); if (e.key === 'ArrowRight') setWidth((w) => Math.max(28, w - 2)); }}
              className="group absolute -left-1.5 top-0 z-10 flex h-full w-3 cursor-col-resize items-center justify-center"
            >
              <span className="grid h-8 w-3 place-items-center rounded border border-line bg-surface text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><GripVertical className="size-3" /></span>
            </div>
            {evidence(true)}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Drawer on small screens */}
      <Sheet open={sheet} onOpenChange={setSheet} title="Retrieved context" description={`${count} passages for this answer`} width="sm:max-w-[420px] lg:hidden">
        <div className="h-full">{evidence(false)}</div>
      </Sheet>

      <Sheet open={histOpen} onOpenChange={(o) => { setHistOpen(o); if (!o) setConfirmId(null); }} title={t('Chat history')} description={t('Your conversations with the tutor are saved here, and only you can see them.')} width="sm:max-w-[420px]">
        <div className="p-3">
          <Button className="mb-3 w-full" variant="secondary" onClick={newChat}><MessageSquarePlus />{t('New chat')}</Button>
          {chats.length === 0 ? <p className="meta px-2 py-8 text-center">{t('No saved chats yet')}</p> : (
            <ul className="space-y-1">
              {chats.map((c) => (
                <li key={c.id} className={cn('flex items-center gap-1 rounded-field', c.id === chatId && 'bg-primary-subtle')}>
                  <button onClick={() => openChat(c.id)} disabled={opening} className="min-w-0 flex-1 rounded-field px-3 py-2.5 text-left transition-colors hover:bg-neutral">
                    <span className="block truncate text-[14px] font-medium">{c.title}</span>
                    <span className="meta">{ago(c.updatedAt)} · {t('{n} messages', { n: c.count })}</span>
                  </button>
                  {confirmId === c.id ? (
                    <span className="flex items-center gap-1 pr-1">
                      <Button size="sm" variant="danger" onClick={() => removeChat(c.id)}>{t('Delete')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>{t('Cancel')}</Button>
                    </span>
                  ) : (
                    <Button variant="ghost" size="icon-sm" className="mr-1" onClick={() => setConfirmId(c.id)} aria-label={`${t('Delete')}: ${c.title}`}><Trash2 /></Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      <DocumentDrawer source={doc} onClose={() => setDoc(null)} onPractise={() => { nav(`/practice/${doc.conceptId}`); setDoc(null); }} />
    </div>
  );
}
