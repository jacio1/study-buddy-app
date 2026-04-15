'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Flame, BookOpen, Archive, Clock, SlidersHorizontal,
  X, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { User, Profile, StudyListing, StudySession } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { SessionCard } from '@/src/components/layout/SessionCard';
import { ListingCard } from '@/src/components/layout/ListingCard';
import { CATEGORIES, LEVELS, SCHEDULE_OPTIONS } from '@/src/constants/listingConstants';
import { cn } from '@/src/lib/utils';

type SortOption  = 'newest' | 'oldest';
type FormatFilter = 'all' | 'online' | 'offline';
type MainTab = 'listings' | 'history';

function FilterSection({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b pb-4" style={{ borderColor: 'var(--app-border)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-left mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-600" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-600" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function HomePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [user,     setUser]     = useState<User     | null>(null);
  const [profile,  setProfile]  = useState<Profile  | null>(null);
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [activeSessions,   setActiveSessions]   = useState<StudySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<StudySession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mainTab,  setMainTab]  = useState<MainTab>('listings');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels,     setSelectedLevels]     = useState<string[]>([]);
  const [selectedSchedules,  setSelectedSchedules]  = useState<string[]>([]);
  const [formatFilter,  setFormatFilter]  = useState<FormatFilter>('all');
  const [cityFilter,    setCityFilter]    = useState('');
  const [onlyMine,      setOnlyMine]      = useState(false);
  const [sortBy,        setSortBy]        = useState<SortOption>('newest');
  const [subjectSearch, setSubjectSearch] = useState('');

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (user) { loadListings(); loadSessions(); } }, [user, searchQuery]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/auth'); return; }
    setUser(session.user as User);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) setProfile(data);
  };

  const loadListings = async () => {
    let q = supabase.from('study_listings').select('*, profiles(*)')
      .order('created_at', { ascending: false }).limit(200);
    if (searchQuery)
      q = q.or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    const { data } = await q;
    if (data) setListings(data);
  };

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('study_sessions')
      .select('*, study_listings(*)')
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (data) {
      setActiveSessions(data.filter(s => s.status === 'active' || s.status === 'pending_deletion'));
      setCompletedSessions(data.filter(s => s.status === 'completed'));
    }
  };

  const handleDeleted = (id: string) => setListings(p => p.filter(l => l.id !== id));

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const availableCities = useMemo(() => {
    return Array.from(new Set(listings.map(l => l.city).filter((c): c is string => !!c))).sort();
  }, [listings]);

  const filteredListings = useMemo(() => {
    let r = [...listings];
    if (selectedCategories.length > 0) r = r.filter(l => selectedCategories.includes(l.category));
    if (selectedLevels.length     > 0) r = r.filter(l => selectedLevels.includes(l.level));
    if (formatFilter !== 'all')         r = r.filter(l => l.format === formatFilter);
    if (cityFilter.trim())              r = r.filter(l => (l.city ?? '').toLowerCase().includes(cityFilter.toLowerCase()));
    if (subjectSearch.trim())           r = r.filter(l =>
      l.subject.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      l.title.toLowerCase().includes(subjectSearch.toLowerCase()));
    if (selectedSchedules.length > 0)   r = r.filter(l =>
      selectedSchedules.some(s => l.schedule.toLowerCase().includes(s.toLowerCase().split('(')[0].trim())));
    if (onlyMine && user)               r = r.filter(l => l.user_id === user.id);
    r.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });
    return r;
  }, [listings, selectedCategories, selectedLevels, formatFilter, cityFilter,
      subjectSearch, selectedSchedules, onlyMine, sortBy, user]);

  const activeFilterCount = [
    selectedCategories.length > 0, selectedLevels.length > 0,
    selectedSchedules.length > 0, formatFilter !== 'all',
    cityFilter !== '', onlyMine, sortBy !== 'newest', subjectSearch !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategories([]); setSelectedLevels([]); setSelectedSchedules([]);
    setFormatFilter('all'); setCityFilter(''); setOnlyMine(false);
    setSortBy('newest'); setSubjectSearch('');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="text-white">Загрузка...</div>
    </div>
  );

  const SidebarContent = () => (
    <div className="space-y-4">
      <FilterSection title="Поиск по предмету">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input type="text" placeholder="Python, Английский..."
            value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-purple-500 transition-colors"
            style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
          />
        </div>
      </FilterSection>

      <FilterSection title="Категория">
        <div className="space-y-1">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategories(p => toggleArr(p, cat.id))}
              className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left border',
                selectedCategories.includes(cat.id)
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                  : 'text-gray-400 hover:text-white border-transparent hover:bg-gray-800'
              )}>
              {cat.label}
              {selectedCategories.includes(cat.id) && <X className="h-3 w-3 opacity-60" />}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Уровень">
        <div className="space-y-1">
          {LEVELS.map(lvl => (
            <button key={lvl.id} onClick={() => setSelectedLevels(p => toggleArr(p, lvl.id))}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all border text-left',
                selectedLevels.includes(lvl.id)
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
              )}>
              <span className={cn('w-2 h-2 rounded-full', {
                'bg-emerald-400': lvl.id === 'beginner',
                'bg-amber-400':   lvl.id === 'intermediate',
                'bg-rose-400':    lvl.id === 'advanced',
              })} />
              {lvl.label}
              {selectedLevels.includes(lvl.id) && <X className="h-3 w-3 opacity-60 ml-auto" />}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Формат">
        <div className="grid grid-cols-3 gap-1.5">
          {([['all','🌐','Любой'],['online','💻','Онлайн'],['offline','🤝','Офлайн']] as [FormatFilter,string,string][]).map(([val,icon,label]) => (
            <button key={val} onClick={() => setFormatFilter(val)}
              className={cn('flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition-all',
                formatFilter === val
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              )}>
              <span className="text-base">{icon}</span>{label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Город" defaultOpen={false}>
        <div className="relative mb-2">
          <input type="text" placeholder="Москва, Берлин..." value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full pl-3 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-purple-500 transition-colors"
            style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
          />
        </div>
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableCities.slice(0, 8).map(c => (
              <button key={c} onClick={() => setCityFilter(p => p === c ? '' : c)}
                className={cn('px-2.5 py-1 rounded-full text-xs border transition-all',
                  cityFilter === c ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                )}>
                {c}
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      <FilterSection title="Расписание" defaultOpen={false}>
        <div className="space-y-1">
          {SCHEDULE_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setSelectedSchedules(p => toggleArr(p, opt))}
              className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all text-left',
                selectedSchedules.includes(opt)
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
              )}>
              {opt}
              {selectedSchedules.includes(opt) && <X className="h-3 w-3 opacity-60" />}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Сортировка" defaultOpen={false}>
        {([['newest','🆕 Сначала новые'],['oldest','🕰 Сначала старые']] as [SortOption,string][]).map(([val,label]) => (
          <button key={val} onClick={() => setSortBy(val)}
            className={cn('w-full text-left px-3 py-2 rounded-lg text-sm border transition-all mb-1',
              sortBy === val ? 'bg-gray-800 border-gray-600 text-white' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
            )}>
            {label}
          </button>
        ))}
      </FilterSection>

      <div className="pt-1">
        <button onClick={() => setOnlyMine(v => !v)}
          className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
            onlyMine ? 'bg-purple-600/15 border-purple-500/40 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white'
          )}
          style={!onlyMine ? { backgroundColor: 'var(--app-input)' } : {}}>
          Только мои объявления
          <div className={cn('relative w-9 h-5 rounded-full border transition-colors',
            onlyMine ? 'bg-purple-600 border-purple-600' : 'bg-gray-700 border-gray-600')}>
            <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', onlyMine && 'translate-x-4')} />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Flame className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Мои активные сессии</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          </section>
        )}

        {/* Main tabs: Listings / History */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setMainTab('listings')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                mainTab === 'listings'
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              )}
              style={mainTab !== 'listings' ? { backgroundColor: 'var(--app-input)' } : {}}>
              <BookOpen className="h-4 w-4" />
              {searchQuery ? `«${searchQuery}»` : 'Все объявления'}
              <span className="px-1.5 py-0.5 rounded-full bg-purple-600/20 text-purple-300 text-xs">
                {filteredListings.length}
              </span>
            </button>

            {completedSessions.length > 0 && (
              <button onClick={() => setMainTab('history')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  mainTab === 'history'
                    ? 'bg-gray-700/60 border-gray-600 text-gray-200'
                    : 'border-gray-700 text-gray-400 hover:text-white'
                )}
                style={mainTab !== 'history' ? { backgroundColor: 'var(--app-input)' } : {}}>
                <Archive className="h-4 w-4" />
                История сессий
                <span className="px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs">
                  {completedSessions.length}
                </span>
              </button>
            )}
          </div>

          {/* Mobile filter btn (only for listings tab) */}
          {mainTab === 'listings' && (
            <button onClick={() => setMobileSidebarOpen(true)}
              className={cn('ml-auto lg:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all',
                activeFilterCount > 0 ? 'border-purple-500/50 bg-purple-600/10 text-purple-300' : 'border-gray-700 text-gray-400'
              )}
              style={activeFilterCount === 0 ? { backgroundColor: 'var(--app-input)' } : {}}>
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* History tab */}
        {mainTab === 'history' && (
          <div className="space-y-3">
            {completedSessions.map(session => (
              <div key={session.id}
                className="flex items-center justify-between px-5 py-4 rounded-xl border transition-all"
                style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-300 truncate">
                    {session.study_listings?.title ?? 'Сессия'}
                  </p>
                  <p className="text-xs text-purple-400 mt-0.5">{session.study_listings?.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Завершена {session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/sessions/${session.id}`)}
                  className="flex-shrink-0 ml-4 px-3 py-1.5 rounded-lg text-xs border text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}>
                  Архив
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Listings tab */}
        {mainTab === 'listings' && (
          <div className="flex gap-6 items-start">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 rounded-xl border p-5 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto"
              style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                  Фильтры
                </h3>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                    <X className="h-3 w-3" /> Сбросить
                  </button>
                )}
              </div>
              <SidebarContent />
            </aside>

            {/* Grid */}
            <div className="flex-1 min-w-0">
              {filteredListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-gray-400 text-lg mb-2">Ничего не найдено</p>
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4">
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing}
                      currentUserId={user?.id} onDeleted={handleDeleted} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] z-50 overflow-y-auto p-5 lg:hidden border-r"
            style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                Фильтры
              </h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-400">Сбросить</button>
                )}
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <SidebarContent />
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--app-border)' }}>
              <button onClick={() => setMobileSidebarOpen(false)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
                Показать {filteredListings.length} объявлений
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}