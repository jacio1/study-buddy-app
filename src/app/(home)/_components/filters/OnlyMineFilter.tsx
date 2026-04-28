import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';

export function OnlyMineFilter() {
  const { onlyMine, setOnlyMine } = useFilters();

  return (
    <div className="pt-1">
      <button
        onClick={() => setOnlyMine(!onlyMine)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
          onlyMine
            ? "bg-primary/15 border-primary/40 text-primary"
            : "border-border text-muted-foreground hover:text-foreground bg-card"
        )}
      >
        Только мои объявления
        <div
          className={cn(
            "relative w-9 h-5 rounded-full border transition-colors",
            onlyMine ? "bg-primary border-primary" : "bg-muted border-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
              onlyMine && "translate-x-4"
            )}
          />
        </div>
      </button>
    </div>
  );
}