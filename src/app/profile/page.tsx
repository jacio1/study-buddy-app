'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, Save, Loader2, BookOpen,
  MessageCircle, Pencil, X, Trash2, Clock, Check, Archive,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Profile, StudyListing, StudySession, User } from '@/src/types/types';
import { Header } from '@/src/components/layout/Header';
import { cn } from '@/src/lib/utils';

const levelLabels: Record<string, string> = {
  beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый',
};
const levelColors: Record<string, string> = {
  beginner:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400  bg-amber-500/10  border-amber-500/20',
  advanced:     'text-rose-400   bg-rose-500/10   border-rose-500/20',
};

type ProfileTab = 'listings' | 'history';

export default function ProfilePage() {
  const router = useRouter();

  const [user,     setUser]     = useState<User    | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [completedSessions, setCompletedSessions] = useState<StudySession[]>([]);
  const [activeSessions,    setActiveSessions]    = useState<StudySession[]>([]);
  const [tab, setTab] = useState<ProfileTab>('listings');
  const [loading, setLoading] = useState(true);

  // Edit
  const [editing,  setEditing]  = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio,      setBio]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Avatar
  const [avatarPreview,    setAvatarPreview]    = useState<string | null>(null);
  const [avatarFile,       setAvatarFile]       = useState<File   | null>(null);
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/auth'); return; }
    setUser(session.user as User);
    await Promise.all([
      loadProfile(session.user.id),
      loadListings(session.user.id),
      loadSessions(session.user.id),
    ]);
    setLoading(false);
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) { setProfile(data); setFullName(data.full_name ?? ''); setBio(data.bio ?? ''); }
  };

  const loadListings = async (uid: string) => {
    const { data } = await supabase.from('study_listings').select('*, profiles(*)')
      .eq('user_id', uid).order('created_at', { ascending: false });
    if (data) setListings(data);
  };

  const loadSessions = async (uid: string) => {
    const { data } = await supabase.from('study_sessions')
      .select('*, study_listings(*)')
      .or(`creator_id.eq.${uid},partner_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (data) {
      setActiveSessions(data.filter(s => s.status !== 'completed'));
      setCompletedSessions(data.filter(s => s.status === 'completed'));
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    setAvatarUploading(true);
    try {
      const ext  = avatarFile.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
      return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl + `?t=${Date.now()}`;
    } finally { setAvatarUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (avatarFile) { const url = await uploadAvatar(); if (url) avatar_url = url; }
      const { data, error } = await supabase.from('profiles')
        .update({ full_name: fullName.trim(), bio: bio.trim() || null, avatar_url })
        .eq('id', user.id).select().single();
      if (!error && data) {
        setProfile(data); setEditing(false); setAvatarFile(null);
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      }
    } finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(false);
    setFullName(profile?.full_name ?? '');
    setBio(profile?.bio ?? '');
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null); setAvatarFile(null);
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Удалить это объявление?')) return;
    const { error } = await supabase.from('study_listings').delete().eq('id', id);
    if (!error) setListings(p => p.filter(l => l.id !== id));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
    </div>
  );

  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <button onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          На главную
        </button>

        {/* Profile card */}
        <div className="rounded-2xl border p-8 mb-5"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative group/avatar">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-purple-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-purple-500/20">
                  {avatarSrc
                    ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                    : <span>{profile?.full_name?.[0]?.toUpperCase() ?? '?'}</span>
                  }
                </div>
                {editing && (
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    {avatarUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </button>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}
                  className="hidden" />
              </div>

              <div>
                {editing ? (
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="text-xl font-bold rounded-lg px-3 py-1.5 border border-purple-500/50 focus:outline-none mb-1 w-full"
                    style={{ backgroundColor: 'var(--app-input)', color: 'var(--app-text)' }} />
                ) : (
                  <h1 className="text-xl font-bold text-white mb-0.5">{profile?.full_name}</h1>
                )}
                <p className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  С нами с {memberSince}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <Check className="h-4 w-4" /> Сохранено
                </span>
              )}
              {editing ? (
                <>
                  <button onClick={cancelEdit}
                    className="p-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors"
                    style={{ backgroundColor: 'var(--app-input)' }}>
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={handleSave} disabled={saving || !fullName.trim()}
                    className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      saving || !fullName.trim() ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white')}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
                  style={{ backgroundColor: 'var(--app-input)' }}>
                  <Pencil className="h-4 w-4" /> Редактировать
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">О себе</p>
            {editing ? (
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Расскажите о себе..."
                className="w-full rounded-xl px-4 py-3 border focus:outline-none focus:border-purple-500 text-sm resize-none"
                style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }} />
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {profile?.bio || (
                  <span className="text-gray-500 italic">
                    Биография не заполнена.{' '}
                    <button onClick={() => setEditing(true)} className="text-purple-400 hover:text-purple-300 underline underline-offset-4">Добавить?</button>
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: listings.length,         label: 'Объявлений',  icon: <BookOpen className="h-5 w-5" /> },
              { value: activeSessions.length,   label: 'Сессий',      icon: <MessageCircle className="h-5 w-5" /> },
              { value: completedSessions.length, label: 'Завершено',   icon: <Archive className="h-5 w-5" /> },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 py-5 rounded-xl border text-center"
                style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}>
                <div className="text-purple-400">{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs: Listings / History */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('listings')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              tab === 'listings' ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white'
            )}
            style={tab !== 'listings' ? { backgroundColor: 'var(--app-input)' } : {}}>
            <BookOpen className="h-4 w-4" />
            Мои объявления
            {listings.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-600/30 text-purple-300 text-xs font-bold">{listings.length}</span>
            )}
          </button>
          <button onClick={() => setTab('history')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              tab === 'history' ? 'bg-gray-700/60 border-gray-600 text-gray-200' : 'border-gray-700 text-gray-400 hover:text-white'
            )}
            style={tab !== 'history' ? { backgroundColor: 'var(--app-input)' } : {}}>
            <Archive className="h-4 w-4" />
            История сессий
            {completedSessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs font-bold">{completedSessions.length}</span>
            )}
          </button>
        </div>

        {/* Listings tab */}
        {tab === 'listings' && (
          <div className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Объявления</h2>
              <button onClick={() => router.push('/listings/create')}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                + Создать новое
              </button>
            </div>
            {listings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-400 mb-5">У вас пока нет объявлений</p>
                <button onClick={() => router.push('/listings/create')}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Создать объявление
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.map(listing => (
                  <div key={listing.id}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all hover:border-purple-500/30 cursor-pointer"
                    style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}
                    onClick={() => router.push(`/listings/${listing.id}`)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-sm font-semibold text-white truncate">{listing.title}</h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0',
                          levelColors[listing.level] ?? 'text-gray-400 bg-gray-800 border-gray-700')}>
                          {levelLabels[listing.level]}
                        </span>
                      </div>
                      <p className="text-xs text-purple-400">{listing.subject}</p>
                    </div>
                    <p className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(listing.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            <h2 className="text-base font-bold text-white mb-5">История сессий</h2>
            {completedSessions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Archive className="h-12 w-12 text-gray-700 mb-4" />
                <p className="text-gray-400">История пуста</p>
                <p className="text-gray-600 text-sm mt-1">Завершённые сессии появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedSessions.map(sess => (
                  <div key={sess.id}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all hover:border-purple-500/30 cursor-pointer"
                    style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}
                    onClick={() => router.push(`/sessions/${sess.id}`)}>
                    <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Archive className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-300 truncate">
                        {sess.study_listings?.title ?? 'Сессия'}
                      </p>
                      <p className="text-xs text-purple-400">{sess.study_listings?.subject}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {sess.completed_at
                          ? new Date(sess.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                          : ''}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Просмотр архива →</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}