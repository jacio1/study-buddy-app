'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Send, Loader2, BookOpen, Users, Ban,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import {
  DirectConversation, DirectMessage, Profile,
  StudyListing, StudySession, User,
} from '@/src/types/types';
import { cn } from '@/src/lib/utils';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';

function timeLabel(d: string) {
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function dateSep(d: string) {
  const date = new Date(d), today = new Date(), yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yest.toDateString())  return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function DirectChatPage() {
  const router = useRouter();
  const params = useParams();
  const convId = params.convId as string;

  const [user,      setUser]      = useState<User             | null>(null);
  const [profile,   setProfile]   = useState<Profile          | null>(null);
  const [conv,      setConv]      = useState<DirectConversation | null>(null);
  const [otherUser, setOtherUser] = useState<Profile          | null>(null);
  const [listing,   setListing]   = useState<StudyListing     | null>(null);
  const [session,   setSession]   = useState<StudySession     | null>(null);
  const [messages,  setMessages]  = useState<DirectMessage[]>([]);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });
    return () => cleanup?.();
  }, [convId]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    const { data: { session: auth } } = await supabase.auth.getSession();
    if (!auth?.user) { router.push('/auth'); return; }
    const u = auth.user as User;
    setUser(u);
    
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single();
    if (prof) setProfile(prof);

    const { data: convData } = await supabase
      .from('direct_conversations')
      .select('*, listing:study_listings(*)')
      .eq('id', convId).single();
    if (!convData) { router.push('/messages'); return; }
    setConv(convData as DirectConversation);
    if (convData.listing) setListing(convData.listing);

    const otherId = convData.user1_id === u.id ? convData.user2_id : convData.user1_id;
    const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId).single();
    if (other) setOtherUser(other);

    if (convData.listing_id) {
      const { data: sess } = await supabase.from('study_sessions').select('*')
        .eq('listing_id', convData.listing_id)
        .or(`creator_id.eq.${u.id},partner_id.eq.${u.id}`)
        .order('created_at', { ascending: false }).limit(1);
      if (sess?.[0]) setSession(sess[0]);
    }

    await loadMessages(u.id);
    setLoading(false);

    const channel = supabase.channel(`dm-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async payload => {
        const msg = payload.new as DirectMessage;
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', msg.sender_id).single();
        setMessages(prev => [...prev, { ...msg, profiles: prof ?? undefined }]);
        if (msg.sender_id !== u.id)
          supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id).then(() => {});
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'study_sessions',
      }, payload => setSession(payload.new as StudySession))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'direct_conversations',
        filter: `id=eq.${convId}`,
      }, payload => setConv(payload.new as DirectConversation))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadMessages = async (uid: string) => {
    const { data } = await supabase.from('direct_messages')
      .select('*, profiles(*)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as DirectMessage[]);
    await supabase.from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', convId).eq('is_read', false).neq('sender_id', uid);
  };

  const handleStartSession = async () => {
    if (!user || !listing) return;
    const otherId = otherUser?.id ?? '';

    const { data: existing } = await supabase.from('study_sessions').select('*')
      .eq('listing_id', listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .in('status', ['pending_confirmation', 'active'])
      .single();
    if (existing) { router.push(`/sessions/${existing.id}`); return; }

    const { data: newSess, error } = await supabase.from('study_sessions').insert([{
      listing_id:   listing.id,
      creator_id:   listing.user_id,
      partner_id:   listing.user_id === user.id ? otherId : user.id,
      initiated_by: user.id,
      status:       'pending_confirmation',
    }]).select().single();

    if (!error && newSess) {
      setSession(newSess);
      router.push(`/sessions/${newSess.id}`);
    }
  };

  const isCurrentUserBlocked = !!conv?.blocked_by && conv.blocked_by !== user?.id;
  const currentUserIsBlocker = !!conv?.blocked_by && conv.blocked_by === user?.id;

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || sending || isCurrentUserBlocked) return;
    const content = text.trim();
    setText('');
    setSending(true);
    await supabase.from('direct_messages').insert([{
      conversation_id: convId,
      sender_id:       user.id,
      content,
    }]);
    setSending(false);
  }, [text, user, sending, convId, isCurrentUserBlocked]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const sessionBadge = () => {
    if (!session) return null;
    if (session.status === 'pending_confirmation') return { text: 'ожидает подтверждения', cls: 'text-accent bg-accent/10 border-accent/20' };
    if (session.status === 'active')               return { text: 'сессия активна',        cls: 'text-secondary bg-secondary/10 border-secondary/20' };
    if (session.status === 'completed')            return { text: 'сессия завершена',       cls: 'text-muted-foreground bg-muted border-border' };
    return null;
  };
  const badge = sessionBadge();

  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';

    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at).toDateString();
      if (date !== lastDate) {
        lastDate = date;
        items.push(
          <div key={`sep-${i}`} className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">{dateSep(msg.created_at)}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        );
      }

      const isOwn  = msg.sender_id === user?.id;
      const prev   = messages[i - 1];
      const isFirst = !prev || prev.sender_id !== msg.sender_id ||
        new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();

      items.push(
        <div key={msg.id} className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
          {!isOwn && (
            <div className="w-8 mr-2 flex-shrink-0 flex items-end">
              {isFirst && (
                otherUser?.avatar_url
                  ? <img src={otherUser.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {otherUser?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
              )}
            </div>
          )}
          <div className={cn('max-w-[70%]', !isFirst && !isOwn && 'ml-10')}>
            {!isOwn && isFirst && (
              <p className="text-xs font-semibold text-primary mb-1 ml-1">{otherUser?.full_name}</p>
            )}
            <div
              className={cn(
                'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                isOwn 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted text-foreground rounded-bl-sm'
              )}
            >
              {msg.content}
            </div>
            <p className={cn('text-[10px] mt-0.5 text-muted-foreground', isOwn ? 'text-right' : 'text-left ml-1')}>
              {timeLabel(msg.created_at)}
              {isOwn && <span className="ml-1.5">{msg.is_read ? '✓✓' : '✓'}</span>}
            </p>
          </div>
          {isOwn && (
            <div className="w-8 ml-2 flex-shrink-0 flex items-end">
              {isFirst && (
                profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
                    </div>
              )}
            </div>
          )}
        </div>
      );
    });

    return items;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={user!} profile={profile} />

      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {otherUser?.avatar_url
              ? <img src={otherUser.avatar_url} alt="avatar"
                  className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0', 
                    currentUserIsBlocker && 'grayscale opacity-70')} />
              : <div className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold flex-shrink-0',
                  currentUserIsBlocker ? 'bg-muted' : 'bg-primary'
                )}>
                  {otherUser?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            
            <div className="min-w-0">
              <h1 className="font-semibold text-foreground text-base sm:text-lg truncate">
                {otherUser?.full_name ?? 'Пользователь'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {listing && (
                  <p className="text-xs sm:text-sm text-primary truncate flex items-center gap-1">
                    <BookOpen className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{listing.title}</span>
                  </p>
                )}
                {badge && (
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border flex-shrink-0', badge.cls)}>
                    {badge.text}
                  </span>
                )}
                {currentUserIsBlocker && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-destructive bg-destructive/10 border border-destructive/20 flex-shrink-0">
                    заблокирован
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Session button */}
          <div className="flex-shrink-0">
            {listing && !session && (
              <Button onClick={handleStartSession} size="sm" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Начать сессию</span>
                <span className="sm:hidden">Сессия</span>
              </Button>
            )}
            {session && session.status !== 'completed' && (
              <Button 
                onClick={() => router.push(`/sessions/${session.id}`)} 
                variant="outline" 
                size="sm" 
                className="gap-1.5"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Перейти в сессию</span>
                <span className="sm:hidden">Сессия</span>
              </Button>
            )}
            {session && session.status === 'completed' && (
              <Button onClick={handleStartSession} variant="outline" size="sm" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Новая сессия</span>
                <span className="sm:hidden">Сессия</span>
              </Button>
            )}
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 rounded-xl border border-border overflow-hidden flex flex-col bg-card">
          
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <h3 className="text-base font-semibold text-foreground">💬 Чат</h3>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-4">👋</div>
                <p className="text-foreground font-medium">Начните разговор</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Обсудите детали перед тем как начать совместную сессию
                </p>
              </div>
            ) : (
              <>
                {renderMessages()}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input area */}
          {isCurrentUserBlocked ? (
            <div className="p-4 border-t border-border flex-shrink-0">
              <div className="flex flex-col items-center gap-2 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <Ban className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm font-medium text-foreground">Вы заблокированы</p>
                <p className="text-xs text-muted-foreground">
                  Владелец объявления ограничил отправку сообщений в этом чате
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-border flex-shrink-0">
              {currentUserIsBlocker && (
                <p className="text-xs text-center text-destructive/70 mb-3">
                  Вы заблокировали этого пользователя — он не может вам написать, но вы можете
                </p>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Напишите сообщение..."
                    className="w-full px-4 py-3 pr-4 rounded-xl resize-none text-sm min-h-[48px] max-h-32 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  size="icon"
                  className="h-12 w-12 flex-shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                Enter — отправить · Shift+Enter — новая строка
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}