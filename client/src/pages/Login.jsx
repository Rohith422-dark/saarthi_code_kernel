import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpenCheck, Eye, EyeOff, GraduationCap, LineChart, MessagesSquare, Trophy, Users } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { LangSwitch, useT } from '../i18n';
import { cn } from '../lib/utils';

const COPY = {
  student: {
    icon: BookOpenCheck, title: 'Learner sign in', lead: 'Pick up where you left off. Saarthi remembers what you know and what to learn next.',
    points: [[BookOpenCheck, 'Practice at Easy, Medium or Hard'], [Trophy, 'Join the weekly contest and climb the leaderboard'], [MessagesSquare, 'Message your teacher and your class']],
  },
  teacher: {
    icon: LineChart, title: 'Teacher sign in', lead: 'See exactly what every learner understands, and step in when someone needs you.',
    points: [[LineChart, 'Monitor every learner, concept by concept'], [MessagesSquare, 'Chat with a learner personally or with the whole class'], [Users, 'Review and approve resources before learners see them']],
  },
};

function Shellbar({ children }) {
  const { t } = useT();
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[10px] bg-primary text-white"><GraduationCap className="size-5" /></span>
          <div className="leading-tight"><p className="text-[16px] font-semibold tracking-[-0.01em]">Saarthi</p><p className="text-[12px] text-slate">{t('Adaptive learning · Classes 6 to 10')}</p></div>
        </div>
        <div>
          <h1 className="max-w-md text-[34px] leading-[1.15] tracking-[-0.025em]">{t('Every student at their own pace. Every teacher in control.')}</h1>
          <p className="mt-4 max-w-md text-[15px] text-slate">{t('Saarthi finds the gap, then adapts what to learn, how, and how fast, while keeping the teacher at the centre.')}</p>
        </div>
        <span className="text-[12.5px] text-faint">{t('Classes 6 to 10 · English, Hindi and Telugu')}</span>
      </aside>
      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8"><LangSwitch className="absolute right-4 top-4 sm:right-8" />{children}</main>
    </div>
  );
}

export function LoginChooser() {
  const { t } = useT();
  const { profile } = useApp();
  if (profile) return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/'} replace />;
  return (
    <Shellbar>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5 lg:hidden"><span className="grid size-9 place-items-center rounded-[10px] bg-primary text-white"><GraduationCap className="size-5" /></span><p className="text-[16px] font-semibold">Saarthi</p></div>
        <h2 className="text-[24px]">{t('Welcome to Saarthi')}</h2>
        <p className="mt-1.5 text-[14.5px] text-slate">{t('Choose how you want to sign in.')}</p>
        <div className="mt-6 space-y-3">
          {['student', 'teacher'].map((r) => {
            const c = COPY[r];
            return (
              <Link key={r} to={`/login/${r}`} className="card group flex items-center gap-4 p-4 transition-colors duration-150 hover:border-primary/50 hover:bg-primary-tint">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-subtle text-primary"><c.icon className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{r === 'student' ? t("I'm a learner") : t("I'm a teacher")}</span><span className="meta block">{r === 'student' ? t('Practise, take contests, ask the tutor') : t('Monitor the class and message learners')}</span></span>
                <ArrowRight className="size-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </motion.div>
    </Shellbar>
  );
}

export default function Login() {
  const { t } = useT();
  const { role } = useParams();
  const { profile, login, errorText } = useApp();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(null);

  useEffect(() => { api.get('/auth/demo').then((r) => setDemo(r.data)).catch(() => {}); }, []);
  useEffect(() => { setUsername(''); setPassword(''); setError(''); }, [role]);

  if (!COPY[role]) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/'} replace />;
  const c = COPY[role];
  const other = role === 'student' ? 'teacher' : 'student';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(role, username, password);
      nav(u.role === 'teacher' ? '/teacher' : '/', { replace: true });
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <Shellbar>
      <motion.div key={role} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="w-full max-w-[420px]">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate hover:text-ink"><ArrowLeft className="size-4" />{t('Back')}</Link>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-subtle text-primary"><c.icon className="size-5" /></span>
          <div><h2 className="text-[22px]">{t(c.title)}</h2><p className="meta">{role === 'student' ? t('For learners in Classes 6 to 10') : t('For teachers')}</p></div>
        </div>
        <p className="text-[14.5px] text-slate">{t(c.lead)}</p>

        <form onSubmit={submit} className="card mt-5 space-y-4 p-5" noValidate>
          <div>
            <label htmlFor="username" className="text-[13px] font-medium">{t('Username')}</label>
            <Input id="username" className="mt-1.5" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={role === 'student' ? t('e.g. your first name') : t('Your username')} autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="text-[13px] font-medium">{t('Password')}</label>
            <div className="relative mt-1.5">
              <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate hover:bg-neutral" aria-label={show ? t('Hide password') : t('Show password')}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="rounded-field bg-critical-surface px-3 py-2 text-[13px] text-critical">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !username.trim() || !password}>{busy ? t('Signing in…') : t('Sign in')}</Button>
        </form>

        {demo?.demo && (
          <div className="mt-4 rounded-card border border-dashed border-line p-4">
            <p className="label">{t('Demo accounts')}</p>
            <p className="meta mt-1">{t('Local demo only.')} {t('Password')}: <span className="code">{role === 'student' ? demo.studentPassword : demo.teacherPassword}</span></p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(role === 'student' ? demo.students : [demo.teacher]).map((u) => (
                <button key={u.username} type="button" onClick={() => { setUsername(u.username); setPassword(role === 'student' ? demo.studentPassword : demo.teacherPassword); }}
                  className={cn('rounded-full border border-line px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:bg-neutral', username === u.username && 'border-primary/50 bg-primary-subtle text-primary')}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="mt-5 text-center text-[13.5px] text-slate">{role === 'student' ? t('Are you a teacher?') : t('Are you a learner?')} <Link to={`/login/${other}`} className="font-medium text-primary hover:text-primary-hover">{other === 'teacher' ? t('Sign in as a teacher') : t('Sign in as a learner')}</Link></p>
      </motion.div>
    </Shellbar>
  );
}
