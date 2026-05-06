'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageCircle, Search, Clock, Loader2, BookOpen,
  MoreVertical, Ban, XCircle,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { DirectConversation, DirectMessage, Profile, User } from '@/src/types/types';
import { Header } from '@/src/components/layout/Header';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';

/** Dropdown menu for listing owner actions on a conversation */
function ConvMenu({
  conv,
  userId,
  onClose,
  onBlock,
  onUnblock,
}: {
  conv: DirectConversation;
  userId: string;
  onClose: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isBlocked = !!conv.blocked_by;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border shadow-xl z-20 overflow-hidden py-1 bg-card"
        >
          {!isBlocked ? (
            <button
              onClick={() => { setOpen(false); onBlock(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <Ban className="h-4 w-4" />
              Заблокировать
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onUnblock(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary hover:bg-secondary/10 transition-colors text-left"
            >
              <Ban className="h-4 w-4" />
              Разблокировать
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
          >
            <XCircle className="h-4 w-4" />
            Закрыть диалог
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const [user,          setUser]          = useState<User    | null>(null);
  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) setProfile(data);
  };

  const loadConversations = async (uid: string) => {
    const { data: convs } = await supabase
      .from('direct_conversations')
      .select('*, listing:study_listings(*)')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .is('closed_by', null)
      .order('last_message_at', { ascending: false });

    if (!convs) return;

    const enriched = await Promise.all(convs.map(async conv => {
      const otherId = conv.user1_id === uid ? conv.user2_id : conv.user1_id;
      const [
        { data: otherUser },
        { data: lastMsgs },
        { count: unread },
        { data: sessData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('direct_messages').select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('direct_messages').select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', uid),
        conv.listing_id
          ? supabase.from('study_sessions').select('*')
              .eq('listing_id', conv.listing_id)
              .or(`creator_id.eq.${uid},partner_id.eq.${uid}`)
              .order('created_at', { ascending: false }).limit(1)
          : Promise.resolve({ data: null }),
      ]);

      return {
        ...conv,
        other_user:   otherUser ?? undefined,
        last_message: lastMsgs?.[0] as DirectMessage | undefined,
        unread_count: unread ?? 0,
        session:      sessData?.[0] ?? null,
      } as DirectConversation;
    }));

    setConversations(enriched);
  };

  const init = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) { 
    router.push('/auth'); 
    return; 
  }
  const u = session.user as User;
  setUser(u);
  await Promise.all([loadProfile(u.id), loadConversations(u.id)]);
  setLoading(false);

  // СОЗДАЕМ КАНАЛ
  const channel = supabase.channel('dm-list');
  
  // ДОБАВЛЯЕМ ВСЕ ОБРАБОТЧИКИ
  channel
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'direct_messages' },
      () => loadConversations(u.id)
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'study_sessions' },
      () => loadConversations(u.id)
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'direct_conversations' },
      () => loadConversations(u.id)
    );
  
  // ПОТОМ ПОДПИСЫВАЕМСЯ
  channel.subscribe();

  return () => { 
    supabase.removeChannel(channel); 
  };
};

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | undefined;
    
    init().then(fn => { 
      if (isMounted) cleanup = fn; 
    });
    
    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  /** Only listing owner can manage (block/close) a conversation */
  const isListingOwner = (conv: DirectConversation) =>
    !!conv.listing && conv.listing.user_id === user?.id;

  const handleClose = async (conv: DirectConversation) => {
    if (!user) return;
    if (!confirm('Закрыть этот диалог? Он исчезнет из вашего списка сообщений.')) return;
    await supabase.from('direct_conversations')
      .update({ closed_by: user.id, closed_at: new Date().toISOString() })
      .eq('id', conv.id);
    setConversations(prev => prev.filter(c => c.id !== conv.id));
  };

  const handleBlock = async (conv: DirectConversation) => {
    if (!user) return;
    if (!confirm('Заблокировать этого пользователя? Он не сможет отправлять сообщения в этом чате.')) return;
    const { data } = await supabase.from('direct_conversations')
      .update({ blocked_by: user.id, blocked_at: new Date().toISOString() })
      .eq('id', conv.id).select('*, listing:study_listings(*)').single();
    if (data) {
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, blocked_by: user.id } : c
      ));
    }
  };

  const handleUnblock = async (conv: DirectConversation) => {
    if (!user) return;
    const { data } = await supabase.from('direct_conversations')
      .update({ blocked_by: null, blocked_at: null })
      .eq('id', conv.id).select('*, listing:study_listings(*)').single();
    if (data) {
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, blocked_by: null, blocked_at: null } : c
      ));
    }
  };

  const filtered = conversations.filter(c =>
    !search ||
    c.other_user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.listing?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0);

  function timeAgo(d: string) {
    const diff  = Date.now() - new Date(d).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'только что';
    if (mins  < 60) return `${mins} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days  < 7)  return `${days} дн`;
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  const sessionBadge = (c: DirectConversation): { text: string; cls: string } | null => {
    const s = c.session?.status;
    if (!s) return null;
    if (s === 'pending_confirmation') return { text: 'ожидает подтверждения', cls: 'text-accent bg-accent/10 border-accent/20' };
    if (s === 'active')               return { text: 'сессия активна',        cls: 'text-secondary bg-secondary/10 border-secondary/20' };
    if (s === 'completed')            return { text: 'сессия завершена',       cls: 'text-muted-foreground bg-muted border-border' };
    return null;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <MessageCircle className="h-6 w-6 text-primary" />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">Сообщения</h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по имени или объявлению..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          {/* List */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center px-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium mb-1">
                  {search ? 'Ничего не найдено' : 'Нет сообщений'}
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  {search ? 'Попробуйте другой запрос' : 'Откройте объявление и нажмите «Написать»'}
                </p>
              </div>
            ) : (
              filtered.map((conv, i) => {
                const isLast    = i === filtered.length - 1;
                const hasUnread = (conv.unread_count ?? 0) > 0;
                const isOwner   = isListingOwner(conv);
                const isBlocked = !!conv.blocked_by;
                const badge     = sessionBadge(conv);

                return (
                  <div
                    key={conv.id}
                    className={cn(
                      'group relative flex items-center gap-4 px-5 py-4 transition-colors',
                      !isLast && 'border-b border-border',
                      hasUnread
                        ? 'bg-primary/5 hover:bg-primary/8'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    {/* Clickable area */}
                    <div
                      className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/messages/${conv.id}`)}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {conv.other_user?.avatar_url ? (
                          <img src={conv.other_user.avatar_url} alt="avatar"
                            className={cn('w-12 h-12 rounded-2xl object-cover', isBlocked && 'grayscale opacity-60')} />
                        ) : (
                          <div className={cn(
                            'w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg',
                            isBlocked ? 'bg-muted' : 'bg-primary'
                          )}>
                            {conv.other_user?.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        {hasUnread && !isBlocked && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg">
                            {conv.unread_count! > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                        {/* Blocked indicator */}
                        {isBlocked && isOwner && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive border-2 border-card flex items-center justify-center">
                            <Ban className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {conv.listing && (
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] text-primary font-medium truncate max-w-[180px]">
                              <BookOpen className="h-3 w-3 flex-shrink-0" />
                              {conv.listing.title}
                            </span>
                            {badge && (
                              <span className={cn('flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium border', badge.cls)}>
                                {badge.text}
                              </span>
                            )}
                            {isBlocked && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium border text-destructive bg-destructive/10 border-destructive/20">
                                заблокирован
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-baseline justify-between gap-2">
                          <span className={cn('text-sm font-semibold truncate', hasUnread ? 'text-foreground' : 'text-muted-foreground')}>
                            {conv.other_user?.full_name ?? 'Пользователь'}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(conv.last_message_at)}
                          </span>
                        </div>

                        <p className={cn('text-sm truncate', hasUnread ? 'text-foreground/80' : 'text-muted-foreground')}>
                          {conv.last_message
                            ? (conv.last_message.sender_id === user?.id ? 'Вы: ' : '') + conv.last_message.content
                            : 'Нет сообщений'}
                        </p>
                      </div>
                    </div>

                    {/* Actions menu — listing owner only */}
                    {isOwner && (
                      <ConvMenu
                        conv={conv}
                        userId={user!.id}
                        onClose={() => handleClose(conv)}
                        onBlock={() => handleBlock(conv)}
                        onUnblock={() => handleUnblock(conv)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}