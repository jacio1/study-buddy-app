import { useMemo } from 'react';
import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';
import { StudyListing } from '@/src/types/types';

interface CityFilterProps {
  listings: StudyListing[];
}

export function CityFilter({ listings }: CityFilterProps) {
  const { city, setCity } = useFilters();
  
  const availableCities = useMemo(
    () =>
      Array.from(
        new Set(listings.map((l) => l.city).filter((c): c is string => !!c))
      ).sort(),
    [listings]
  );

  return (
    <FilterSection title="Город" defaultOpen={false}>
      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Москва, Берлин..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full pl-3 pr-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      {availableCities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableCities.slice(0, 8).map((c) => (
            <button
              key={c}
              onClick={() => setCity(city === c ? "" : c)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border transition-all",
                city === c
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </FilterSection>
  );
}