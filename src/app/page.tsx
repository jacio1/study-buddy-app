"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Flame,
  BookOpen,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { User, Profile, StudyListing, StudySession } from "@/src/types/types";
import { supabase } from "@/src/lib/supabase";
import { Header } from "@/src/components/layout/Header";
import { SessionCard } from "@/src/components/layout/SessionCard";
import { ListingCard } from "@/src/components/layout/ListingCard";
import {
  CATEGORIES,
  LEVELS,
  SCHEDULE_OPTIONS,
} from "@/src/constants/listingConstants";
import { cn } from "@/src/lib/utils";

type SortOption = "newest" | "oldest";
type FormatFilter = "all" | "online" | "offline";

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [activeSessions, setActiveSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [cityFilter, setCityFilter] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [subjectSearch, setSubjectSearch] = useState("");

  const searchQuery = searchParams.get("search") || "";

  useEffect(() => {
    checkUser();
  }, []);
  useEffect(() => {
    if (user) {
      loadListings();
      loadActiveSessions();
    }
  }, [user, searchQuery]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/auth");
      return;
    }
    setUser(session.user as User);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (data) setProfile(data);
  };

  const loadListings = async () => {
    let q = supabase
      .from("study_listings")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (searchQuery)
      q = q.or(
        `title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
      );
    const { data } = await q;
    if (data) setListings(data);
  };

  const loadActiveSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_sessions")
      .select("*, study_listings(*)")
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .in("status", ["active", "pending_confirmation"])
      .order("created_at", { ascending: false });
    if (data) setActiveSessions(data);
  };

  const handleDeleted = (id: string) =>
    setListings((p) => p.filter((l) => l.id !== id));

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const availableCities = useMemo(
    () =>
      Array.from(
        new Set(listings.map((l) => l.city).filter((c): c is string => !!c)),
      ).sort(),
    [listings],
  );

  const filteredListings = useMemo(() => {
    let r = [...listings];
    if (selectedCategories.length > 0)
      r = r.filter((l) => selectedCategories.includes(l.category));
    if (selectedLevels.length > 0)
      r = r.filter((l) => selectedLevels.includes(l.level));
    if (formatFilter !== "all") r = r.filter((l) => l.format === formatFilter);
    if (cityFilter.trim())
      r = r.filter((l) =>
        (l.city ?? "").toLowerCase().includes(cityFilter.toLowerCase()),
      );
    if (subjectSearch.trim())
      r = r.filter(
        (l) =>
          l.subject.toLowerCase().includes(subjectSearch.toLowerCase()) ||
          l.title.toLowerCase().includes(subjectSearch.toLowerCase()),
      );
    if (selectedSchedules.length > 0)
      r = r.filter((l) =>
        selectedSchedules.some((s) =>
          l.schedule
            .toLowerCase()
            .includes(s.toLowerCase().split("(")[0].trim()),
        ),
      );
    if (onlyMine && user) r = r.filter((l) => l.user_id === user.id);
    r.sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === "newest" ? -diff : diff;
    });
    return r;
  }, [
    listings,
    selectedCategories,
    selectedLevels,
    formatFilter,
    cityFilter,
    subjectSearch,
    selectedSchedules,
    onlyMine,
    sortBy,
    user,
  ]);

  const activeFilterCount = [
    selectedCategories.length > 0,
    selectedLevels.length > 0,
    selectedSchedules.length > 0,
    formatFilter !== "all",
    cityFilter !== "",
    onlyMine,
    subjectSearch !== "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedLevels([]);
    setSelectedSchedules([]);
    setFormatFilter("all");
    setCityFilter("");
    setOnlyMine(false);
    setSortBy("newest");
    setSubjectSearch("");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Загрузка...</div>
      </div>
    );

  // ── Sidebar content (без сортировки) ──
  const SidebarContent = () => (
    <div className="space-y-4">
      <FilterSection title="ㅤ">
        <div></div>
      </FilterSection>

      <FilterSection title="Категория">
        <div className="space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategories((p) => toggleArr(p, cat.id))}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left border",
                selectedCategories.includes(cat.id)
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted",
              )}
            >
              {cat.label}
              {selectedCategories.includes(cat.id) && (
                <X className="h-3 w-3 opacity-60" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Уровень">
        <div className="space-y-1">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevels((p) => toggleArr(p, lvl.id))}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all border text-left",
                selectedLevels.includes(lvl.id)
                  ? "bg-muted border-border text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full", {
                  "bg-emerald-400": lvl.id === "beginner",
                  "bg-amber-400": lvl.id === "intermediate",
                  "bg-rose-400": lvl.id === "advanced",
                })}
              />
              {lvl.label}
              {selectedLevels.includes(lvl.id) && (
                <X className="h-3 w-3 opacity-60 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Формат">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["all", "🌐", "Любой"],
              ["online", "💻", "Онлайн"],
              ["offline", "🤝", "Офлайн"],
            ] as [FormatFilter, string, string][]
          ).map(([val, icon, label]) => (
            <button
              key={val}
              onClick={() => setFormatFilter(val)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium border transition-all",
                formatFilter === val
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border bg-card",
              )}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Город" defaultOpen={false}>
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Москва, Берлин..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        {availableCities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableCities.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setCityFilter((p) => (p === c ? "" : c))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs border transition-all",
                  cityFilter === c
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      <FilterSection title="Расписание" defaultOpen={false}>
        <div className="space-y-1">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedSchedules((p) => toggleArr(p, opt))}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all text-left",
                selectedSchedules.includes(opt)
                  ? "bg-secondary/10 border-secondary/30 text-secondary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {opt}
              {selectedSchedules.includes(opt) && (
                <X className="h-3 w-3 opacity-60" />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      <div className="pt-1">
        <button
          onClick={() => setOnlyMine((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
            onlyMine
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:text-foreground bg-card",
          )}
        >
          Только мои объявления
          <div
            className={cn(
              "relative w-9 h-5 rounded-full border transition-colors",
              onlyMine ? "bg-primary border-primary" : "bg-muted border-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                onlyMine && "translate-x-4",
              )}
            />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        {/* ── Active sessions ── */}
        {activeSessions.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Мои активные сессии
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                {activeSessions.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

        {/* ── Listings section ── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {searchQuery ? `«${searchQuery}»` : "Все объявления"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-sm bg-muted text-muted-foreground">
              {filteredListings.length}
            </span>
          </div>

          {/* ── Сортировка — справа в шапке ── */}
          <div className="flex items-center ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground mr-2.5" />
            <button
              onClick={() => setSortBy("newest")}
              className={cn(
                "px-2.5 py-1 rounded-l-md text-xs font-medium border transition-colors",
                sortBy === "newest"
                  ? "bg-foreground/10 border-border text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Новые
            </button>
            <button
              onClick={() => setSortBy("oldest")}
              className={cn(
                "px-2.5 py-1 rounded-r-md text-xs font-medium border border-l-0 transition-colors",
                sortBy === "oldest"
                  ? "bg-foreground/10 border-border text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Старые
            </button>
          </div>

          {/* Mobile filter button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={cn(
              "lg:hidden flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium",
              activeFilterCount > 0
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground bg-card",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Фильтры
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
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
                <span
                  key={id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/30 text-primary"
                >
                  {cat.label}
                  <button
                    onClick={() =>
                      setSelectedCategories((p) => p.filter((v) => v !== id))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
            {selectedLevels.map((id) => {
              const lvl = LEVELS.find((l) => l.id === id);
              return lvl ? (
                <span
                  key={id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground"
                >
                  {lvl.label}
                  <button
                    onClick={() =>
                      setSelectedLevels((p) => p.filter((v) => v !== id))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
            {formatFilter !== "all" && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground">
                {formatFilter === "online" ? "💻 Онлайн" : "🤝 Офлайн"}
                <button onClick={() => setFormatFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {cityFilter && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground">
                📍 {cityFilter}
                <button onClick={() => setCityFilter("")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedSchedules.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 border border-secondary/30 text-secondary"
              >
                {s}
                <button
                  onClick={() =>
                    setSelectedSchedules((p) => p.filter((v) => v !== s))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" /> Сбросить
            </button>
          </div>
        )}

        {/* ── Sidebar + Grid layout ── */}
        <div className="flex gap-6 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-20 rounded-xl border border-border p-5 space-y-4 bg-card">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Фильтры
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
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
                <p className="text-muted-foreground text-lg mb-2">
                  Ничего не найдено
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-primary hover:text-primary/80 underline underline-offset-4"
                  >
                    Сбросить фильтры
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
          <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] z-50 overflow-y-auto p-5 lg:hidden border-r border-border bg-card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Фильтры
              </h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Сбросить
                  </button>
                )}
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <SidebarContent />
            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
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
