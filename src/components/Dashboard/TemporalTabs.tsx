import { useI18n } from "@/i18n/I18nContext";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type TemporalView = 'dia' | 'semana' | 'mes';

interface TemporalTabsProps {
  active: TemporalView;
  onChange: (view: TemporalView) => void;
}

/**
 * Temporal navigation tabs for becoMe.
 * Uses unified SegmentedTabs primitive for visual consistency.
 */
export const TemporalTabs = ({ active, onChange }: TemporalTabsProps) => {
  const { locale } = useI18n();
  const isPT = locale === 'pt-PT';

  return (
    <div className="flex justify-center">
      <SegmentedTabs<TemporalView>
        value={active}
        onChange={onChange}
        size="md"
        options={[
          { value: 'dia',    label: isPT ? 'Dia'   : 'Day'   },
          { value: 'semana', label: isPT ? 'Semana': 'Week'  },
          { value: 'mes',    label: isPT ? 'Mês'   : 'Month' },
        ]}
        ariaLabel={isPT ? 'Período' : 'Period'}
      />
    </div>
  );
};
