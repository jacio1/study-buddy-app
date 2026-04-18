'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, StickyNote, Timer, ListChecks, FolderOpen,
  CheckCircle, XCircle, Trash2, Clock, Archive, Loader2,
  Download, File, Menu, X, Paperclip, Image, Send, Mic,
  ChevronLeft, Users, Volume2, VolumeX,
} from 'lucide-react';
import { Message, Profile, StudySession, User } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { Header } from '@/src/components/layout/Header';
import { Button } from '@/src/components/ui/button';
import { VoiceChat } from '@/src/components/layout/VoiceChat';
import { ChatMessage } from '@/src/components/layout/ChatMessage';
import { SharedNotes } from '@/src/components/layout/SharedNotes';
import { PomodoroTimer } from '@/src/components/layout/PomodoroTimer';
import { TodoList } from '@/src/components/layout/TodoList';
import { MediaGallery } from '@/src/components/layout/MediaGallery';
import { cn } from '@/src/lib/utils';

type ToolTab = 'notes' | 'pomodoro' | 'todos' | 'media' | 'participants';

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

// ─── Confirmation banner ──────────────────────────────────────────────────────

function ConfirmBanner({ session, userId, profile, onUpdate }: {
  session: StudySession; userId: string; profile: Profile | null;
  onUpdate: (s: StudySession) => void;
}) {
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('study_sessions')
      .update({ status: 'active' }).eq('id', session.id).select().single();
    if (!error && data) {
      onUpdate(data);
      await supabase.from('notifications').insert([{
        user_id:  session.initiated_by,
        actor_id: userId,
        type:     'session_accepted',
        title:    `${profile?.full_name ?? 'Пользователь'} принял приглашение`,
        body:     session.study_listings?.title ?? undefined,
        link:     `/sessions/${session.id}`,
      }]);
    }
    setBusy(false);
  };

  const decline = async () => {
    if (!confirm('Отклонить приглашение в сессию?')) return;
    setBusy(true);
    const { data, error } = await supabase.from('study_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session.id).select().single();
    if (!error && data) onUpdate(data);
    setBusy(false);
  };

  const iInitiated = session.initiated_by === userId;

  if (iInitiated) return (
    <div className="px-4 py-3 border-b flex items-center gap-2 bg-amber-500/8"
      style={{ borderColor: 'var(--app-border)' }}>
      <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
      <p className="text-sm text-amber-300">Ждём подтверждения от второго участника…</p>
    </div>
  );

  return (
    <div className="px-4 py-3 border-b flex items-center justify-between gap-4 bg-purple-500/8"
      style={{ borderColor: 'var(--app-border)' }}>
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />
        <p className="text-sm text-purple-300 font-medium">Вас приглашают в совместную сессию</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={accept} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Принять
        </button>
        <button onClick={decline} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs border border-red-500/25 hover:bg-red-500/25 transition-colors">
          <XCircle className="h-3.5 w-3.5" />
          Отклонить
        </button>
      </div>
    </div>
  );
}

// ─── Archive view ─────────────────────────────────────────────────────────────

