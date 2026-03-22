'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User as UserIcon, BookOpen, Clock } from 'lucide-react';
import { Profile, StudyListing, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';

const levelLabels = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый'
};

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listing, setListing] = useState<StudyListing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUser();
    loadListing();
  }, [listingId]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth');
      return;
    }

    setUser(session.user as User);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const loadListing = async () => {
    const { data } = await supabase
      .from('study_listings')
      .select('*, profiles(*)')
      .eq('id', listingId)
      .single();

    if (data) {
      setListing(data);
    } else {
      router.push('/');
    }
  };

  const handleProposePairing = async () => {
    if (!user || !listing) return;

    setLoading(true);

    // Проверка существующей сессии
    const { data: existingSession } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('listing_id', listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .single();

    if (existingSession) {
      router.push(`/sessions/${existingSession.id}`);
      return;
    }

    // Создание новой сессии
    const { data: newSession, error } = await supabase
      .from('study_sessions')
      .insert([{
        listing_id: listing.id,
        creator_id: listing.user_id,
        partner_id: user.id,
        status: 'active'
      }])
      .select()
      .single();

    setLoading(false);

    if (!error && newSession) {
      router.push(`/sessions/${newSession.id}`);
    }
  };

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#1B1B1C] flex items-center justify-center">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  const isMyListing = listing.user_id === user?.id;

  return (
    <div className="min-h-screen bg-[#1B1B1C]">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          К объявлениям
        </Button>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold text-white flex-1">
              {listing.title}
            </h1>
            <span className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium text-gray-300 ml-4">
              {levelLabels[listing.level]}
            </span>
          </div>

          {/* Author info */}
          <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-800">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {listing.profiles?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="text-white font-semibold">
                {listing.profiles?.full_name}
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(listing.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <BookOpen className="h-4 w-4" />
              <span>Предмет</span>
            </div>
            <p className="text-purple-400 font-semibold text-xl">
              {listing.subject}
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <UserIcon className="h-4 w-4" />
              <span>Описание</span>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Schedule */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Clock className="h-4 w-4" />
              <span>Расписание</span>
            </div>
            <p className="text-gray-300">
              {listing.schedule}
            </p>
          </div>

          {/* Action button */}
          {!isMyListing ? (
            <Button
              onClick={handleProposePairing}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
            >
              {loading ? 'Создание сессии...' : '🤝 Предложить совместное обучение'}
            </Button>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
              Это ваше объявление
            </div>
          )}
        </div>
      </main>
    </div>
  );
}