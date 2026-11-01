import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

const L = ['A', 'B', 'C', 'D'];

/** Multiple-choice card. `reveal` = { correctIndex } once the answer is graded. */
export default function QuestionCard({ question, choice, onChoose, reveal, disabled }) {
  return (
    <div>
      <p className="text-[18px] font-medium leading-snug tracking-[-0.01em]">{question.prompt}</p>
      <ul className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
        {question.options.map((opt, i) => {
          const picked = choice === i;
          const right = reveal && reveal.correctIndex === i;
          const wrong = reveal && picked && !right;
          return (
            <li key={opt}>
              <button
                role="radio" aria-checked={picked} disabled={disabled || !!reveal} onClick={() => onChoose(i)}
                className={cn(
                  'flex min-h-[48px] w-full items-center gap-3 rounded-field border px-3.5 py-2.5 text-left text-[14.5px] transition-colors duration-150',
                  !reveal && !picked && 'border-line bg-surface hover:border-[#c6d3da] hover:bg-neutral',
                  !reveal && picked && 'border-primary bg-primary-subtle',
                  right && 'border-success/60 bg-success-surface',
                  wrong && 'border-critical/50 bg-critical-surface',
                  reveal && !right && !wrong && 'border-line bg-surface opacity-60',
                )}
              >
                <span className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border text-[11.5px] font-semibold',
                  picked && !reveal ? 'border-primary bg-primary text-white' : 'border-line text-slate',
                  right && 'border-success bg-success text-white', wrong && 'border-critical bg-critical text-white',
                )}>
                  {right ? <Check className="size-3.5" /> : wrong ? <X className="size-3.5" /> : L[i]}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
