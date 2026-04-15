'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, User as UserIcon, BookOpen,
  Clock, MessageCircle, Users, MapPin,
} from 'lucide-react';
import { Profile, StudyListing, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';

const levelLabels: Record<string, string> = {
  beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый',
};
const formatLabels: Record<string, string> = {
  online: '💻 Онлайн', offline: '🤝 Офлайн', any: '🌐 Любой формат',
};

export default function ListingDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const listingId = params.id as string;

  const [user,    setUser]    = useState<User    | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listing, setListing] = useState<StudyListing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkUser(); loadListing(); }, [listingId]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/auth'); return; }
    setUser(session.user as User);
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
  };

  const loadListing = async () => {
    const { data } = await supabase
      .from('study_listings').select('*, profiles(*)').eq('id', listingId).single();
    if (data) setListing(data); else router.push('/');
  };

  /** Find or create a direct_conversation tied to this listing */
  const getOrCreateConv = async (uid: string, otherId: string, lId: string): Promise<string> => {
    const [a, b] = uid < otherId ? [uid, otherId] : [otherId, uid];

    const { data: existing } = await supabase
      .from('direct_conversations')
      .select('id')
      .eq('user1_id', a).eq('user2_id', b).eq('listing_id', lId)
      .single();

    if (existing) return existing.id;

    const { data: created } = await supabase
      .from('direct_conversations')
      .insert([{ user1_id: a, user2_id: b, listing_id: lId }])
      .select('id').single();

    return created!.id;
  };

  const handleMessage = async () => {
    if (!user || !listing) return;
    setLoading(true);
    const convId = await getOrCreateConv(user.id, listing.user_id, listing.id);
    router.push(`/messages/${convId}`);
  };

  const handleStartSession = async () => {
    if (!user || !listing) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('study_sessions').select('*')
      .eq('listing_id', listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .single();

    if (existing) { router.push(`/sessions/${existing.id}`); return; }

    const { data: newSess, error } = await supabase
      .from('study_sessions')
      .insert([{ listing_id: listing.id, creator_id: listing.user_id, partner_id: user.id, status: 'active' }])
      .select().single();

    setLoading(false);
    if (!error && newSess) router.push(`/sessions/${newSess.id}`);
  };

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="text-white">Загрузка...</div>
    </div>
  );

  const isMyListing = listing.user_id === user?.id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6 text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> К объявлениям
        </Button>

        <div className="rounded-2xl p-8 border"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>

          <div className="flex justify-between items-start mb-6 gap-4">
            <h1 className="text-2xl font-bold text-white leading-snug flex-1">{listing.title}</h1>
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: 'var(--app-input)', color: 'var(--app-text-muted)' }}>
              {levelLabels[listing.level]}
            </span>
          </div>

          {/* Author */}
          <div className="flex items-center gap-4 pb-6 mb-6 border-b" style={{ borderColor: 'var(--app-border)' }}>
            {listing.profiles?.avatar_url
              ? <img src={listing.profiles.avatar_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
              : <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {listing.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            <div>
              <p className="text-white font-semibold">{listing.profiles?.full_name}</p>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(listing.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Info label="Предмет" icon={<BookOpen className="h-4 w-4" />}>
              <span className="text-purple-400 font-semibold text-lg">{listing.subject}</span>
            </Info>
            <Info label="Формат" icon={<UserIcon className="h-4 w-4" />}>
              <span className="text-gray-200">{formatLabels[listing.format ?? 'any']}</span>
            </Info>
            {listing.city && (
              <Info label="Город" icon={<MapPin className="h-4 w-4" />}>
                <span className="text-gray-200">{listing.city}</span>
              </Info>
            )}
            <Info label="Расписание" icon={<Clock className="h-4 w-4" />}>
              <span className="text-gray-200">{listing.schedule}</span>
            </Info>
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Описание</p>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Actions */}
          {!isMyListing ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleMessage}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-5 text-base"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Написать сообщение
                </Button>
                <Button
                  onClick={handleStartSession}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 py-5 text-base"
                >
                  <Users className="h-5 w-5 mr-2" />
                  {loading ? 'Создание...' : 'Начать сессию сразу'}
                </Button>
              </div>
              <p className="text-xs text-gray-600 text-center mt-3">
                Рекомендуем сначала познакомиться в чате, а потом создавать совместную сессию
              </p>
            </>
          ) : (
            <div className="rounded-xl p-4 text-center text-sm"
              style={{ backgroundColor: 'var(--app-input)', color: 'var(--app-text-muted)' }}>
              Это ваше объявление
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Info({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
        {icon}{label}
      </div>
      {children}
    </div>
  );
}