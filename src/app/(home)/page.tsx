'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/src/components/layout/Header';
import { useStudyData } from '@/src/hooks/useStudyData';
import { useFilteredListings } from '@/src/hooks/useFilteredListings';
import { useFilters } from '@/src/store/filteredStore';
import { useAuth } from '@/src/hooks/useAuth';
import { ActiveSessions } from './_components/ActiveSessions';
import { ListingHeader } from './_components/ListingHeader';
import { FiltersSidebar } from './_components/FiltersSidebar';
import { ListingsGrid } from './_components/ListingsGrid';
import { MobileFiltersDrawer } from './_components/MobileFiltersDrawer';
import { Loader } from '@/src/components/Loader';
import { ActiveFilters } from './_components/filters/ActiveFilters';

function SearchParamsHandler() {
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

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const searchQueryFromStore = useFilters((state) => state.subjectSearch);
  
  const { listings, activeSessions, profile, loading: dataLoading, handleDeleted } = useStudyData(user);
  const filteredListings = useFilteredListings(listings, user?.id);
  
  const activeFilterCount = useFilters((state) => 
    [state.categories.length, state.levels.length, state.schedules.length]
      .filter(Boolean).length
  );

  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader size="xl" />
        <p className="text-sm text-muted-foreground mt-6">
          Пожалуйста, подождите...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>

      <main className="container mx-auto px-4 py-8 mb-20">
        <ActiveSessions sessions={activeSessions} />

        <ListingHeader
          searchQuery={searchQueryFromStore}
          totalCount={filteredListings.length}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setMobileSidebarOpen(true)}
        />

        <ActiveFilters />

        <div className="flex gap-6 items-start">
          <aside className="hidden lg:block w-64 shrink-0 sticky top-20 rounded-xl border border-border p-5 bg-card">
            <FiltersSidebar listings={listings} />
          </aside>

          <div className="flex-1 min-w-0">
            <ListingsGrid
              listings={filteredListings}
              currentUserId={user?.id}
              onDeleted={handleDeleted}
            />
          </div>
        </div>
      </main>

      <MobileFiltersDrawer
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        listings={listings}
      />
    </div>
  );
}