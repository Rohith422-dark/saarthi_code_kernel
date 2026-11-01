import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui';

export const th = 'h-10 whitespace-nowrap bg-neutral px-4 text-left text-[12px] font-semibold text-ink first:rounded-tl-card last:rounded-tr-card';
export const td = 'px-4 py-3 align-middle';

export default function Pager({ page, pages, total, size, onPage }) {
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
      <p className="meta num">{from}–{to} of {total}</p>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="icon-sm" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
        <Button variant="secondary" size="icon-sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  );
}
