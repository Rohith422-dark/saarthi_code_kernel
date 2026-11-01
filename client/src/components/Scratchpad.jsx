import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Hand, PenLine, Trash2, Undo2 } from 'lucide-react';
import { Button } from './ui';
import { Tooltip } from './ui/overlay';
import { cn } from '../lib/utils';

const INKS = [['#172D3B', 'Navy'], ['#0F766E', 'Teal'], ['#2563EB', 'Blue']];
const WIDTH = { pen: 2.2, eraser: 16 };
const START_H = 900; // the sheet is taller than the window; it grows when you write near the bottom
const GROW = 500;
const MAX_H = 6000;

/**
 * Rough-work sheet. The window shows a slice of a taller page, and scrolling happens inside the sheet only:
 * the mouse wheel scrolls the sheet, never the page behind it. Draw with mouse, stylus or finger;
 * use the hand tool to scroll the sheet with a finger.
 */
export default function Scratchpad({ className, hint = 'Write your working here. Scroll down inside this page for more room.' }) {
  const sheet = useRef(null);
  const canvas = useRef(null);
  const strokes = useRef([]);
  const live = useRef(null);
  const [tool, setTool] = useState('pen');
  const [ink, setInk] = useState(INKS[0][0]);
  const [count, setCount] = useState(0);
  const [height, setHeight] = useState(START_H);

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      const [p0, ...rest] = s.points;
      if (!rest.length) { ctx.beginPath(); ctx.arc(p0.x, p0.y, s.width / 2, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      rest.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const fit = () => {
      const c = canvas.current;
      const w = sheet.current.clientWidth;
      if (!w) return; // hidden (e.g. another contest question is showing)
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(w * dpr);
      c.height = Math.round(height * dpr);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(sheet.current);
    return () => ro.disconnect();
  }, [paint, height]);

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect(); // already accounts for the sheet's scroll offset
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    if (tool === 'hand' || e.button > 0) return;
    canvas.current.setPointerCapture(e.pointerId);
    live.current = { tool, color: ink, width: WIDTH[tool], points: [pos(e)] };
    strokes.current.push(live.current);
    paint();
  };
  const move = (e) => {
    if (!live.current) return;
    const p = pos(e);
    live.current.points.push(p);
    if (p.y > height - 120 && height < MAX_H) setHeight((h) => Math.min(MAX_H, h + GROW));
    paint();
  };
  const up = () => {
    if (live.current) setCount(strokes.current.length);
    live.current = null;
  };
  const undo = () => { strokes.current.pop(); setCount(strokes.current.length); paint(); };
  const clear = () => { strokes.current = []; setCount(0); paint(); sheet.current.scrollTo({ top: 0, behavior: 'smooth' }); };

  const toolBtn = (id, Icon, label) => (
    <Tooltip label={label} side="bottom">
      <button
        onClick={() => setTool(id)} aria-pressed={tool === id} aria-label={label}
        className={cn('grid size-8 place-items-center rounded-field transition-colors duration-150', tool === id ? 'bg-primary-subtle text-primary' : 'text-slate hover:bg-neutral hover:text-ink')}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <h3 className="mr-auto text-[14px]">Rough work</h3>
        {toolBtn('pen', PenLine, 'Pen')}
        {toolBtn('eraser', Eraser, 'Eraser')}
        {toolBtn('hand', Hand, 'Scroll with finger')}
        <span className="mx-1 h-5 w-px bg-line" />
        <div className="flex items-center gap-1.5" role="group" aria-label="Ink colour">
          {INKS.map(([c, name]) => (
            <button
              key={c} aria-label={name} aria-pressed={ink === c && tool === 'pen'} onClick={() => { setInk(c); setTool('pen'); }}
              className={cn('size-5 rounded-full border-2 transition-transform duration-150', ink === c && tool === 'pen' ? 'scale-110 border-surface ring-2 ring-primary/60' : 'border-surface ring-1 ring-line')}
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-line" />
        <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!count} aria-label="Undo"><Undo2 /></Button>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!count}><Trash2 />Clear</Button>
      </div>

      {/* The only scrolling element: wheel and touch scrolling stay inside it. */}
      <div ref={sheet} className="relative h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain bg-surface" tabIndex={0} aria-label="Rough work sheet, scrollable">
        <div
          className="relative"
          style={{ height, backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 31px, rgb(var(--line)) 31px 32px)' }}
        >
          <canvas
            ref={canvas} aria-label="Draw your working here"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className={cn('absolute inset-0 size-full', tool === 'hand' ? 'cursor-grab touch-pan-y' : 'touch-none', tool === 'eraser' ? 'cursor-cell' : tool === 'pen' ? 'cursor-crosshair' : '')}
          />
          {count === 0 && <p className="pointer-events-none absolute left-4 top-3 text-[13px] text-faint">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
