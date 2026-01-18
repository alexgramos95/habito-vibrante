import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";

export type TemporalView = 'dia' | 'semana' | 'mes';

interface TemporalTabsProps {
  active: TemporalView;
  onChange: (view: TemporalView) => void;
}

/**
 * Temporal navigation tabs for becoMe
 * Dia = ação
 * Semana = ritmo
 * Mês = narrativa
 */
export const TemporalTabs = ({ active, onChange }: TemporalTabsProps) => {
  const { locale } = useI18n();

  const tabs: { id: TemporalView; label: string }[] = [
    { id: 'dia', label: locale === 'pt-PT' ? 'Dia' : 'Day' },
    { id: 'semana', label: locale === 'pt-PT' ? 'Semana' : 'Week' },
    { id: 'mes', label: locale === 'pt-PT' ? 'Mês' : 'Month' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 touch-target",
            active === tab.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
