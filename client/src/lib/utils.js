import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...a) => twMerge(clsx(a));
export const pct = (p) => `${Math.round(p * 100)}%`;

export function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}
export const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const masteryTone = (p) => (p < 0.4 ? 'critical' : p < 0.8 ? 'warning' : 'success');

export const fmtDue = (iso) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function dueIn(iso) {
  const ms = new Date(iso) - Date.now();
  const abs = Math.abs(ms);
  const h = Math.round(abs / 3600000);
  const text = h < 1 ? `${Math.max(1, Math.round(abs / 60000))} min` : h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
  return ms >= 0 ? `Due in ${text}` : `${text} overdue`;
}
