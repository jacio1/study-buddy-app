'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LogOut, User as UserIcon, Plus } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Profile, User } from '@/src/types/types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface HeaderProps {
  user: User | null;
  profile: Profile | null;
}

export function Header({ user, profile }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#1B1B1C] backdrop-blur supports-backdrop-filter:bg-[#1B1B1C]/95">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-white hover:opacity-80 transition-opacity"
            >
              StudyMate
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по предметам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>
            </form>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/listings/create')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать объявление
            </Button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-400">
                  {user.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                  {profile?.full_name?.[0]?.toUpperCase() || <UserIcon className="h-5 w-5" />}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                  title="Выйти"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
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