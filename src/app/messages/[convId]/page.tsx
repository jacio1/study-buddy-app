'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Loader2, BookOpen, Users, Lock } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { DirectConversation, DirectMessage, Profile, StudyListing, StudySession, User } from '@/src/types/types';
import { cn } from '@/src/lib/utils';

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

  const [user,      setUser]      = useState<User      | null>(null);
  const [otherUser, setOtherUser] = useState<Profile   | null>(null);
  const [listing,   setListing]   = useState<StudyListing | null>(null);
  const [session,   setSession]   = useState<StudySession | null>(null);
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

    const { data: conv } = await supabase
      .from('direct_conversations')
      .select('*, listing:study_listings(*)')
      .eq('id', convId).single();
    if (!conv) { router.push('/messages'); return; }
    if (conv.listing) setListing(conv.listing);

    const otherId = conv.user1_id === u.id ? conv.user2_id : conv.user1_id;
    const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId).single();
    if (other) setOtherUser(other);

    if (conv.listing_id) {
      const { data: sess } = await supabase.from('study_sessions').select('*')
        .eq('listing_id', conv.listing_id)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'study_sessions' },
        payload => setSession(payload.new as StudySession))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadMessages = async (uid: string) => {
    const { data } = await supabase.from('direct_messages')
      .select('*, profiles(*)').eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as DirectMessage[]);
    await supabase.from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', convId).eq('is_read', false).neq('sender_id', uid);
  };

  const handleStartSession = async () => {
    if (!user || !listing) return;
    const otherId = user.id === listing.user_id
      ? (session?.partner_id ?? '')
      : listing.user_id;

    // Check existing
    const { data: existing } = await supabase.from('study_sessions').select('*')
      .eq('listing_id', listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`).single();
    if (existing) { router.push(`/sessions/${existing.id}`); return; }

    // Create with pending_confirmation
    const { data: newSess, error } = await supabase.from('study_sessions')
      .insert([{
        listing_id:  listing.id,
        creator_id:  listing.user_id,
        partner_id:  listing.user_id === user.id ? otherId : user.id,
        initiated_by: user.id,
        status:      'pending_confirmation',
      }])
      .select().single();

    if (!error && newSess) {
      setSession(newSess);
      router.push(`/sessions/${newSess.id}`);
    }
  };

  const canSend = session?.status !== 'completed';

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || sending || !canSend) return;
    const content = text.trim();
    setText('');
    setSending(true);
    await supabase.from('direct_messages').insert([{ conversation_id: convId, sender_id: user.id, content }]);
    setSending(false);
  }, [text, user, sending, convId, canSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const renderMessages = () => {
    const items: React.ReactNode[] = [];
    let lastDate = '';
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at).toDateString();
      if (date !== lastDate) {
        lastDate = date;
        items.push(
          <div key={`sep-${i}`} className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--app-border)' }} />
            <span className="text-xs text-gray-500 font-medium px-2">{dateSep(msg.created_at)}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--app-border)' }} />
          </div>
        );
      }
      const isOwn  = msg.sender_id === user?.id;
      const prev   = messages[i - 1];
      const isFirst = !prev || prev.sender_id !== msg.sender_id ||
        new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();

      items.push(
        <div key={msg.id} className={cn('flex mb-1', isOwn ? 'justify-end' : 'justify-start')}>
          {!isOwn && (
            <div className="w-8 mr-2 flex-shrink-0 flex items-end">
              {isFirst && (otherUser?.avatar_url
                ? <img src={otherUser.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                : <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {otherUser?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
              )}
            </div>
          )}
          <div className={cn('max-w-[68%]', !isFirst && !isOwn && 'ml-10')}>
            {!isOwn && isFirst && (
              <p className="text-xs font-semibold text-purple-400 mb-1 ml-1">{otherUser?.full_name}</p>
            )}
            <div className={cn(
              'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
              isOwn ? 'bg-purple-600 text-white rounded-br-sm' : 'rounded-bl-sm',
            )} style={!isOwn ? { backgroundColor: 'var(--app-input)', color: 'var(--app-text)' } : {}}>
              {msg.content}
            </div>
            <p className={cn('text-[10px] mt-0.5 text-gray-500', isOwn ? 'text-right' : 'text-left ml-1')}>
              {timeLabel(msg.created_at)}
              {isOwn && <span className="ml-1.5">{msg.is_read ? '✓✓' : '✓'}</span>}
            </p>
          </div>
        </div>
      );
    });
    return items;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Fixed chat container centered */}
      <div className="flex flex-col mx-auto max-w-3xl h-screen">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/messages')}
              className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors hover:bg-gray-800 flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {otherUser?.avatar_url
              ? <img src={otherUser.avatar_url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
              : <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {otherUser?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm leading-tight truncate">
                {otherUser?.full_name ?? 'Пользователь'}
              </p>
              {listing && (
                <p className="text-xs text-purple-400 truncate flex items-center gap-1">
                  <BookOpen className="h-3 w-3 flex-shrink-0" />
                  {listing.title}
                </p>
              )}
            </div>
          </div>

          {/* Session button */}
          {listing && !session && (
            <button onClick={handleStartSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors flex-shrink-0">
              <Users className="h-3.5 w-3.5" />
              Начать сессию
            </button>
          )}
          {session && session.status !== 'completed' && (
            <button onClick={() => router.push(`/sessions/${session.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors flex-shrink-0">
              <Users className="h-3.5 w-3.5" />
              Перейти в сессию
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">👋</div>
              <p className="text-gray-400 font-medium">Начните разговор</p>
              <p className="text-gray-600 text-sm mt-1">Обсудите детали прежде чем начать совместную сессию</p>
            </div>
          ) : (
            <>
              {renderMessages()}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        {canSend ? (
          <div className="flex-shrink-0 px-4 py-3 border-t"
            style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-end gap-2">
              <textarea ref={textareaRef} rows={1} value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать сообщение…"
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 border transition-colors leading-relaxed"
                style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)', color: 'var(--app-text)', maxHeight: '120px', overflowY: 'auto' }}
              />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                className={cn(
                  'flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center border transition-all',
                  text.trim() && !sending
                    ? 'bg-purple-600 hover:bg-purple-700 border-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-600 border-gray-700 cursor-not-allowed',
                )}
                style={!text.trim() ? { backgroundColor: 'var(--app-input)' } : {}}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-600 mt-1.5">Enter — отправить · Shift+Enter — новая строка</p>
          </div>
        ) : (
          <div className="flex-shrink-0 px-4 py-4 border-t"
            style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Lock className="h-4 w-4" />
              <span>Переписка закрыта — сессия завершена</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}