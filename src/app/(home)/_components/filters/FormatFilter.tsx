import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';

export function FormatFilter() {
  const { format, setFormat } = useFilters();

  const formats: Array<{ value: 'all' | 'online' | 'offline'; icon: string; label: string }> = [
    { value: 'all', icon: '🌐', label: 'Любой' },
    { value: 'online', icon: '💻', label: 'Онлайн' },
    { value: 'offline', icon: '🤝', label: 'Офлайн' },
  ];

  return (
    <FilterSection title="Формат">
      <div className="grid grid-cols-3 gap-1.5">
        {formats.map(({ value, icon, label }) => (
          <button
            key={value}
            onClick={() => setFormat(value)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition-all",
              format === value
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