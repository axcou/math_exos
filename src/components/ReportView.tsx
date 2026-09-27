import type { Step } from '../exercises/types';
import { MathText } from './Math';
import { StepItem } from './Solution';

export interface ReportSection {
  title?: string;
  steps: Step[];
}

/** Méthode détaillée (sections d'étapes) dans un encadré de manuel. */
export function ReportView({ sections, tab = 'Méthode détaillée' }: { sections: ReportSection[]; tab?: string }) {
  return (
    <div className="box">
      <span className="box-tab">{tab}</span>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <section key={i}>
            {s.title && (
              <p className="mb-2 border-b border-chap/30 pb-1 font-sans font-semibold text-chap">
                <MathText text={s.title} />
              </p>
            )}
            <ol className="space-y-4">
              {s.steps.map((st, j) => (
                <StepItem key={j} step={st} index={j} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
