import { ArrowUpDown } from 'lucide-react';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';

export function SortControls() {
  const { sortBy, setSortBy } = useFilters();

  return (
    <div className="flex items-center ml-auto">
      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground mr-2.5" />
      <button
        onClick={() => setSortBy('newest')}
        className={cn(
          "px-2.5 py-1 rounded-l-md text-xs font-medium border transition-colors",
          sortBy === 'newest'
            ? "bg-foreground/10 border-border text-foreground"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Новые
      </button>
      <button
        onClick={() => setSortBy('oldest')}
        className={cn(
          "px-2.5 py-1 rounded-r-md text-xs font-medium border border-l-0 transition-colors",
          sortBy === 'oldest'
            ? "bg-foreground/10 border-border text-foreground"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Старые
      </button>
    </div>
  );
}