import { useMemo } from 'react';
import { StudyListing } from '@/src/types/types';
import { useFilters } from '../store/filteredStore';

export function useFilteredListings(listings: StudyListing[], userId?: string) {
  const {
    categories,
    levels,
    schedules,
    format,
    city,
    onlyMine,
    sortBy,
    subjectSearch,
  } = useFilters();

  return useMemo(() => {
    let filtered = [...listings];

    if (categories.length > 0) {
      filtered = filtered.filter(l => categories.includes(l.category));
    }

    if (levels.length > 0) {
      filtered = filtered.filter(l => levels.includes(l.level));
    }

    if (format !== 'all') {
      filtered = filtered.filter(l => l.format === format);
    }

    if (city.trim()) {
      filtered = filtered.filter(l =>
        l.city?.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (subjectSearch.trim()) {
      const search = subjectSearch.toLowerCase();
      filtered = filtered.filter(l =>
        l.subject.toLowerCase().includes(search) ||
        l.title.toLowerCase().includes(search)
      );
    }

    if (schedules.length > 0) {
      filtered = filtered.filter(l =>
        schedules.some(s =>
          l.schedule.toLowerCase().includes(s.toLowerCase().split('(')[0].trim())
        )
      );
    }

    if (onlyMine && userId) {
      filtered = filtered.filter(l => l.user_id === userId);
    }

    filtered.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });

    return filtered;
  }, [listings, categories, levels, schedules, format, city, onlyMine, sortBy, subjectSearch, userId]);
}