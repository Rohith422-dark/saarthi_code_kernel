import * as Tip from '@radix-ui/react-tooltip';
import * as Dlg from '@radix-ui/react-dialog';
import * as Pop from '@radix-ui/react-popover';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const TooltipProvider = ({ children }) => <Tip.Provider delayDuration={200}>{children}</Tip.Provider>;
export function Tooltip({ label, side = 'right', children, disabled }) {
  if (disabled) return children;
  return (
    <Tip.Root>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content side={side} sideOffset={8} className="z-[70] rounded-md bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white shadow-pop">
          {label}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  );
}

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } };

/** Right-hand drawer (shadcn Sheet). */
export function Sheet({ open, onOpenChange, title, description, children, width = 'sm:max-w-[460px]' }) {
  return (
    <Dlg.Root open={open} onOpenChange={onOpenChange}>
      <Dlg.Portal forceMount>
        <AnimatePresence>
        {open && (
          <>
            <Dlg.Overlay asChild forceMount>
              <motion.div {...fade} className="fixed inset-0 z-50 bg-ink/25" />
            </Dlg.Overlay>
            <Dlg.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn('fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-surface shadow-dialog', width)}
              >
                <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <Dlg.Title className="text-[16px] font-semibold text-ink">{title}</Dlg.Title>
                    {description && <Dlg.Description asChild><div className="meta mt-1">{description}</div></Dlg.Description>}
                  </div>
                  <Dlg.Close className="grid size-8 shrink-0 place-items-center rounded-field text-slate transition-colors hover:bg-neutral hover:text-ink" aria-label="Close">
                    <X className="size-4" />
                  </Dlg.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              </motion.aside>
            </Dlg.Content>
          </>
        )}
        </AnimatePresence>
      </Dlg.Portal>
    </Dlg.Root>
  );
}

export function Dialog({ open, onOpenChange, title, children, className }) {
  return (
    <Dlg.Root open={open} onOpenChange={onOpenChange}>
      <Dlg.Portal>
        <Dlg.Overlay className="fixed inset-0 z-50 bg-ink/25" />
        <Dlg.Content aria-describedby={undefined} className={cn('fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-card border border-line bg-surface shadow-dialog', className)}>
          <Dlg.Title className="sr-only">{title}</Dlg.Title>
          {children}
        </Dlg.Content>
      </Dlg.Portal>
    </Dlg.Root>
  );
}

export const Popover = Pop.Root;
export const PopoverTrigger = Pop.Trigger;
export const PopoverContent = ({ className, align = 'start', side = 'top', ...p }) => (
  <Pop.Portal>
    <Pop.Content align={align} side={side} sideOffset={8} className={cn('z-[60] w-64 rounded-card border border-line bg-surface p-1.5 shadow-pop', className)} {...p} />
  </Pop.Portal>
);

/** Underline tabs; the indicator is a quiet CSS transition. */
export const TabsRoot = Tabs.Root;
export const TabsList = ({ className, ...p }) => (
  <Tabs.List className={cn('flex items-center gap-5 border-b border-line', className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }) => (
  <Tabs.Trigger
    className={cn('-mb-px border-b-2 border-transparent pb-2.5 pt-1 text-[13px] font-medium text-slate transition-colors duration-150 hover:text-ink data-[state=active]:border-primary data-[state=active]:text-primary', className)}
    {...p}
  />
);
export const TabsContent = Tabs.Content;
