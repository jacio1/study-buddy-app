import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FiltersState {
  categories: string[];
  levels: string[];
  schedules: string[];
  format: 'all' | 'online' | 'offline';
  city: string;
  onlyMine: boolean;
  sortBy: 'newest' | 'oldest';
  subjectSearch: string;
  
  toggleCategory: (category: string) => void;
  toggleLevel: (level: string) => void;
  toggleSchedule: (schedule: string) => void;
  setFormat: (format: 'all' | 'online' | 'offline') => void;
  setCity: (city: string) => void;
  setOnlyMine: (value: boolean) => void;
  setSortBy: (sort: 'newest' | 'oldest') => void;
  setSubjectSearch: (search: string) => void;
  resetFilters: () => void;
}

export const useFilters = create<FiltersState>()(
  persist(
    (set) => ({
      categories: [],
      levels: [],
      schedules: [],
      format: 'all',
      city: '',
      onlyMine: false,
      sortBy: 'newest',
      subjectSearch: '',
      
      toggleCategory: (category) =>
        set((state) => ({
          categories: state.categories.includes(category)
            ? state.categories.filter(c => c !== category)
            : [...state.categories, category]
        })),
        
      toggleLevel: (level) =>
        set((state) => ({
          levels: state.levels.includes(level)
            ? state.levels.filter(l => l !== level)
            : [...state.levels, level]
        })),
        
      toggleSchedule: (schedule) =>
        set((state) => ({
          schedules: state.schedules.includes(schedule)
            ? state.schedules.filter(s => s !== schedule)
            : [...state.schedules, schedule]
        })),
        
      setFormat: (format) => set({ format }),
      setCity: (city) => set({ city }),
      setOnlyMine: (onlyMine) => set({ onlyMine }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSubjectSearch: (subjectSearch) => set({ subjectSearch }),
      
      resetFilters: () =>
        set({
          categories: [],
          levels: [],
          schedules: [],
          format: 'all',
          city: '',
          onlyMine: false,
          sortBy: 'newest',
          subjectSearch: '',
        }),
    }),
    {
      name: 'study-filters',
    }
  )
);