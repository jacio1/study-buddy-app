import { X } from 'lucide-react';
import { useFilters } from '@/src/store/filteredStore';
import { CATEGORIES, LEVELS } from '@/src/constants/listingConstants';

interface ActiveFiltersProps {
  onReset?: () => void;
}

export function ActiveFilters({ onReset }: ActiveFiltersProps) {
  const {
    categories,
    levels,
    format,
    city,
    schedules,
    resetFilters,
  } = useFilters();

  const activeCount = [
    categories.length > 0,
    levels.length > 0,
    schedules.length > 0,
    format !== 'all',
    city !== '',
  ].filter(Boolean).length;

  if (activeCount === 0) return null;

  const handleReset = () => {
    resetFilters();
    onReset?.();
  };

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {categories.map((id) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return cat ? (
          <ActiveFilterTag key={id} onRemove={() => useFilters.getState().toggleCategory(id)}>
            {cat.label}
          </ActiveFilterTag>
        ) : null;
      })}
      
      {levels.map((id) => {
        const lvl = LEVELS.find((l) => l.id === id);
        return lvl ? (
          <ActiveFilterTag key={id} onRemove={() => useFilters.getState().toggleLevel(id)}>
            {lvl.label}
          </ActiveFilterTag>
        ) : null;
      })}
      
      {format !== 'all' && (
        <ActiveFilterTag onRemove={() => useFilters.getState().setFormat('all')}>
          {format === 'online' ? '💻 Онлайн' : '🤝 Офлайн'}
        </ActiveFilterTag>
      )}
      
      {city && (
        <ActiveFilterTag onRemove={() => useFilters.getState().setCity('')}>
          📍 {city}
        </ActiveFilterTag>
      )}
      
      {schedules.map((s) => (
        <ActiveFilterTag key={s} onRemove={() => useFilters.getState().toggleSchedule(s)}>
          {s}
        </ActiveFilterTag>
      ))}
      
      <button
        onClick={handleReset}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <X className="h-3 w-3" /> Сбросить
      </button>
    </div>
  );
}

function ActiveFilterTag({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/30 text-primary">
      {children}
      <button onClick={onRemove}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}