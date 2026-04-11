'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Profile, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { cn } from '@/src/lib/utils';
import { CATEGORIES } from '@/src/constants/listingConstants';

type Format = 'online' | 'offline' | 'any';

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    category: 'other',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    schedule: '',
    format: 'online' as Format,
    city: '',
  });

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/auth'); return; }
    setUser(session.user as User);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      ...formData,
      user_id: user.id,
      city: formData.city.trim() || null,
    };

    const { error } = await supabase.from('study_listings').insert([payload]);
    setLoading(false);
    if (!error) router.push('/');
    else alert('Ошибка при создании объявления');
  };

  const set = (key: string, val: string) => setFormData((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-[#1B1B1C]">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6 text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h1 className="text-2xl font-bold text-white mb-1">Создать объявление</h1>
          <p className="text-gray-400 text-sm mb-8">Расскажите, кого и для чего ищете</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Название объявления</Label>
              <Input
                placeholder="Ищу напарника для изучения React с нуля"
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Категория</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('category', cat.id)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-sm text-left border transition-all',
                      formData.category === cat.id
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Конкретный предмет / тема</Label>
              <Input
                placeholder="React, Испанский язык, Линейная алгебра…"
                value={formData.subject}
                onChange={(e) => set('subject', e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Ваш уровень</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['beginner',     '🌱', 'Начинающий'],
                  ['intermediate', '📗', 'Средний'],
                  ['advanced',     '🚀', 'Продвинутый'],
                ] as ['beginner' | 'intermediate' | 'advanced', string, string][]).map(([val, icon, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set('level', val)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-lg border text-sm font-medium transition-all',
                      formData.level === val
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                    )}
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Формат занятий</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['online',  '💻', 'Онлайн'],
                  ['offline', '🤝', 'Офлайн'],
                  ['any',     '🌐', 'Любой'],
                ] as [Format, string, string][]).map(([val, icon, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set('format', val)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-lg border text-sm font-medium transition-all',
                      formData.format === val
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                    )}
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* City (shown always, optional) */}
            <div className="space-y-2">
              <Label className="text-white text-sm flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                Город
                <span className="text-gray-500 font-normal text-xs">(необязательно)</span>
              </Label>
              <Input
                placeholder="Москва, Минск, Берлин…"
                value={formData.city}
                onChange={(e) => set('city', e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-600">
                Укажите, если ищете кого-то из своего города для встреч офлайн
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Описание</Label>
              <Textarea
                rows={4}
                placeholder="Что именно хотите изучить, какие цели, что уже знаете…"
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Расписание / доступность</Label>
              <Input
                placeholder="Вечера по будням, выходные, гибко…"
                value={formData.schedule}
                onChange={(e) => set('schedule', e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5"
            >
              {loading ? 'Публикация...' : 'Опубликовать объявление'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}