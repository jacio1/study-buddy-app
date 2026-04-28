'use client';

import { CATEGORIES } from '@/src/constants/listingConstants';
import { FilterSection } from './FilterSection';
import { useFilters } from '@/src/store/filteredStore';
import { cn } from '@/src/lib/utils';
import { X } from 'lucide-react';

export function CategoryFilter() {
  const { categories, toggleCategory } = useFilters();

  return (
    <FilterSection title="Категория">
      <div className="space-y-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left border",
              categories.includes(cat.id)
                ? "bg-primary/20 text-primary border-primary/40"
                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted"
            )}
          >
            {cat.label}
            {categories.includes(cat.id) && (
              <X className="h-3 w-3 opacity-60" />
            )}
          </button>
        ))}
      </div>
    </FilterSection>
  );
}