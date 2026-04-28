import { SCHEDULE_OPTIONS } from '@/src/constants/listingConstants';
import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';
import { X } from 'lucide-react';

export function ScheduleFilter() {
  const { schedules, toggleSchedule } = useFilters();

  return (
    <FilterSection title="Расписание" defaultOpen={false}>
      <div className="space-y-1">
        {SCHEDULE_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleSchedule(opt)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all text-left",
              schedules.includes(opt)
                ? "bg-secondary/10 border-secondary/30 text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {opt}
            {schedules.includes(opt) && (
              <X className="h-3 w-3 opacity-60" />
            )}
          </button>
        ))}
      </div>
    </FilterSection>
  );
}