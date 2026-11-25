import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PhilosophyPillar, ProofMetric, SectionAlign, SiteConfig } from '../types';
import { ResilientImage } from './ResilientImage';

interface PhilosophySectionProps {
  storeName: string;
  philosophy: SiteConfig['philosophy'];
  isHomeEditMode?: boolean;
  alignment?: SectionAlign;
  reverseSplit?: boolean;
  onEditHeader?: () => void;
  onHideSection?: () => void;
  onAddPillar?: () => void;
  onEditPillar?: (index: number, pillar: PhilosophyPillar) => void;
  onDeletePillar?: (index: number) => void;
  onAddMetric?: () => void;
  onEditMetric?: (index: number, metric: ProofMetric) => void;
  onDeleteMetric?: (index: number) => void;
}

export function PhilosophySection({
  storeName,
  philosophy,
  isHomeEditMode = false,
  alignment = 'left',
  reverseSplit = false,
  onEditHeader,
  onHideSection,
  onAddPillar,
  onEditPillar,
  onDeletePillar,
  onAddMetric,
  onEditMetric,
  onDeleteMetric,
}: PhilosophySectionProps) {
  if (!philosophy.visible) return null;

  const textAlignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
        ? 'text-right'
        : 'text-left';

  return (
    <section
      id="philosophy"
      className="border-t border-[#E4E4E0] bg-[#F2F2F0]/60 py-16 lg:py-20"
    >
      <div className="max-w-6xl mx-auto px-6">
        {isHomeEditMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-[#E4E4E0]">
            <span className="text-xs font-medium uppercase tracking-wider text-[#5A5A56]">
              Atelier &amp; Story Section
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {onEditHeader && (
                <button
                  type="button"
                  onClick={onEditHeader}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Heading &amp; Photo</span>
                </button>
              )}
              {onAddPillar && (
                <button
                  type="button"
                  onClick={onAddPillar}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pillar Box</span>
                </button>
              )}
              {onAddMetric && (
                <button
                  type="button"
                  onClick={onAddMetric}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Metric Box</span>
                </button>
              )}
              {onHideSection && (
                <button
                  type="button"
                  onClick={onHideSection}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Story Section</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          {/* Editorial Lab Photography */}
          <div className={`lg:col-span-6 ${reverseSplit ? 'lg:order-2' : 'lg:order-1'}`}>
            <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-lg overflow-hidden border border-[#E4E4E0] bg-[#F2F2F0]">
              <ResilientImage
                src={philosophy.imageUrl}
                alt={`${storeName} formulation studio`}
                fallbackLabel={`${storeName} Botanical Formulation Studio`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Numbered Formulation Principles & Adjacent Quantitative Rigor */}
          <div
            className={`lg:col-span-6 ${
              reverseSplit ? 'lg:order-1' : 'lg:order-2'
            } flex flex-col justify-center ${textAlignClass}`}
          >
            <p className="text-xs font-medium tracking-widest uppercase text-[var(--accent)] mb-3">
              {philosophy.eyebrow}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#141413] leading-tight text-balance mb-6">
              {philosophy.heading}
            </h2>

            <div className="divide-y divide-[#E4E4E0] border-t border-b border-[#E4E4E0]">
              {philosophy.pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className="py-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#141413]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#5A5A56] mt-1 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>

                  {isHomeEditMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditPillar && (
                        <button
                          type="button"
                          onClick={() => onEditPillar(idx, pillar)}
                          aria-label={`Edit ${pillar.title}`}
                          className="p-1 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePillar && (
                        <button
                          type="button"
                          onClick={() => onDeletePillar(idx)}
                          aria-label={`Delete ${pillar.title}`}
                          className="p-1 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Adjacent Proof Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6">
              {philosophy.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className={
                    isHomeEditMode
                      ? 'p-3 bg-white border border-[#E4E4E0] rounded-md flex items-start justify-between gap-2'
                      : ''
                  }
                >
                  <div className="min-w-0">
                    <p className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                      {metric.value}
                    </p>
                    <p className="text-xs text-[#5A5A56] mt-0.5">{metric.label}</p>
                  </div>

                  {isHomeEditMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditMetric && (
                        <button
                          type="button"
                          onClick={() => onEditMetric(idx, metric)}
                          aria-label={`Edit ${metric.label}`}
                          className="p-1 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteMetric && (
                        <button
                          type="button"
                          onClick={() => onDeleteMetric(idx)}
                          aria-label={`Delete ${metric.label}`}
                          className="p-1 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
