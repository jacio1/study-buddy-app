import { LEVELS } from '@/src/constants/listingConstants';
import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';
import { X } from 'lucide-react';

export function LevelFilter() {
  const { levels, toggleLevel } = useFilters();

  return (
    <FilterSection title="Уровень">
      <div className="space-y-1">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            onClick={() => toggleLevel(lvl.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all border text-left",
              levels.includes(lvl.id)
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span
              className={cn("w-2 h-2 rounded-full", {
                "bg-emerald-400": lvl.id === "beginner",
                "bg-amber-400": lvl.id === "intermediate",
                "bg-rose-400": lvl.id === "advanced",
              })}
            />
            {lvl.label}
            {levels.includes(lvl.id) && (
              <X className="h-3 w-3 opacity-60 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </FilterSection>
  );
}