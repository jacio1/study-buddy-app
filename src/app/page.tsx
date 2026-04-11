'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Flame, BookOpen, X, ChevronDown, ChevronUp,
  Wifi, Users, MapPin, SlidersHorizontal, Search,
} from 'lucide-react';
import { User, Profile, StudyListing, StudySession } from '../types/types';
import { supabase } from '../lib/supabase';
import { Header } from '../components/layout/Header';
import { SessionCard } from '../components/layout/SessionCard';
import { ListingCard } from '../components/layout/ListingCard';
import { cn } from '../lib/utils';
import { CATEGORIES, LEVELS, SCHEDULE_OPTIONS } from '../constants/listingConstants';

// ─── Constants ────────────────────────────────────────────────────────────────


type SortOption = 'newest' | 'oldest';
type FormatFilter = 'all' | 'online' | 'offline';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-800 pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-600" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [mySessions, setMySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [subjectSearch, setSubjectSearch] = useState('');

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => { checkUser(); }, []);
  useEffect(() => {
    if (user) { loadListings(); loadMySessions(); }
  }, [user, searchQuery]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/auth'); return; }
    setUser(session.user as User);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const loadListings = async () => {
    let query = supabase
      .from('study_listings')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
      );
    }

    const { data } = await query;
    if (data) setListings(data);
  };

  const loadMySessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('study_sessions')
      .select('*, study_listings(*)')
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setMySessions(data);
  };

  const handleDeleted = (id: string) => setListings((p) => p.filter((l) => l.id !== id));

  // Toggle helpers
  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  // Derived: unique cities present in listings
  const availableCities = useMemo(() => {
    const cities = listings
      .map((l) => l.city)
      .filter((c): c is string => !!c && c.trim() !== '');
    return Array.from(new Set(cities)).sort();
  }, [listings]);

  // Apply all filters
  const filteredListings = useMemo(() => {
    let r = [...listings];

    if (selectedCategories.length > 0)
      r = r.filter((l) => selectedCategories.includes(l.category));
    if (selectedLevels.length > 0)
      r = r.filter((l) => selectedLevels.includes(l.level));
    if (formatFilter !== 'all')
      r = r.filter((l) => l.format === formatFilter);
    if (cityFilter.trim())
      r = r.filter((l) =>
        (l.city ?? '').toLowerCase().includes(cityFilter.toLowerCase())
      );
    if (subjectSearch.trim())
      r = r.filter((l) =>
        l.subject.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        l.title.toLowerCase().includes(subjectSearch.toLowerCase())
      );
    if (selectedSchedules.length > 0)
      r = r.filter((l) =>
        selectedSchedules.some((s) =>
          l.schedule.toLowerCase().includes(s.toLowerCase().split('(')[0].trim())
        )
      );
    if (onlyMine && user)
      r = r.filter((l) => l.user_id === user.id);

    r.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? db - da : da - db;
    });

    return r;
  }, [listings, selectedCategories, selectedLevels, formatFilter, cityFilter,
      subjectSearch, selectedSchedules, onlyMine, sortBy, user]);

  const activeFilterCount = [
    selectedCategories.length > 0,
    selectedLevels.length > 0,
    selectedSchedules.length > 0,
    formatFilter !== 'all',
    cityFilter !== '',
    onlyMine,
    sortBy !== 'newest',
    subjectSearch !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedLevels([]);
    setSelectedSchedules([]);
    setFormatFilter('all');
    setCityFilter('');
    setOnlyMine(false);
    setSortBy('newest');
    setSubjectSearch('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B1B1C] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  // ─── Sidebar content (shared between desktop + mobile drawer) ────────────────
  const SidebarContent = () => (
    <div className="space-y-4">
      {/* Quick subject search */}
      <FilterSection title="Поиск по предмету">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Python, Английский..."
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {subjectSearch && (
            <button
              onClick={() => setSubjectSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </FilterSection>

      {/* Categories */}
      <FilterSection title="Категория">
        <div className="space-y-1.5">
          {CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategories((p) => toggleArr(p, cat.id))}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left',
                  active
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                )}
              >
                <span>{cat.label}</span>
                {active && <X className="h-3 w-3 opacity-60 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Level */}
      <FilterSection title="Уровень">
        <div className="space-y-1.5">
          {LEVELS.map((lvl) => {
            const active = selectedLevels.includes(lvl.id);
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevels((p) => toggleArr(p, lvl.id))}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all border text-left',
                  active
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                  'bg-emerald-400': lvl.id === 'beginner',
                  'bg-amber-400':   lvl.id === 'intermediate',
                  'bg-rose-400':    lvl.id === 'advanced',
                })} />
                <span>{lvl.label}</span>
                {active && <X className="h-3 w-3 opacity-60 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Format */}
      <FilterSection title="Формат занятий">
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['all',     '🌐', 'Любой'],
            ['online',  '💻', 'Онлайн'],
            ['offline', '🤝', 'Офлайн'],
          ] as [FormatFilter, string, string][]).map(([val, icon, label]) => (
            <button
              key={val}
              onClick={() => setFormatFilter(val)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition-all',
                formatFilter === val
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              )}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* City */}
      <FilterSection title="Город" defaultOpen={false}>
        <div className="relative mb-3">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Москва, Берлин..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {cityFilter && (
            <button
              onClick={() => setCityFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* City quick-picks from actual listings */}
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableCities.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setCityFilter((p) => (p === c ? '' : c))}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border transition-all',
                  cityFilter === c
                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {availableCities.length === 0 && (
          <p className="text-xs text-gray-600 italic">Пока нет объявлений с указанным городом</p>
        )}
      </FilterSection>

      {/* Schedule */}
      <FilterSection title="Расписание" defaultOpen={false}>
        <div className="space-y-1.5">
          {SCHEDULE_OPTIONS.map((opt) => {
            const active = selectedSchedules.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => setSelectedSchedules((p) => toggleArr(p, opt))}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all text-left',
                  active
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <span>{opt}</span>
                {active && <X className="h-3 w-3 opacity-60" />}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Sort */}
      <FilterSection title="Сортировка" defaultOpen={false}>
        <div className="space-y-1.5">
          {([
            ['newest', '🆕 Сначала новые'],
            ['oldest', '🕰 Сначала старые'],
          ] as [SortOption, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm border transition-all',
                sortBy === val
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Only mine */}
      <div className="pt-1">
        <button
          onClick={() => setOnlyMine((v) => !v)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
            onlyMine
              ? 'bg-purple-600/15 border-purple-500/40 text-purple-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          )}
        >
          <span>Только мои объявления</span>
          <div className={cn(
            'relative w-9 h-5 rounded-full border transition-colors flex-shrink-0',
            onlyMine ? 'bg-purple-600 border-purple-600' : 'bg-gray-700 border-gray-600'
          )}>
            <span className={cn(
              'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
              onlyMine && 'translate-x-4'
            )} />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1B1B1C]">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        {/* Active sessions */}
        {mySessions.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Flame className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Мои активные сессии</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySessions.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </section>
        )}

        {/* Listings section */}
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">
            {searchQuery ? `«${searchQuery}»` : 'Все объявления'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-400 text-sm">
            {filteredListings.length}
          </span>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={cn(
              'ml-auto lg:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all',
              activeFilterCount > 0
                ? 'border-purple-500/50 bg-purple-600/10 text-purple-300'
                : 'border-gray-700 bg-gray-900 text-gray-400'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Фильтры
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedCategories.map((id) => {
              const cat = CATEGORIES.find((c) => c.id === id);
              return cat ? (
                <span key={id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 border border-purple-500/30 text-purple-300">
                  {cat.label}
                  <button onClick={() => setSelectedCategories((p) => p.filter((v) => v !== id))}><X className="h-3 w-3" /></button>
                </span>
              ) : null;
            })}
            {selectedLevels.map((id) => {
              const lvl = LEVELS.find((l) => l.id === id);
              return lvl ? (
                <span key={id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300">
                  {lvl.label}
                  <button onClick={() => setSelectedLevels((p) => p.filter((v) => v !== id))}><X className="h-3 w-3" /></button>
                </span>
              ) : null;
            })}
            {formatFilter !== 'all' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300">
                {formatFilter === 'online' ? '💻 Онлайн' : '🤝 Офлайн'}
                <button onClick={() => setFormatFilter('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {cityFilter && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300">
                📍 {cityFilter}
                <button onClick={() => setCityFilter('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedSchedules.map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300">
                🕐 {s}
                <button onClick={() => setSelectedSchedules((p) => p.filter((v) => v !== s))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {onlyMine && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300">
                Мои объявления
                <button onClick={() => setOnlyMine(false)}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-gray-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
            >
              <X className="h-3 w-3" /> Сбросить все
            </button>
          </div>
        )}

        {/* Main layout: sidebar + grid */}
        <div className="flex gap-6 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                Фильтры
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Сбросить
                </button>
              )}
            </div>
            <SidebarContent />
          </aside>

          {/* Listings grid */}
          <div className="flex-1 min-w-0">
            {filteredListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-400 text-lg mb-2">Ничего не найдено</p>
                <p className="text-gray-600 text-sm mb-6">
                  Попробуйте изменить или сбросить фильтры
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4"
                  >
                    Сбросить все фильтры
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    currentUserId={user?.id}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] bg-gray-900 border-r border-gray-800 z-50 overflow-y-auto p-5 lg:hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                Фильтры
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-400">
                    Сбросить
                  </button>
                )}
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <SidebarContent />
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Показать {filteredListings.length} объявлений
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}