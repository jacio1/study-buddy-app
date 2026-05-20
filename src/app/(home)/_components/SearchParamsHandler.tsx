'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFilters } from '@/src/store/filteredStore';

export function SearchParamsHandler() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { setSubjectSearch } = useFilters();

  useEffect(() => {
    if (searchQuery) {
      setSubjectSearch(searchQuery);
    }
  }, [searchQuery, setSubjectSearch]);

  return null;
}