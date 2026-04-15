'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, LogOut, User as UserIcon, Plus,
  Sun, Moon, ChevronDown, MessageCircle,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Profile, User } from '@/src/types/types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useTheme } from '@/src/context/ThemeContext';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  user: User | null;
  profile: Profile | null;
}

export function Header({ user, profile }: HeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const [searchQuery,   setSearchQuery]   = useState('');
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load + subscribe to unread DM count
  useEffect(() => {
    if (!user) return;
    loadUnread(user.id);

    const channel = supabase
      .channel('header-unread')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'direct_messages',
      }, () => loadUnread(user.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadUnread = async (uid: string) => {
    // Get all conversation IDs where user is a participant
    const { data: convs } = await supabase
      .from('direct_conversations')
      .select('id')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

    if (!convs?.length) { setUnreadCount(0); return; }

    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convs.map((c) => c.id))
      .eq('is_read', false)
      .neq('sender_id', uid);

    setUnreadCount(count ?? 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!user) return null;

  const isMessages = pathname?.startsWith('/messages');

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-white hover:opacity-75 transition-opacity flex-shrink-0"
          >
            StudyMate
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск по предметам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-purple-500"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Create listing */}
            <Button
              onClick={() => router.push('/listings/create')}
              className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Button>

            {/* Messages button */}
            <button
              onClick={() => router.push('/messages')}
              title="Сообщения"
              className={cn(
                'relative p-2.5 rounded-xl border transition-all',
                isMessages
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700'
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-purple-500/40">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              className="p-2.5 rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-700 transition-all"
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />
              }
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
                style={{ backgroundColor: 'var(--app-input)' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar"
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-white max-w-[120px] truncate">
                  {profile?.full_name || user.email}
                </span>
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block',
                  dropdownOpen && 'rotate-180'
                )} />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl shadow-black/30 overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--app-border)' }}>
                    <p className="text-sm font-semibold text-white truncate">
                      {profile?.full_name || 'Пользователь'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setDropdownOpen(false); router.push('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left"
                    >
                      <UserIcon className="h-4 w-4" />
                      Мой профиль
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push('/messages'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Сообщения
                      {unreadCount > 0 && (
                        <span className="ml-auto min-w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push('/listings/create'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-left sm:hidden"
                    >
                      <Plus className="h-4 w-4" />
                      Создать объявление
                    </button>
                  </div>

                  <div className="border-t py-1" style={{ borderColor: 'var(--app-border)' }}>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Выйти
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
            <Input
              type="text"
              placeholder="Поиск по предметам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
        </form>
      </div>
    </header>
  );
}