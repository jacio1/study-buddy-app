'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Send, StickyNote, Timer, ListChecks,
  FolderOpen, CheckCircle, XCircle, Trash2, AlertTriangle,
  Clock, Archive, Loader2, Download, File, FileText,
} from 'lucide-react';
import { Message, Profile, StudySession, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { VoiceChat } from '@/src/components/layout/VoiceChat';
import { ChatMessage } from '@/src/components/layout/ChatMessage';
import { ChatInput } from '@/src/components/layout/ChatInput';
import { SharedNotes } from '@/src/components/layout/SharedNotes';
import { PomodoroTimer } from '@/src/components/layout/PomodoroTimer';
import { TodoList } from '@/src/components/layout/TodoList';
import { MediaGallery } from '@/src/components/layout/MediaGallery';
import { cn } from '@/src/lib/utils';

type ToolTab = 'notes' | 'pomodoro' | 'todos' | 'media';

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

// ─── Session banner (confirmation / deletion) ─────────────────────────────────

function SessionBanner({
  session, userId, onUpdate,
}: {
  session: StudySession;
  userId: string;
  onUpdate: (s: StudySession) => void;
}) {
  const [busy, setBusy] = useState(false);

  const patch = async (fields: Partial<StudySession>) => {
    setBusy(true);
    const { data, error } = await supabase
      .from('study_sessions').update(fields).eq('id', session.id).select().single();
    if (!error && data) onUpdate(data);
    setBusy(false);
  };

  // ── Pending confirmation ──────────────────────────────────────────────────
  if (session.status === 'pending_confirmation') {
    const iInitiated = session.initiated_by === userId;

    if (iInitiated) {
      return (
        <div className="px-4 py-3 border-b flex items-center justify-between gap-4 bg-amber-500/8 border-amber-500/20">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">Ждём подтверждения от второго участника…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-3 border-b flex items-center justify-between gap-4 bg-purple-500/10 border-purple-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <p className="text-sm text-purple-300 font-medium">Вас приглашают в совместную сессию. Принять?</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => patch({ status: 'active' })} disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Принять
          </button>
          <button onClick={() => patch({ status: 'completed', completed_at: new Date().toISOString() })} disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium border border-red-500/25 transition-colors">
            <XCircle className="h-3.5 w-3.5" />
            Отклонить
          </button>
        </div>
      </div>
    );
  }

  // ── Pending deletion ──────────────────────────────────────────────────────
  if (session.status === 'pending_deletion') {
    const iRequested = session.delete_requested_by === userId;

    if (iRequested) {
      return (
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4 bg-amber-500/8 border-amber-500/20">
          <div className="flex items-center gap-2 text-sm text-amber-300">
            <Clock className="h-4 w-4" />
            Запрос отправлен — автозавершение через {daysLeft(session.auto_delete_at!)} дн.
          </div>
          <button onClick={() => patch({ status: 'active', delete_requested_by: null, delete_requested_at: null, auto_delete_at: null })}
            disabled={busy} className="text-xs text-gray-500 hover:text-white underline underline-offset-4 transition-colors flex-shrink-0">
            Отменить
          </button>
        </div>
      );
    }

    return (
      <div className="px-4 py-3 border-b flex items-center justify-between gap-4 bg-amber-500/8 border-amber-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Собеседник хочет завершить сессию. Автозавершение через {daysLeft(session.auto_delete_at!)} дн.
          </p>
        </div>
        <button
          onClick={() => patch({ status: 'completed', delete_confirmed_by: userId, completed_at: new Date().toISOString(), auto_delete_at: null })}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/30 transition-colors flex-shrink-0">
          <CheckCircle className="h-3.5 w-3.5" />
          Подтвердить завершение
        </button>
      </div>
    );
  }

  return null;
}

// ─── Archived session view ────────────────────────────────────────────────────

function ArchivedView({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user,     setUser]     = useState<User | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user as User);
    });
    supabase.from('session_messages').select('*, profiles(*)')
      .eq('session_id', sessionId).order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-col items-center py-20 text-center">
      <Archive className="h-10 w-10 text-gray-700 mb-4" />
      <p className="text-gray-400">Сообщений нет</p>
    </div>
  );

  return (
    <div className="p-6 space-y-1 overflow-y-auto flex-1">
      {messages.map(msg => {
        const isOwn = msg.user_id === user?.id;
        return (
          <div key={msg.id} className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[72%] rounded-2xl overflow-hidden',
              isOwn ? 'bg-purple-600/70 text-white rounded-br-sm px-4 py-2.5' : 'rounded-bl-sm px-4 py-2.5',
            )} style={!isOwn ? { backgroundColor: 'var(--app-input)', color: 'var(--app-text)' } : {}}>
              {!isOwn && (
                <p className="text-xs font-semibold text-purple-400 mb-1 opacity-80">
                  {msg.profiles?.full_name}
                </p>
              )}
              {msg.image_url && (
                <img src={msg.image_url} className="rounded-xl max-h-64 w-full object-cover mb-2 block" alt="" />
              )}
              {msg.file_url && (
                <a href={msg.file_url} download={msg.file_name ?? true} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border mb-2 transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}>
                  <File className="h-4 w-4 text-purple-400" />
                  <span className="text-xs truncate flex-1">{msg.file_name}</span>
                  {msg.file_size && <span className="text-xs text-gray-500">{formatBytes(msg.file_size)}</span>}
                  <Download className="h-3.5 w-3.5 text-gray-400" />
                </a>
              )}
              {msg.content && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>}
              <p className={cn('text-[10px] mt-1', isOwn ? 'text-purple-200 text-right' : 'text-gray-500')}>
                {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const router   = useRouter();
  const params   = useParams();
  const sessionId = params.id as string;

  const [user,     setUser]     = useState<User    | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [session,  setSession]  = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('notes');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkUser(); loadSession(); }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    loadMessages();

    const channel = supabase.channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      }, async payload => {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).single();
        setMessages(cur => [...cur, { ...payload.new, profiles: prof } as Message]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'study_sessions' },
        payload => setSession(payload.new as StudySession))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const checkUser = async () => {
    const { data: { session: auth } } = await supabase.auth.getSession();
    if (!auth?.user) { router.push('/auth'); return; }
    setUser(auth.user as User);
    const { data } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
    if (data) setProfile(data);
  };

  const loadSession = async () => {
    const { data } = await supabase.from('study_sessions')
      .select('*, study_listings(*)').eq('id', sessionId).single();
    if (data) setSession(data); else router.push('/');
  };

  const loadMessages = async () => {
    const { data } = await supabase.from('session_messages')
      .select('*, profiles(*)').eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const requestDeleteSession = async () => {
    if (!user || !session) return;
    if (!confirm('Запросить завершение сессии? Если второй участник не подтвердит — она завершится автоматически через 7 дней.')) return;
    const autoDeleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('study_sessions')
      .update({ status: 'pending_deletion', delete_requested_by: user.id, delete_requested_at: new Date().toISOString(), auto_delete_at: autoDeleteAt })
      .eq('id', session.id).select().single();
    if (!error && data) setSession(data);
  };

  if (!session || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
    </div>
  );

  const isArchived  = session.status === 'completed';
  const isPending   = session.status === 'pending_confirmation';
  const canUseTools = session.status === 'active';

  const toolTabs = [
    { id: 'notes'    as ToolTab, label: 'Заметки',  icon: StickyNote  },
    { id: 'pomodoro' as ToolTab, label: 'Помодоро', icon: Timer       },
    { id: 'todos'    as ToolTab, label: 'Задачи',   icon: ListChecks  },
    { id: 'media'    as ToolTab, label: 'Медиа',    icon: FolderOpen  },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Header user={user} profile={profile} />

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-7xl">
        {/* Session header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
          <div className="flex-1 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{session.study_listings?.title}</h1>
                {/* Status badge */}
                {isPending && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    ожидает подтверждения
                  </span>
                )}
                {isArchived && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                    завершена
                  </span>
                )}
              </div>
              <p className="text-purple-400 text-sm font-medium">{session.study_listings?.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-11 lg:ml-0">
            {/* Voice chat only when active */}
            {canUseTools && <VoiceChat sessionId={sessionId} user={user} />}

            {/* Delete button only when active or pending */}
            {(session.status === 'active' || session.status === 'pending_deletion') &&
              session.delete_requested_by !== user.id && (
              <button onClick={requestDeleteSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium text-red-400 border-red-500/25 bg-red-500/8 hover:bg-red-500/15 transition-colors">
                <Trash2 className="h-4 w-4" />
                Завершить сессию
              </button>
            )}
          </div>
        </div>

        {/* Session confirmation/deletion banner */}
        {(session.status === 'pending_confirmation' || session.status === 'pending_deletion') && (
          <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--app-border)' }}>
            <SessionBanner session={session} userId={user.id} onUpdate={setSession} />
          </div>
        )}

        {/* Archived view */}
        {isArchived ? (
          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--app-border)' }}>
              <Archive className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-400">
                Архив сессии · завершена {session.completed_at
                  ? new Date(session.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
              </span>
            </div>
            <ArchivedView sessionId={sessionId} />
          </div>
        ) : (
          /* Active / pending layout */
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
            {/* Chat */}
            <div className="flex-1 lg:flex-[1.2] rounded-xl border flex flex-col overflow-hidden"
              style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
              <div className="p-4 border-b" style={{ borderColor: 'var(--app-border)' }}>
                <h3 className="text-base font-semibold text-white">💬 Чат</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">
                      {isPending ? 'Чат начнётся после того как оба примут сессию' : 'Начните общение! 💬'}
                    </p>
                  </div>
                ) : messages.map(msg => (
                  <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.user_id === user.id} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              {canUseTools
                ? <ChatInput sessionId={sessionId} user={user} />
                : <div className="px-4 py-3 border-t text-center text-sm text-gray-500"
                    style={{ borderColor: 'var(--app-border)' }}>
                    Чат станет доступен после подтверждения сессии
                  </div>
              }
            </div>

            {/* Tools (only when active) */}
            <div className="flex-1 rounded-xl border flex flex-col overflow-hidden"
              style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
              <div className="flex gap-2 p-4 border-b overflow-x-auto"
                style={{ borderColor: 'var(--app-border)' }}>
                {toolTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveToolTab(tab.id)}
                      disabled={!canUseTools && tab.id !== 'media'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
                        activeToolTab === tab.id && canUseTools
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : canUseTools
                            ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                            : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      )}>
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto">
                {!canUseTools ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <Clock className="h-10 w-10 text-gray-700 mb-4" />
                    <p className="text-gray-400 font-medium">Инструменты недоступны</p>
                    <p className="text-gray-600 text-sm mt-1">Ждём подтверждения от второго участника</p>
                  </div>
                ) : (
                  <>
                    <div className={cn('p-6 h-full', activeToolTab !== 'notes'    && 'hidden')}><SharedNotes sessionId={sessionId} user={user} /></div>
                    <div className={cn('p-6 h-full flex items-center justify-center', activeToolTab !== 'pomodoro' && 'hidden')}><PomodoroTimer /></div>
                    <div className={cn('p-6 h-full', activeToolTab !== 'todos'    && 'hidden')}><TodoList sessionId={sessionId} user={user} /></div>
                    <div className={cn('p-6 h-full', activeToolTab !== 'media'    && 'hidden')}><MediaGallery sessionId={sessionId} /></div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}