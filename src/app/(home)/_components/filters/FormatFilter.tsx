import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';
import { FORMAT_OPTIONS } from '@/src/constants/listingConstants';

export function FormatFilter() {
  const { format, setFormat } = useFilters();

  return (
    <FilterSection title="Формат">
      <div className="grid grid-cols-3 gap-1.5">
        {FORMAT_OPTIONS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setFormat(id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition-all",
              format === id
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border bg-card"
            )}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </FilterSection>
  );
}