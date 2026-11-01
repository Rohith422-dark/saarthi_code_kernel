import { useEffect, useRef } from 'react';
import * as Tip from '@radix-ui/react-tooltip';
import { ChevronDown, FileText, TriangleAlert } from 'lucide-react';
import { Badge, Bar, Button } from '../ui';
import { Sheet } from '../ui/overlay';
import { cn } from '../../lib/utils';

export const SourceMeta = ({ s }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
    <span className="code">{s.code}</span>
    <span className="meta">{s.version}</span>
    <span className="meta">· p. {s.page}</span>
    <span className="meta">· {s.section}</span>
  </div>
);

export const StatusPill = ({ status }) =>
  status === 'Approved'
    ? <Badge tone="success" dot>Effective</Badge>
    : <Badge tone="warning" dot>{status === 'Draft' ? 'Draft, not reviewed' : status}</Badge>;

export function Score({ value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label">Retrieval score</span>
      <Bar value={value} className="w-14" label="Retrieval score" />
      <span className="num font-mono text-[12px] font-medium text-slate">{value.toFixed(2)}</span>
    </div>
  );
}

/** Inline numbered marker. Hover or focus shows a compact preview. */
export function CitationMarker({ source, selected, onSelect }) {
  return (
    <Tip.Root delayDuration={120}>
      <Tip.Trigger asChild>
        <button
          onClick={onSelect}
          aria-label={`Source ${source.n}: ${source.title}`}
          aria-pressed={selected}
          className={cn(
            'relative -top-px mx-0.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded px-1 align-baseline text-[11px] font-semibold leading-none tabular-nums transition-colors duration-200',
            selected ? 'bg-primary-subtle text-primary ring-1 ring-primary/60' : 'text-primary hover:bg-primary-subtle',
          )}
        >
          {source.n}
        </button>
      </Tip.Trigger>
      <Tip.Portal>
        <Tip.Content side="top" align="start" sideOffset={6} collisionPadding={12} className="z-[70] w-[300px] rounded-card border border-line bg-surface p-3 shadow-pop">
          <p className="text-[13px] font-semibold leading-snug">{source.title}</p>
          <div className="mt-0.5"><SourceMeta s={source} /></div>
          <p className="mt-2 line-clamp-3 text-[12.5px] leading-[1.5] text-ink">{source.excerpt}</p>
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  );
}

/** Retrieval chunk. Default, selected (shares the marker's token) and expanded. */
export function SourceCard({ source, selected, expanded, onSelect, onToggle, onOpen }) {
  const ref = useRef(null);
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [selected]);
  return (
    <article
      ref={ref} id={`source-${source.id}`}
      className={cn('rounded-[10px] border p-3.5 transition-colors duration-200', selected ? 'border-primary/50 bg-primary-tint' : 'border-line bg-surface hover:border-[#c6d3da]')}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onSelect} aria-label={`Select source ${source.n}`}
          className={cn('mt-px grid h-5 min-w-5 shrink-0 place-items-center rounded px-1 text-[11px] font-semibold tabular-nums transition-colors duration-200', selected ? 'bg-primary text-white' : 'bg-neutral text-slate hover:bg-primary-subtle hover:text-primary')}
        >
          {source.n}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-semibold leading-snug">{source.title}</h4>
            <StatusPill status={source.status} />
          </div>
          <div className="mt-1"><SourceMeta s={source} /></div>
        </div>
      </div>

      <p className={cn('mt-2.5 text-[13px] leading-[1.6] text-ink', !expanded && 'line-clamp-3')}>{expanded ? source.text : source.excerpt}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-2.5">
        <Score value={source.score} />
        <div className="flex items-center">
          <button onClick={onToggle} aria-expanded={expanded} className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-slate transition-colors hover:bg-neutral hover:text-ink">
            {expanded ? 'Less' : 'More'}
            <ChevronDown className={cn('size-3.5 transition-transform duration-150', expanded && 'rotate-180')} />
          </button>
          <button onClick={onOpen} aria-label="Open note" className="grid size-7 place-items-center rounded-md text-slate transition-colors hover:bg-neutral hover:text-ink"><FileText className="size-3.5" /></button>
        </div>
      </div>
    </article>
  );
}

/** The one deliberate exception to the neutral interface. */
export function ExternalCard({ paragraphs, note, warning }) {
  return (
    <div className="rounded-card border border-ext-line bg-ext p-4" role="note">
      <div className="flex items-center gap-2">
        <TriangleAlert className="size-[18px] text-ext-line" strokeWidth={2} />
        <p className="text-[14px] font-semibold">Outside approved material</p>
      </div>
      <div className="mt-2 space-y-2 text-[14.5px] leading-[1.6]">
        {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p.text}</p>)}
      </div>
      {warning && <p className="mt-3 text-[12.5px] text-warning">{warning}</p>}
      {note && <p className="mt-3 border-t border-ext-line/40 pt-3 text-[13px] text-slate">{note}</p>}
    </div>
  );
}

/** Expanded view of the same card family: the full note, excerpt highlighted. */
export function DocumentDrawer({ source, onClose, onPractise }) {
  const body = source?.text ?? '';
  const at = source ? body.indexOf(source.excerpt) : -1;
  return (
    <Sheet
      open={!!source} onOpenChange={(o) => !o && onClose()} title={source?.title}
      description={source && <div className="space-y-1.5"><SourceMeta s={source} /><StatusPill status={source.status} /></div>}
    >
      {source && (
        <div className="p-5">
          <p className="label mb-2">{source.section}</p>
          <p className="text-[14.5px] leading-[1.75]">
            {at >= 0 ? (
              <>
                {body.slice(0, at)}
                <mark className="rounded bg-primary-subtle px-0.5 text-ink shadow-[inset_0_-1px_0_rgb(var(--primary))]">{source.excerpt}</mark>
                {body.slice(at + source.excerpt.length)}
              </>
            ) : body}
          </p>
          <div className="my-5 h-px bg-line" />
          <Score value={source.score} />
          <p className="meta mt-3">Highlighted text is the part of this note that matched the question.</p>
          <Button className="mt-5 w-full" variant="secondary" onClick={onPractise}>Practise this concept</Button>
        </div>
      )}
    </Sheet>
  );
}
