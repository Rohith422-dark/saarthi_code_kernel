import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorText, setToken } from '../lib/api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const KEY = 'saarthi.auth';
const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
};
const initial = read();
setToken(initial?.token); // before the first request is made

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(initial);
  const [online, setOnline] = useState(navigator.onLine);
  const [serverUp, setServerUp] = useState(true);
  const [version, setVersion] = useState(0);
  const [unread, setUnread] = useState(0);
  const [homework, setHomework] = useState({ todo: 0, overdue: 0 });
  const [grade, setGradeState] = useState(() => { try { return Number(localStorage.getItem('saarthi.grade')) || 8; } catch { return 8; } });
  const setGrade = useCallback((g) => { setGradeState(g); try { localStorage.setItem('saarthi.grade', String(g)); } catch { /* ignore */ } }, []);

  const store = useCallback((next) => {
    setToken(next?.token);
    try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
    setAuth(next);
    setUnread(0);
    setHomework({ todo: 0, overdue: 0 });
    setVersion((v) => v + 1);
  }, []);

  const login = useCallback(async (role, username, password) => {
    const { data } = await api.post('/auth/login', { role, username, password });
    store(data);
    return data.user;
  }, [store]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* the token may already be gone */ }
    store(null);
  }, [store]);

  // A rejected token anywhere sends the person back to sign in.
  useEffect(() => {
    const id = api.interceptors.response.use(null, (err) => {
      if (err.response?.status === 401 && !String(err.config?.url).includes('/auth/')) store(null);
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, [store]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => {
    const ping = () => api.get('/health').then(() => setServerUp(true)).catch(() => setServerUp(false));
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, []);

  const refreshUnread = useCallback(() => {
    if (!auth) return Promise.resolve();
    const jobs = [api.get('/messages/unread').then((r) => setUnread(r.data.total)).catch(() => {})];
    if (auth.user.role === 'student') jobs.push(api.get('/homework/summary').then((r) => setHomework(r.data)).catch(() => {}));
    return Promise.all(jobs);
  }, [auth]);
  useEffect(() => {
    refreshUnread();
    if (!auth) return undefined;
    const t = setInterval(refreshUnread, 8000);
    return () => clearInterval(t);
  }, [auth, refreshUnread]);

  const value = useMemo(() => ({
    profile: auth?.user ?? null, login, logout, online, serverUp, version, unread, homework, refreshUnread, errorText,
    // The class a teacher is looking at; learners are always in their own class.
    grade: auth?.user?.role === 'student' ? auth.user.grade : grade, setGrade,
  }), [auth, login, logout, online, serverUp, version, unread, homework, refreshUnread, grade, setGrade]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