function ArchiveView({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId,   setUserId]   = useState<string>('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    supabase.from('session_messages').select('*, profiles(*)')
      .eq('session_id', sessionId).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); setLoading(false); });
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
    <div className="p-6 space-y-1 flex-1 overflow-y-auto">
      {messages.map(msg => {
        const isOwn = msg.user_id === userId;
        return (
          <div key={msg.id} className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[72%] rounded-2xl overflow-hidden px-4 py-2.5',
              isOwn ? 'bg-purple-600/70 text-white rounded-br-sm' : 'rounded-bl-sm',
            )} style={!isOwn ? { backgroundColor: 'var(--app-input)', color: 'var(--app-text)' } : {}}>
              {!isOwn && (
                <p className="text-xs font-semibold text-purple-400 mb-1 opacity-80">{msg.profiles?.full_name}</p>
              )}
              {msg.image_url && (
                <img src={msg.image_url} className="rounded-xl max-h-64 w-full object-cover mb-2 block" alt="" />
              )}
              {msg.file_url && (
                <a href={msg.file_url} download={msg.file_name ?? true} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border mb-2 hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--app-input)', borderColor: 'var(--app-border)' }}>
                  <File className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{msg.file_name}</span>
                  {msg.file_size && <span className="text-xs text-gray-500">{formatBytes(msg.file_size)}</span>}
                  <Download className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
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

// ─── Custom Chat Input with icons on the left ─────────────────────────────────

function CustomChatInput({ sessionId, user, disabled }: { sessionId: string; user: User; disabled?: boolean }) {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (content?: string, fileUrl?: string, fileName?: string, fileSize?: number, isImage?: boolean) => {
    const text = content || message.trim();
    if (!text && !fileUrl) return;
    
    const { error } = await supabase.from('session_messages').insert([{
      session_id: sessionId,
      user_id: user.id,
      content: text || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      image_url: isImage ? fileUrl : null,
    }]);
    
    if (!error) setMessage('');
  };

  const handleFileUpload = async (file: File, isImage: boolean) => {
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `session-files/${sessionId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file);
      
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);
        
      await sendMessage('', publicUrl, file.name, file.size, isImage);
    }
    setUploading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--app-border)' }}>
      <div className="flex items-end gap-2">
        {/* Иконки слева */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploading}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            <Image className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>

        {/* Поле ввода */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Чат недоступен" : "Напишите сообщение..."}
            disabled={disabled || uploading}
            className="w-full px-4 py-2.5 rounded-xl resize-none text-sm min-h-[44px] max-h-32"
            style={{ 
              backgroundColor: 'var(--app-input)', 
              color: 'var(--app-text)',
              border: '1px solid var(--app-border)'
            }}
            rows={1}
          />
        </div>

        {/* Кнопка отправки */}
        <button
          onClick={() => sendMessage()}
          disabled={!message.trim() || disabled || uploading}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors flex-shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, true);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, false);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Participants Panel ─────────────────────────────────────────────────────

function ParticipantsPanel({ session, userId }: { session: StudySession; userId: string }) {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipants = async () => {
      const userIds = [session.creator_id, session.partner_id].filter(Boolean);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (data) setParticipants(data);
      setLoading(false);
    };
    
    loadParticipants();
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {participants.map(participant => (
        <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
            {participant.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {participant.full_name || 'Пользователь'}
            </p>
            <p className="text-xs text-gray-400">
              {participant.id === userId ? 'Вы' : 'Участник'}
            </p>
          </div>
          {participant.id !== userId && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const router    = useRouter();
  const params    = useParams();
  const sessionId = params.id as string;

  const [user,     setUser]     = useState<User    | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [session,  setSession]  = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeToolTab, setActiveToolTab] = useState<ToolTab | null>(null);
  const [ending,   setEnding]   = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkUser(); loadSession(); }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    loadMessages();
    const channel = supabase.channel(`sess-${sessionId}`)
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

  const handleEndSession = async () => {
    if (!user || !session) return;
    if (!confirm('Завершить сессию? Она перейдёт в архив.')) return;
    setEnding(true);

    const { data, error } = await supabase.from('study_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session.id).select().single();

    if (!error && data) {
      setSession(data);

      const otherId = session.creator_id === user.id ? session.partner_id : session.creator_id;
      await supabase.from('notifications').insert([{
        user_id:  otherId,
        actor_id: user.id,
        type:     'session_ended',
        title:    `${profile?.full_name ?? 'Пользователь'} завершил сессию «${session.study_listings?.title ?? 'Без названия'}»`,
        body:     'Сессия перемещена в архив',
        link:     `/sessions/${session.id}`,
      }]);
    }

    setEnding(false);
  };

  if (!session || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
    </div>
  );

  const isArchived = session.status === 'completed';
  const isPending  = session.status === 'pending_confirmation';
  const isActive   = session.status === 'active';

  const toolTabs: { id: ToolTab; label: string; icon: React.ElementType }[] = [
    { id: 'notes',        label: 'Заметки',    icon: StickyNote },
    { id: 'todos',        label: 'Задачи',     icon: ListChecks },
    { id: 'pomodoro',     label: 'Помодоро',   icon: Timer      },
    { id: 'media',        label: 'Медиа',      icon: FolderOpen },
    { id: 'participants', label: 'Участники',  icon: Users      },
  ];

  const getToolTitle = (tab: ToolTab) => {
    const titles: Record<ToolTab, string> = {
      notes: 'Заметки',
      todos: 'Задачи',
      pomodoro: 'Помодоро',
      media: 'Медиа',
      participants: 'Участники',
    };
    return titles[tab];
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Header user={user} profile={profile} />

      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col max-w-7xl">
        {/* Top bar - только название и предмет + кнопка голосового чата */}
        <div className="flex justify-between items-center gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{session.study_listings?.title}</h1>
              <p className="text-purple-400 text-sm truncate">{session.study_listings?.subject}</p>
            </div>
          </div>

          {/* Кнопка голосового чата справа */}
          {isActive && (
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-300 hover:text-white transition-colors flex-shrink-0"
              style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-input)' }}
            >
              {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>Голосовой чат</span>
            </button>
          )}
          
          {/* Mobile tools toggle */}
          {!isArchived && (
            <button
              onClick={() => setShowMobileTools(!showMobileTools)}
              className="lg:hidden p-2 rounded-xl border flex-shrink-0"
              style={{ 
                backgroundColor: 'var(--app-card)', 
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)'
              }}
            >
              {showMobileTools ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Статус сессии (ожидает/активна) */}
        {isPending && (
          <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--app-border)' }}>
            <div className="px-4 py-3 flex items-center gap-2 bg-amber-500/8">
              <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">Ожидание подтверждения сессии</p>
            </div>
          </div>
        )}

        {/* Confirmation banner для приглашения */}
        {isPending && session.initiated_by !== user.id && (
          <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--app-border)' }}>
            <ConfirmBanner session={session} userId={user.id} profile={profile} onUpdate={setSession} />
          </div>
        )}

        {/* Main content - 2 колонки: Чат и Инструменты */}
        {isArchived ? (
          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2 flex-shrink-0"
              style={{ borderColor: 'var(--app-border)' }}>
              <Archive className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-400">
                Архив сессии · {session.completed_at
                  ? new Date(session.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
              </span>
            </div>
            <ArchiveView sessionId={sessionId} />
          </div>
        ) : (
          /* Двухколоночный макет: Чат + Инструменты */
          <div className="flex-1 rounded-xl border overflow-hidden flex flex-col lg:flex-row"
            style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            
            {/* Левая колонка - Чат */}
            <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: 'var(--app-border)' }}>
              <div className="px-4 py-3 border-b flex-shrink-0"
                style={{ borderColor: 'var(--app-border)' }}>
                <h3 className="text-base font-semibold text-white">Чат</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1 hide-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm text-center">
                      {isPending ? 'Чат откроется после подтверждения сессии' : 'Начните общение! 💬'}
                    </p>
                  </div>
                ) : messages.map(msg => (
                  <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.user_id === user.id} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              {isActive
                ? <CustomChatInput sessionId={sessionId} user={user} />
                : <div className="px-4 py-3 border-t text-center text-sm text-gray-500 flex-shrink-0"
                    style={{ borderColor: 'var(--app-border)' }}>
                    Чат будет доступен после подтверждения сессии обоими участниками
                  </div>
              }
            </div>

            {/* Правая колонка - Инструменты (включая Участников) */}
            <div className="w-full lg:w-96 flex-shrink-0 flex flex-col">
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--app-border)' }}>
                  <h3 className="text-base font-semibold text-white">Инструменты</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-2">
                    {toolTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActiveTool = activeToolTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveToolTab(isActiveTool ? null : tab.id)}
                          disabled={!isActive && tab.id !== 'participants'}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full',
                            isActiveTool && 'bg-purple-600/20 border border-purple-500/30',
                            (isActive || tab.id === 'participants')
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                              : 'text-gray-600 cursor-not-allowed opacity-50',
                          )}
                          style={{ backgroundColor: 'var(--app-input)' }}
                        >
                          <Icon className={cn('h-5 w-5', isActiveTool ? 'text-purple-400' : 'text-gray-500')} />
                          <span className="text-sm flex-1 text-left">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Отображение выбранного инструмента */}
                  {activeToolTab && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--app-border)' }}>
                      <div className="text-xs text-gray-500 mb-3">Активный инструмент</div>
                      <div className="max-h-96 overflow-y-auto">
                        {activeToolTab === 'notes' && isActive && (
                          <SharedNotes sessionId={sessionId} user={user} />
                        )}
                        {activeToolTab === 'todos' && isActive && (
                          <TodoList sessionId={sessionId} user={user} />
                        )}
                        {activeToolTab === 'pomodoro' && isActive && (
                          <div className="flex justify-center py-4">
                            <PomodoroTimer />
                          </div>
                        )}
                        {activeToolTab === 'media' && isActive && (
                          <MediaGallery sessionId={sessionId} />
                        )}
                        {activeToolTab === 'participants' && (
                          <ParticipantsPanel session={session} userId={user.id} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопка завершить сессию под инструментами */}
              {isActive && (
                <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'var(--app-border)' }}>
                  <button
                    onClick={handleEndSession}
                    disabled={ending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium text-red-400 border-red-500/25 bg-red-500/8 hover:bg-red-500/15 transition-colors"
                  >
                    {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Завершить сессию
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}