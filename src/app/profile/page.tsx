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
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );

  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-8 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          На главную
        </Button>

        {/* Profile card */}
        <div className="rounded-2xl border border-border p-8 mb-5 bg-card">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative group/avatar">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold ring-4 ring-primary/20">
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
                  <Input 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)}
                    className="text-xl font-bold mb-1 w-full" 
                  />
                ) : (
                  <h1 className="text-xl font-bold text-foreground mb-0.5">{profile?.full_name}</h1>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  С нами с {memberSince}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-secondary">
                  <Check className="h-4 w-4" /> Сохранено
                </span>
              )}
              {editing ? (
                <>
                  <Button variant="outline" size="icon" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" /> Редактировать
                </Button>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">О себе</p>
            {editing ? (
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Расскажите о себе..."
                className="w-full rounded-xl px-4 py-3 border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm resize-none" />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile?.bio || (
                  <span className="text-muted-foreground/60 italic">
                    Биография не заполнена.{' '}
                    <button onClick={() => setEditing(true)} className="text-primary hover:text-primary/80 underline underline-offset-4">Добавить?</button>
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
              <div key={stat.label} className="flex flex-col items-center gap-1.5 py-5 rounded-xl border border-border text-center bg-muted">
                <div className="text-primary">{stat.icon}</div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs: Listings / History */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('listings')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              tab === 'listings' 
                ? 'bg-primary/20 border-primary/40 text-primary' 
                : 'border-border text-muted-foreground hover:text-foreground bg-card'
            )}>
            <BookOpen className="h-4 w-4" />
            Мои объявления
            {listings.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/30 text-primary text-xs font-bold">{listings.length}</span>
            )}
          </button>
          <button onClick={() => setTab('history')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              tab === 'history' 
                ? 'bg-muted border-border text-foreground' 
                : 'border-border text-muted-foreground hover:text-foreground bg-card'
            )}>
            <Archive className="h-4 w-4" />
            История сессий
            {completedSessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs font-bold">{completedSessions.length}</span>
            )}
          </button>
        </div>

        {/* Listings tab */}
        {tab === 'listings' && (
          <div className="rounded-2xl border border-border p-6 bg-card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Объявления</h2>
              <button onClick={() => router.push('/listings/create')}
                className="text-sm text-primary hover:text-primary/80 transition-colors">
                + Создать новое
              </button>
            </div>
            {listings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-muted-foreground mb-5">У вас пока нет объявлений</p>
                <Button onClick={() => router.push('/listings/create')}>
                  Создать объявление
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.map(listing => (
                  <div key={listing.id}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border transition-all hover:border-primary/30 cursor-pointer bg-muted"
                    onClick={() => router.push(`/listings/${listing.id}`)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{listing.title}</h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0',
                          levelColors[listing.level] ?? 'text-muted-foreground bg-muted border-border')}>
                          {levelLabels[listing.level]}
                        </span>
                      </div>
                      <p className="text-xs text-primary">{listing.subject}</p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(listing.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
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
          <div className="rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-base font-bold text-foreground mb-5">История сессий</h2>
            {completedSessions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Archive className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">История пуста</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Завершённые сессии появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedSessions.map(sess => (
                  <div key={sess.id}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border transition-all hover:border-primary/30 cursor-pointer bg-muted"
                    onClick={() => router.push(`/sessions/${sess.id}`)}>
                    <div className="w-9 h-9 rounded-xl bg-muted-foreground/20 flex items-center justify-center flex-shrink-0">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {sess.study_listings?.title ?? 'Сессия'}
                      </p>
                      <p className="text-xs text-primary">{sess.study_listings?.subject}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {sess.completed_at
                          ? new Date(sess.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                          : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Просмотр архива →</p>
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