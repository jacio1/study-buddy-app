'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Profile, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    schedule: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth');
      return;
    }

    setUser(session.user as User);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('study_listings')
      .insert([{ ...formData, user_id: user.id }]);

    setLoading(false);

    if (!error) {
      router.push('/');
    } else {
      alert('Ошибка при создании объявления');
    }
  };

  return (
    <div className="min-h-screen bg-[#1B1B1C]">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h1 className="text-3xl font-bold text-white mb-2">
            Создать объявление
          </h1>
          <p className="text-gray-400 mb-8">
            Расскажите, по какому предмету вы ищете напарника для учебы
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">
                Название
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Например: Ищу напарника для изучения React"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white">
                Предмет
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="React, Python, Математика и т.д."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level" className="text-white">
                Уровень
              </Label>
              <Select
                value={formData.level}
                onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="beginner">Начинающий</SelectItem>
                  <SelectItem value="intermediate">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Описание
              </Label>
              <Textarea
                id="description"
                rows={5}
                placeholder="Опишите, что вы хотите изучать, какие цели преследуете..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule" className="text-white">
                Расписание
              </Label>
              <Input
                id="schedule"
                type="text"
                placeholder="Например: Вечера по будням, выходные"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Создание...' : 'Опубликовать объявление'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}