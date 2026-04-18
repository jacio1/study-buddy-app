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

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

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
        // Attach actor profile
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

  if (!user) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const isMessages   = pathname?.startsWith('/messages');

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <button onClick={() => router.push('/')}
            className="text-2xl font-bold text-white hover:opacity-75 transition-opacity flex-shrink-0">
            StudyMate
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input type="text" placeholder="Поиск по предметам..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-purple-500" />
            </div>
          </form>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/listings/create')}
              className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Создать
            </Button>

            {/* DMs */}
            <button onClick={() => router.push('/messages')} title="Сообщения"
              className={cn('relative p-2.5 rounded-xl border transition-all',
                isMessages
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700'
              )}>
              <MessageCircle className="h-4 w-4" />
              {unreadDMs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </button>

            {/* Notifications bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
                className={cn('relative p-2.5 rounded-xl border transition-all',
                  notifOpen
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700'
                )}>
                <Bell className="h-4 w-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg animate-pulse">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl shadow-black/40 overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--app-border)' }}>
                    <span className="text-sm font-semibold text-white">Уведомления</span>
                    {unreadNotifs > 0 && (
                      <button onClick={markAllRead}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                        <CheckCheck className="h-3.5 w-3.5" />
                        Прочитать все
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-center px-4">
                        <Bell className="h-8 w-8 text-gray-700 mb-3" />
                        <p className="text-gray-500 text-sm">Нет уведомлений</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={cn(
                            'w-full text-left flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-purple-500/5',
                            !notif.is_read && 'bg-purple-500/5'
                          )}
                          style={{ borderColor: 'var(--app-border)' }}>
                          {/* Icon or avatar */}
                          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base"
                            style={{ backgroundColor: 'var(--app-input)' }}>
                            {notif.actor?.avatar_url
                              ? <img src={notif.actor.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" />
                              : <span>{notifIcon[notif.type] ?? '🔔'}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm leading-snug', notif.is_read ? 'text-gray-400' : 'text-white font-medium')}>
                              {notif.title}
                            </p>
                            {notif.body && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.body}</p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-1">{timeAgo(notif.created_at)}</p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme */}
            <button onClick={toggle}
              className="p-2.5 rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700 transition-all">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
                style={{ backgroundColor: 'var(--app-input)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {profile?.full_name?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
                    </div>
                }
                <span className="hidden sm:block text-sm font-medium text-white max-w-[120px] truncate">
                  {profile?.full_name || user.email}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl shadow-black/30 overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--app-border)' }}>
                    <p className="text-sm font-semibold text-white truncate">{profile?.full_name || 'Пользователь'}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left">
                      <UserIcon className="h-4 w-4" /> Мой профиль
                    </button>
                    <button onClick={() => { setProfileOpen(false); router.push('/messages'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left">
                      <MessageCircle className="h-4 w-4" /> Сообщения
                      {unreadDMs > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {unreadDMs > 9 ? '9+' : unreadDMs}
                        </span>
                      )}
                    </button>
                    <button onClick={() => { setProfileOpen(false); router.push('/listings/create'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left sm:hidden">
                      <Plus className="h-4 w-4" /> Создать объявление
                    </button>
                  </div>
                  <div className="border-t py-1" style={{ borderColor: 'var(--app-border)' }}>
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left">
                      <LogOut className="h-4 w-4" /> Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="text" placeholder="Поиск по предметам..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500" />
          </div>
        </form>
      </div>
    </header>
  );
}