'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, User as UserIcon, BookOpen,
  Clock, MessageCircle, MapPin, Send,
} from 'lucide-react';
import { Profile, StudyListing, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { Loader } from '@/src/components/Loader';

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
  const [proposed, setProposed] = useState(false);

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
      .from('direct_conversations').select('id')
      .eq('user1_id', a).eq('user2_id', b).eq('listing_id', lId).single();
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


  const handleProposeSession = async () => {
    if (!user || !listing) return;
    setLoading(true);

    // Check if session already exists for this listing and user pair
    const { data: existing } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('listing_id', listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .in('status', ['pending_confirmation', 'active'])
      .single();

    if (existing) {
      // Session exists — go to it
      router.push(`/sessions/${existing.id}`);
      return;
    }

    // Create new session with pending_confirmation
    const { data: newSess, error } = await supabase
      .from('study_sessions')
      .insert([{
        listing_id:   listing.id,
        creator_id:   listing.user_id,   // listing owner = creator
        partner_id:   user.id,           // current user = partner (the one proposing)
        initiated_by: user.id,
        status:       'pending_confirmation',
      }])
      .select().single();

    setLoading(false);

    if (!error && newSess) {
      setProposed(true);
      // Also send a notification to the listing owner
      await supabase.from('notifications').insert([{
        user_id:  listing.user_id,
        actor_id: user.id,
        type:     'session_invite',
        title:    `${profile?.full_name ?? 'Пользователь'} предлагает совместную сессию`,
        body:     listing.title,
        link:     `/sessions/${newSess.id}`,
      }]);
    }
  };

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader/>
    </div>
  );

  const isMyListing = listing.user_id === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> К объявлениям
        </Button>

        <div className="rounded-2xl p-8 border border-border bg-card">

          {/* Title */}
          <div className="flex justify-between items-start mb-6 gap-4">
            <h1 className="text-2xl font-bold text-foreground leading-snug flex-1">{listing.title}</h1>
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0 bg-muted text-muted-foreground">
              {levelLabels[listing.level]}
            </span>
          </div>

          {/* Author */}
          <div className="flex items-center gap-4 pb-6 mb-6 border-b border-border">
            {listing.profiles?.avatar_url
              ? <img src={listing.profiles.avatar_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
              : <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {listing.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            <div>
              <p className="text-foreground font-semibold">{listing.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(listing.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Info label="Предмет" icon={<BookOpen className="h-4 w-4" />}>
              <span className="text-primary font-semibold text-lg">{listing.subject}</span>
            </Info>
            <Info label="Формат" icon={<UserIcon className="h-4 w-4" />}>
              <span className="text-foreground">{formatLabels[listing.format ?? 'any']}</span>
            </Info>
            {listing.city && (
              <Info label="Город" icon={<MapPin className="h-4 w-4" />}>
                <span className="text-foreground">{listing.city}</span>
              </Info>
            )}
            <Info label="Расписание" icon={<Clock className="h-4 w-4" />}>
              <span className="text-foreground">{listing.schedule}</span>
            </Info>
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Описание</p>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Actions */}
          {!isMyListing ? (
            <>
              {proposed ? (
                /* Success state after proposing */
                <div className="rounded-xl p-5 text-center border border-secondary/20 bg-secondary/5">
                  <p className="text-secondary font-semibold mb-1">✅ Предложение отправлено!</p>
                  <p className="text-sm text-muted-foreground">
                    Ждите подтверждения от {listing.profiles?.full_name?.split(' ')[0] ?? 'автора'}
                  </p>
                  <button
                    onClick={() => router.push('/messages')}
                    className="mt-3 text-sm text-primary hover:text-primary/80 underline underline-offset-4">
                    Написать в сообщениях
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Primary: Write message */}
                  <Button
                    onClick={handleMessage}
                    disabled={loading}
                    className="flex-1 py-5 text-base"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Написать сообщение
                  </Button>

                  {/* Secondary: Propose session */}
                  <Button
                    onClick={handleProposeSession}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 py-5 text-base"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    {loading ? 'Отправка...' : 'Предложить сессию'}
                  </Button>
                </div>
              )}

              {!proposed && (
                <p className="text-xs text-muted-foreground/60 text-center mt-3">
                  «Предложить сессию» отправит запрос — сессия начнётся только после подтверждения
                </p>
              )}
            </>
          ) : (
            <div className="rounded-xl p-4 text-center text-sm bg-muted text-muted-foreground">
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
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">
        {icon}{label}
      </div>
      {children}
    </div>
  );
}