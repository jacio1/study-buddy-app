'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flame, BookOpen } from 'lucide-react';
import { User, Profile, StudyListing, StudySession } from '../types/types';
import { supabase } from '../lib/supabase';
import { Header } from '../components/layout/Header';
import { SessionCard } from '../components/layout/SessionCard';
import { ListingCard } from '../components/layout/ListingCard';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [mySessions, setMySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadListings();
      loadMySessions();
    }
  }, [user, searchQuery]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth');
      return;
    }

    setUser(session.user as User);
    await loadProfile(session.user.id);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const loadListings = async () => {
    let query = supabase
      .from('study_listings')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B1B1C] flex items-center justify-center">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B1B1C]">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        {/* My Active Sessions */}
        {mySessions.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Flame className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">
                Мои активные сессии
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </section>
        )}

        {/* All Listings */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">
              {searchQuery ? `Результаты поиска: "${searchQuery}"` : 'Все объявления'}
            </h2>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                {searchQuery 
                  ? 'Ничего не найдено. Попробуйте изменить запрос.' 
                  : 'Пока нет объявлений. Создайте первое!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}