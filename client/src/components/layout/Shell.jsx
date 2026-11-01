import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, BellRing, BookOpenCheck, Check, ChevronsUpDown, Compass, FileText, GraduationCap, LayoutDashboard,
  Library, MessagesSquare, Trophy, Medal, LogOut, MessageCircle, ClipboardList, Info, Network, GraduationCap as Cap, CalendarClock, Timer, PanelLeftClose, PanelLeftOpen, Search, Stethoscope, Users, WifiOff, X, Menu, CornerDownLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useFetch } from '../../lib/useFetch';
import { cn, pct } from '../../lib/utils';
import { Avatar, Badge } from '../ui';
import { LangSwitch, useT } from '../../i18n';
import { Dialog, Popover, PopoverContent, PopoverTrigger, Tooltip } from '../ui/overlay';

const BASE_NAV = {
  student: [
    { label: 'Learn', items: [
      { to: '/', title: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/diagnostic', title: 'Diagnostic', icon: Stethoscope },
      { to: '/path', title: 'Learning path', icon: Network },
      { to: '/practice', title: 'Practice', icon: BookOpenCheck },
      { to: '/homework', title: 'Homework', icon: ClipboardList, badge: 'homework' },
      { to: '/study-material', title: 'Study material', icon: FileText },
    ] },
    { label: 'Compete', items: [
      { to: '/contests', title: 'Contests', icon: Trophy },
      { to: '/leaderboard', title: 'Leaderboard', icon: Medal },
    ] },
    { label: 'Support', items: [
      { to: '/tutor', title: 'Tutor', icon: MessagesSquare },
      { to: '/messages', title: 'Messages', icon: MessageCircle, badge: 'unread' },
    ] },
  ],
  teacher: [
    { label: 'Classroom', items: [
      { to: '/teacher', title: 'Class overview', icon: Users, end: true },
      { to: '/teacher/students', title: 'Students', icon: GraduationCap },
      { to: '/messages', title: 'Messages', icon: MessageCircle, badge: 'unread' },
      { to: '/teacher/exams', title: 'Exam preparation', icon: CalendarClock },
      { to: '/teacher/alerts', title: 'Alerts', icon: BellRing },
      { to: '/teacher/leaderboard', title: 'Leaderboard', icon: Medal },
    ] },
    { label: 'Content', items: [
      { to: '/teacher/homework', title: 'Homework', icon: ClipboardList },
      { to: '/teacher/resources', title: 'Resources', icon: Library },
    ] },
    { label: 'Records', items: [
      { to: '/teacher/activity', title: 'Activity log', icon: Activity },
    ] },
  ],
};

/** Every class gets an Exam prep group; the plan and papers adapt to the class's own syllabus. */
const navFor = (profile) => {
  if (profile.role === 'teacher') return BASE_NAV.teacher;
  const [learn, compete, ...rest] = BASE_NAV.student;
  return [learn, { label: 'Exam prep', items: [{ to: '/exams', title: 'Exam centre', icon: Timer }] }, compete, ...rest];
};

const CRUMBS = {
  '/': ['Learn', 'Dashboard'], '/diagnostic': ['Learn', 'Diagnostic'], '/path': ['Learn', 'Learning path'],
  '/practice': ['Learn', 'Practice'], '/tutor': ['Support', 'Tutor'],
  '/contests': ['Compete', 'Contests'], '/leaderboard': ['Compete', 'Leaderboard'], '/teacher/leaderboard': ['Classroom', 'Leaderboard'],
  '/teacher': ['Classroom', 'Class overview'], '/teacher/students': ['Classroom', 'Students'], '/homework': ['Learn', 'Homework'], '/teacher/homework': ['Content', 'Homework'], '/messages': ['Support', 'Messages'], '/teacher/alerts': ['Classroom', 'Alerts'],
  '/exams': ['Exam prep', 'Exam centre'], '/study-material': ['Learn', 'Study material'], '/teacher/exams': ['Classroom', 'Exam preparation'],
  '/teacher/resources': ['Content', 'Resources'], '/teacher/activity': ['Records', 'Activity log'],
};

function Logo({ compact }) {
  const { t } = useT();
  const { profile, grade } = useApp();
  return (
    <div className="flex h-nav shrink-0 items-center gap-2.5 border-b border-line px-[18px]">
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary text-white">
        <GraduationCap className="size-[18px]" />
      </span>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Saarthi</p>
          <p className="text-[11.5px] text-slate">{profile.role === 'teacher' ? t('Maths · Classes 6 to 10') : t('Class {g} Maths', { g: grade })}</p>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ compact }) {
  const { t } = useT();
  const { profile, logout } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const out = async () => { setOpen(false); const r = profile.role; await logout(); nav(`/login/${r}`, { replace: true }); };
  return (
    <div className="border-t border-line p-3">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip label={profile.name} disabled={!compact}>
          <PopoverTrigger asChild>
            <button className={cn('flex w-full items-center gap-2.5 rounded-field p-2 text-left transition-colors hover:bg-neutral', compact && 'justify-center')}>
              <Avatar name={profile.name} size={32} />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-medium">{profile.name}</span>
                    <span className="meta block">{profile.role === 'teacher' ? t('Teacher') : t('Class {g} learner', { g: profile.grade })}</span>
                  </span>
                  <ChevronsUpDown className="size-4 text-faint" />
                </>
              )}
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent side="top" align="start" className="w-[220px]">
          <div className="px-2 py-1.5"><p className="text-[13.5px] font-medium">{profile.name}</p><p className="meta">{profile.role === 'teacher' ? t('Signed in as teacher') : t('Signed in as learner')}</p></div>
          <div className="my-1 h-px bg-line" />
          <button onClick={out} className="flex w-full items-center gap-2.5 rounded-field px-2 py-2 text-left text-[13.5px] font-medium text-slate transition-colors hover:bg-neutral hover:text-ink">
            <LogOut className="size-4" />{t('Sign out')}
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Sidebar({ compact, onNavigate }) {
  const { t } = useT();
  const { profile, unread, homework } = useApp();
  const groups = navFor(profile);
  return (
    <div className="flex h-full flex-col bg-surface">
      <Logo compact={compact} />
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('Main')}>
        {groups.map((g, gi) => (
          <div key={g.label} className={cn(gi > 0 && 'mt-5 border-t border-line pt-4')}>
            {!compact && <p className="label mb-1.5 px-2.5">{t(g.label)}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.to}>
                  <Tooltip label={t(it.title)} disabled={!compact}>
                    <NavLink
                      to={it.to} end={it.end} onClick={onNavigate}
                      className={({ isActive }) => cn(
                        'relative flex h-10 items-center gap-3 rounded-field px-2.5 text-[14px] font-medium transition-colors duration-150',
                        compact && 'justify-center px-0',
                        isActive ? 'bg-primary-subtle text-primary' : 'text-slate hover:bg-neutral hover:text-ink',
                      )}
                    >
                      <it.icon className="size-[19px] shrink-0" strokeWidth={1.8} />
                      {!compact && <span className="flex-1 truncate">{t(it.title)}</span>}
                      {(() => {
                        const n = it.badge === 'unread' ? unread : it.badge === 'homework' ? homework.todo : 0;
                        return n > 0 && (
                          <span className={cn('grid min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-semibold leading-[18px] text-white', it.badge === 'homework' && homework.overdue ? 'bg-critical' : 'bg-primary', compact && 'absolute right-1.5 top-1.5')}>{n}</span>
                        );
                      })()}
                    </NavLink>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <ProfileMenu compact={compact} />
    </div>
  );
}

function Palette({ open, onOpenChange }) {
  const { t } = useT();
  const { profile } = useApp();
  const nav = useNavigate();
  const { data } = useFetch(profile.role === 'student' ? '/concepts' : '/resources');
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const items = useMemo(() => {
    const pages = navFor(profile).flatMap((g) => g.items.map((i) => ({ label: t(i.title), hint: t(g.label), to: i.to, icon: i.icon })));
    const extra = profile.role === 'student'
      ? (data || []).map((c) => ({ label: c.name, hint: t('Practise concept'), to: `/practice/${c.id}`, icon: BookOpenCheck }))
      : (data || []).slice(0, 40).map((r) => ({ label: r.title, hint: `${r.language} · ${r.status}`, to: '/teacher/resources', icon: FileText }));
    const all = [...pages, ...extra];
    const s = q.trim().toLowerCase();
    return (s ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)) : all).slice(0, 9);
  }, [q, data, profile, t]);
  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const go = (it) => { if (it) { nav(it.to); onOpenChange(false); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('Search')}>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[18px] text-faint" />
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search pages and concepts')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
            if (e.key === 'Enter') go(items[cursor]);
          }}
          className="h-12 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-faint"
        />
        <kbd className="code rounded border border-line px-1.5 py-0.5">Esc</kbd>
      </div>
      <ul className="max-h-[340px] overflow-y-auto p-1.5">
        {items.length === 0 && <li className="meta px-3 py-6 text-center">{t('Nothing matches')} “{q}”.</li>}
        {items.map((it, i) => (
          <li key={it.to + it.label}>
            <button
              onMouseEnter={() => setCursor(i)} onClick={() => go(it)}
              className={cn('flex w-full items-center gap-3 rounded-field px-3 py-2 text-left transition-colors', i === cursor && 'bg-primary-subtle')}
            >
              <it.icon className={cn('size-4', i === cursor ? 'text-primary' : 'text-slate')} />
              <span className="flex-1 truncate text-[13.5px] font-medium">{it.label}</span>
              <span className="meta">{it.hint}</span>
              {i === cursor && <CornerDownLeft className="size-3.5 text-primary" />}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function Topbar({ onMenu, collapsed, onToggle, onSearch }) {
  const { t } = useT();
  const { pathname } = useLocation();
  const { profile, online, serverUp, grade, setGrade } = useApp();
  const nav = useNavigate();
  const key = pathname.startsWith('/practice') ? '/practice' : pathname.startsWith('/contests') ? '/contests' : pathname.startsWith('/homework') ? '/homework' : pathname.startsWith('/exams') ? '/exams' : pathname;
  const [section, page] = CRUMBS[key] || ['Saarthi', ''];
  const alerts = useFetch(profile.role === 'teacher' ? `/teacher/overview?grade=${grade}` : '/health');
  const unread = profile.role === 'teacher' ? alerts.data?.alerts?.length || 0 : 0;

  return (
    <header className="sticky top-0 z-30 flex h-nav shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <button onClick={onMenu} className="grid size-9 place-items-center rounded-field text-slate hover:bg-neutral lg:hidden" aria-label={t('Open menu')}><Menu className="size-5" /></button>
      <Tooltip label={collapsed ? t('Expand sidebar') : t('Collapse sidebar')} side="bottom">
        <button onClick={onToggle} className="hidden size-9 place-items-center rounded-field text-slate transition-colors hover:bg-neutral hover:text-ink lg:grid" aria-label={t('Collapse sidebar')}>
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </Tooltip>
      <div className="hidden min-w-0 leading-tight sm:block">
        <p className="meta">{t(section)}</p>
        <p className="truncate text-[14px] font-semibold">{t(page)}</p>
      </div>
      <div className="flex-1" />
      {profile.role === 'teacher' && (
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label={t('Class')} className="h-10 cursor-pointer rounded-field border border-line bg-surface px-2.5 text-[13.5px] font-medium hover:bg-neutral focus:outline-none focus:ring-2 focus:ring-primary/25">
          {[6, 7, 8, 9, 10].map((g) => <option key={g} value={g}>{t('Class {g}', { g })}</option>)}
        </select>
      )}
      <button
        onClick={onSearch}
        className="flex h-10 w-10 items-center gap-2.5 rounded-field border border-transparent bg-neutral px-0 text-[13.5px] text-faint transition-colors hover:border-line sm:w-[280px] sm:px-3"
      >
        <Search className="mx-auto size-4 sm:mx-0" />
        <span className="hidden flex-1 text-left sm:inline">{t('Search')}</span>
        <kbd className="code hidden rounded border border-line bg-surface px-1.5 sm:inline">Ctrl K</kbd>
      </button>
      {(!online || !serverUp) && (
        <Badge tone="warning"><WifiOff className="size-3" />{!online ? t('Offline') : t('Server unreachable')}</Badge>
      )}
      <LangSwitch />
      <Tooltip label={unread ? t('{n} alerts', { n: unread }) : t('No new alerts')} side="bottom">
        <button onClick={() => nav('/teacher/alerts')} disabled={profile.role !== 'teacher'} className="relative grid size-10 place-items-center rounded-field text-slate transition-colors hover:bg-neutral hover:text-ink disabled:opacity-50 disabled:hover:bg-transparent" aria-label={t('Alerts')}>
          <BellRing className="size-[19px]" strokeWidth={1.8} />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-semibold leading-4 text-white">{unread}</span>}
        </button>
      </Tooltip>
      <Avatar name={profile.name} size={34} />
    </header>
  );
}

export default function Shell() {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('saarthi.collapsed') === '1'; } catch { return false; } });
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const { pathname } = useLocation();
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem('saarthi.collapsed', c ? '0' : '1'); } catch { /* ignore */ } return !c; });

  useEffect(() => { setMobile(false); }, [pathname]);
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((s) => !s); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <motion.aside
        animate={{ width: collapsed ? 72 : 248 }} initial={false} transition={{ duration: 0.18, ease: 'easeOut' }}
        className="hidden shrink-0 overflow-hidden border-r border-line lg:block"
      >
        <Sidebar compact={collapsed} />
      </motion.aside>

      <AnimatePresence>
        {mobile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-40 bg-ink/25 lg:hidden" onClick={() => setMobile(false)} />
            <motion.aside initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line shadow-dialog lg:hidden">
              <button onClick={() => setMobile(false)} className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-field text-slate hover:bg-neutral" aria-label="Close menu"><X className="size-4" /></button>
              <Sidebar onNavigate={() => setMobile(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobile(true)} collapsed={collapsed} onToggle={toggle} onSearch={() => setSearch(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Palette open={search} onOpenChange={setSearch} />
    </div>
  );
}

export const Page = ({ children, className }) => (
  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn('mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6', className)}>
    {children}
  </motion.div>
);
