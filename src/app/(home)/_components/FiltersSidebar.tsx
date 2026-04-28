import { SlidersHorizontal, X } from 'lucide-react';
import { useFilters } from '@/src/store/filteredStore';
import { StudyListing } from '@/src/types/types';
import { CategoryFilter } from './filters/CategoryFilter';
import { LevelFilter } from './filters/LevelFilter';
import { FormatFilter } from './filters/FormatFilter';
import { CityFilter } from './filters/CityFilter';
import { ScheduleFilter } from './filters/ScheduleFilter';
import { OnlyMineFilter } from './filters/OnlyMineFilter';

interface FiltersSidebarProps {
  listings: StudyListing[];
  onClose?: () => void;
  isMobile?: boolean;
}

export function FiltersSidebar({ listings, onClose, isMobile }: FiltersSidebarProps) {
  const { resetFilters } = useFilters();
  const activeFilterCount = useFilters((state) => 
    [state.categories.length, state.levels.length, state.schedules.length]
      .filter(Boolean).length
  );

  return (
    <div className="space-y-4">
      {!isMobile && (
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Фильтры
          </h3>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Сбросить
            </button>
          )}
        </div>
      )}
      
      <CategoryFilter />
      <LevelFilter />
      <FormatFilter />
      <CityFilter listings={listings} />
      <ScheduleFilter />
      <OnlyMineFilter />
      
      {isMobile && (
        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            Показать объявления
          </button>
        </div>
      )}
    </div>
  );
}