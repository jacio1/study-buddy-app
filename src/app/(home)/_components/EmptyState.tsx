import { useFilters } from '@/src/store/filteredStore';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-muted-foreground text-lg mb-2">
        Ничего не найдено
      </p>
      <button
        onClick={() => useFilters.getState().resetFilters()}
        className="text-sm text-primary hover:text-primary/80 underline underline-offset-4"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}