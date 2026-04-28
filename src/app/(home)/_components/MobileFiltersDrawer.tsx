import { X, SlidersHorizontal } from 'lucide-react';
import { FiltersSidebar } from './FiltersSidebar';
import { StudyListing } from '@/src/types/types';

interface MobileFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  listings: StudyListing[];
}

export function MobileFiltersDrawer({ isOpen, onClose, listings }: MobileFiltersDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] z-50 overflow-y-auto p-5 lg:hidden border-r border-border bg-card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Фильтры
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <FiltersSidebar 
          listings={listings} 
          onClose={onClose} 
          isMobile 
        />
      </div>
    </>
  );
}