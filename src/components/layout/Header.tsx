'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, LogOut, User as UserIcon, Plus, Sun, Moon,
  ChevronDown, MessageCircle, Bell, CheckCheck, X,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Notification, Profile, User } from '@/src/types/types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useTheme } from '@/src/context/ThemeContext';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  user: User | null;
  profile: Profile | null;
}

function timeAgo(d: string) {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'только что';
  if (mins  < 60) return `${mins} мин`;
  if (hours < 24) return `${hours} ч`;
  return `${days} дн`;
}

const notifIcon: Record<string, string> = {
  session_ended:    '🔔',
  session_invite:   '📩',
  session_accepted: '✅',
};

export function Header({ user, profile }: HeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const [searchQuery,    setSearchQuery]    = useState('');
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [unreadDMs,      setUnreadDMs]      = useState(0);

  const profileRef  = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications(user.id);
    loadUnreadDMs(user.id);

    const channel = supabase.channel('header-live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, async payload => {
        const notif = payload.new as Notification;
        if (notif.actor_id) {
          const { data } = await supabase.from('profiles').select('*').eq('id', notif.actor_id).single();
          if (data) notif.actor = data;
        }
        setNotifications(prev => [notif, ...prev]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' },
        () => loadUnreadDMs(user.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setNotifications(data as Notification[]);
  };

  const loadUnreadDMs = async (uid: string) => {
    const { data: convs } = await supabase
      .from('direct_conversations')
      .select('id')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .is('closed_by', null);
    if (!convs?.length) { setUnreadDMs(0); return; }

    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convs.map(c => c.id))
      .eq('is_read', false)
      .neq('sender_id', uid);
    setUnreadDMs(count ?? 0);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleNotifClick = async (notif: Notification) => {
    await markOneRead(notif.id);
    setNotifOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/?search=${encodeURIComponent(searchQuery)}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (!user) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const isMessages   = pathname?.startsWith('/messages');
  const isHome       = pathname === '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur bg-card/95">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between gap-4">

          {/* Logo - кликабельный, ведет на главную */}
          <button 
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-foreground flex-shrink-0 relative group transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            StudyBuddy
          </button>

{/* Search - показывается только на главной */}
{isHome && (
  <form onSubmit={handleSearch} className="flex-1 mx-4">
    <div className="flex items-center gap-0 group/search">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
        <Input 
          type="text" 
          placeholder="Поиск по предметам..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-10 bg-muted border border-r-0 border-border text-foreground placeholder:text-muted-foreground rounded-l-full rounded-r-none text-base focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted-foreground/20 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Button 
        type="submit" 
        size="icon"
        className="h-12 w-12 rounded-r-full rounded-l-none border border-l-0 border-border transition-colors flex-shrink-0 group-focus-within/search:border-primary"
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  </form>
)}

          {/* Right */}
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/listings/create')}
              size="icon"
              className="h-12 w-12 rounded-xl flex-shrink-0 sm:w-auto sm:px-4">
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Создать</span>
            </Button>

            {/* DMs */}
            <button onClick={() => router.push('/messages')} title="Сообщения"
              className={cn('relative p-2.5 rounded-xl border transition-all h-12 w-12 flex items-center justify-center',
                isMessages
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50'
              )}>
              <MessageCircle className="h-5 w-5" />
              {unreadDMs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-lg">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </button>

            {/* Notifications bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
                className={cn('relative p-2.5 rounded-xl border transition-all h-12 w-12 flex items-center justify-center',
                  notifOpen
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50'
                )}>
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1 shadow-lg animate-pulse">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border shadow-2xl shadow-black/40 overflow-hidden z-50 bg-card">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Уведомления</span>
                    {unreadNotifs > 0 && (
                      <button onClick={markAllRead}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <CheckCheck className="h-3.5 w-3.5" />
                        Прочитать все
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-center px-4">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm">Нет уведомлений</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={cn(
                            'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border transition-colors hover:bg-muted/50',
                            !notif.is_read && 'bg-primary/5'
                          )}>
                          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base bg-muted">
                            {notif.actor?.avatar_url
                              ? <img src={notif.actor.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" />
                              : <span>{notifIcon[notif.type] ?? '🔔'}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm leading-snug', 
                              notif.is_read ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                              {notif.title}
                            </p>
                            {notif.body && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme
            <button onClick={toggle}
              className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all h-12 w-12 flex items-center justify-center">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button> */}

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 h-12 rounded-xl border border-border hover:border-primary/50 transition-colors bg-muted">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
                  : <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                      {profile?.full_name?.[0]?.toUpperCase() ?? <UserIcon className="h-5 w-5" />}
                    </div>
                }
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {profile?.full_name || user.email}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block', 
                  profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border shadow-2xl shadow-black/30 overflow-hidden z-50 bg-card">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left">
                      <UserIcon className="h-4 w-4" /> Мой профиль
                    </button>
                    <button onClick={() => { setProfileOpen(false); router.push('/messages'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left">
                      <MessageCircle className="h-4 w-4" /> Сообщения
                      {unreadDMs > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {unreadDMs > 9 ? '9+' : unreadDMs}
                        </span>
                      )}
                    </button>
                    <button onClick={() => { setProfileOpen(false); router.push('/listings/create'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left sm:hidden">
                      <Plus className="h-4 w-4" /> Создать объявление
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors text-left">
                      <LogOut className="h-4 w-4" /> Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}