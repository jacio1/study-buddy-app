'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { setSubjectSearch } = useFilters();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Добавьте эти console.log для диагностики
  console.log('HomePage - user:', user);
  console.log('HomePage - authLoading:', authLoading);
  
  const searchQueryFromStore = useFilters((state) => state.subjectSearch);
  
  const { listings, activeSessions, profile, loading: dataLoading, handleDeleted } = useStudyData(user);
  const filteredListings = useFilteredListings(listings, user?.id);
  
  const activeFilterCount = useFilters((state) => 
    [state.categories.length, state.levels.length, state.schedules.length]
      .filter(Boolean).length
  );

  const isLoading = authLoading || dataLoading;
  
  console.log('HomePage - isLoading:', isLoading);

  useEffect(() => {
    console.log('HomePage - useEffect for redirect:', { isLoading, user });
    if (!isLoading && !user) {
      console.log('HomePage - redirecting to /login');
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    console.log('HomePage - showing loader');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader size="xl" />
        <p className="text-sm text-muted-foreground mt-6">
          Пожалуйста, подождите...
        </p>
      </div>
    );
  }

  if (!user) {
    console.log('HomePage - no user, returning null');
    return null;
  }

  console.log('HomePage - rendering main content');
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