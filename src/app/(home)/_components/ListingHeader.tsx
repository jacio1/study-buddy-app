import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { SortControls } from './SortControls';

interface ListingHeaderProps {
  searchQuery: string;
  totalCount: number;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

export function ListingHeader({ 
  searchQuery, 
  totalCount, 
  activeFilterCount, 
  onOpenFilters 
}: ListingHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          {searchQuery ? `«${searchQuery}»` : "Все объявления"}
        </h2>
        <span className="px-2.5 py-0.5 rounded-full text-sm bg-muted text-muted-foreground">
          {totalCount}
        </span>
      </div>

      <SortControls />

      <button
        onClick={onOpenFilters}
        className={cn(
          "lg:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium",
          activeFilterCount > 0
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border text-muted-foreground bg-card"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Фильтры
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}