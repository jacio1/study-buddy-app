'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, StickyNote, Timer, ListChecks, FolderOpen,
  CheckCircle, XCircle, Trash2, Clock, Archive, Loader2,
  Download, File, Menu, X, Paperclip, Image, Send, Mic,
  Users, Volume2, VolumeX,
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
import { ChatInput } from '@/src/components/layout/ChatInput';

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
    <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-accent/5">
      <Clock className="h-4 w-4 text-accent flex-shrink-0" />
      <p className="text-sm text-accent/80">Ждём подтверждения от второго участника…</p>
    </div>
  );

  return (
    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-4 bg-primary/5">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm text-primary font-medium">Вас приглашают в совместную сессию</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button onClick={accept} disabled={busy} size="sm">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Принять
        </Button>
        <Button onClick={decline} disabled={busy} variant="destructive" size="sm">
          <XCircle className="h-3.5 w-3.5" />
          Отклонить
        </Button>
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
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-col items-center py-20 text-center">
      <Archive className="h-10 w-10 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">Сообщений нет</p>
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
              isOwn ? 'bg-primary/70 text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm',
            )}>
              {!isOwn && (
                <p className="text-xs font-semibold text-primary mb-1 opacity-80">{msg.profiles?.full_name}</p>
              )}
              {msg.image_url && (
                <img src={msg.image_url} className="rounded-xl max-h-64 w-full object-cover mb-2 block" alt="" />
              )}
              {msg.file_url && (
                <a href={msg.file_url} download={msg.file_name ?? true} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border mb-2 hover:opacity-80 transition-opacity bg-background/50">
                  <File className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{msg.file_name}</span>
                  {msg.file_size && <span className="text-xs text-muted-foreground">{formatBytes(msg.file_size)}</span>}
                  <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </a>
              )}
              {msg.content && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>}
              <p className={cn('text-[10px] mt-1', isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
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
    <div className="p-4 border-t border-border flex-shrink-0">
      <div className="flex items-center gap-2">
        {/* Иконки слева */}
        <div className="flex items-center gap-1 flex-shrink-0 h-11">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploading}
            className="h-11 w-11 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            <Image className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="h-11 w-11 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground flex items-center justify-center"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>

        {/* Поле ввода */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Чат недоступен" : "Напишите сообщение..."}
            disabled={disabled || uploading}
            className="w-full px-4 py-2.5 rounded-xl resize-none text-sm h-11 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            rows={1}
          />
        </div>

        {/* Кнопка отправки */}
        <Button
          onClick={() => sendMessage()}
          disabled={!message.trim() || disabled || uploading}
          size="icon"
          className="h-11 w-11 flex-shrink-0 mb-2"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
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
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {participants.map(participant => (
        <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {participant.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {participant.full_name || 'Пользователь'}
            </p>
            <p className="text-xs text-muted-foreground">
              {participant.id === userId ? 'Вы' : 'Участник'}
            </p>
          </div>
          {participant.id !== userId && (
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={user} profile={profile} />

      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col max-w-7xl">
        {/* Mobile tools toggle - только для мобильной версии вверху */}
        {!isArchived && (
          <div className="flex justify-end mb-4 lg:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMobileTools(!showMobileTools)}
            >
              {showMobileTools ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        )}

        {/* Статус сессии (ожидает/активна) */}
        {isPending && (
          <div className="mb-4 rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-3 flex items-center gap-2 bg-accent/5">
              <Clock className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-sm text-accent/80">Ожидание подтверждения сессии</p>
            </div>
          </div>
        )}

        {/* Confirmation banner для приглашения */}
        {isPending && session.initiated_by !== user.id && (
          <div className="mb-4 rounded-xl overflow-hidden border border-border">
            <ConfirmBanner session={session} userId={user.id} profile={profile} onUpdate={setSession} />
          </div>
        )}

        {/* Main content - 2 колонки: Чат и Инструменты */}
        {isArchived ? (
          <div className="flex-1 rounded-xl border border-border overflow-hidden flex flex-col bg-card">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Архив сессии · {session.completed_at
                  ? new Date(session.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
              </span>
            </div>
            <ArchiveView sessionId={sessionId} />
          </div>
        ) : (
          /* Двухколоночный макет: Чат + Инструменты */
          <div className="flex-1 rounded-xl border border-border overflow-hidden flex flex-col lg:flex-row bg-card">
            
            {/* Левая колонка - Чат */}
            <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border">
              {/* Хедер чата с названием сессии и кнопкой голосового чата */}
              <div className="px-4 py-3 border-b border-border flex-shrink-0 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{session.study_listings?.title}</h1>
                  <p className="text-primary text-sm truncate">{session.study_listings?.subject}</p>
                </div>
                {isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className="gap-2 flex-shrink-0"
                  >
                    {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="hidden sm:inline">Голосовой чат</span>
                  </Button>
                )}
              </div>
              
              {/* Сообщения чата */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1 hide-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-sm text-center">
                      {isPending ? 'Чат откроется после подтверждения сессии' : 'Начните общение! 💬'}
                    </p>
                  </div>
                ) : messages.map(msg => (
                  <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.user_id === user.id} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Инпут чата */}
              {isActive
                ? <CustomChatInput sessionId={sessionId} user={user} />
                : <div className="px-4 py-3 border-t border-border text-center text-sm text-muted-foreground shrink-0">
                    Чат будет доступен после подтверждения сессии обоими участниками
                  </div>
              }
            </div>

            {/* Правая колонка - Инструменты */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col">
              <div className="flex-1 flex flex-col min-h-0">
                {/* Заголовок инструментов */}
                <div className="px-4 py-3 border-b border-border shrink-0">
                  <h3 className="text-base font-semibold text-foreground pb-6">Инструменты</h3>
                </div>
                
                {/* Блок инструментов (занимает ~80% высоты) */}
                <div className="flex-1 overflow-y-auto p-3" style={{ flex: '8' }}>
                  <div className="space-y-2 ">
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
                            isActiveTool && 'bg-primary/20 border border-primary/30',
                            (isActive || tab.id === 'participants')
                              ? 'text-foreground hover:bg-primary cursor-pointer'
                              : 'text-muted-foreground/50 cursor-not-allowed opacity-50',
                            'bg-muted'
                          )}
                        >
                          <Icon className={cn('h-5 w-5', isActiveTool ? 'text-primary' : 'text-muted-foreground')} />
                          <span className="text-sm flex-1 text-left">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Отображение выбранного инструмента */}
                  {activeToolTab && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-3">Активный инструмент</div>
                      <div className="max-h-96 overflow-y-auto ">
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

                {/* Кнопка завершить сессию внизу - с отдельной чертой сверху */}
                {isActive && (
                  <div className="pt-9 p-4 shrink-0 border-t border-border mt-auto">
                    <Button
                      variant="destructive"
                      onClick={handleEndSession}
                      disabled={ending}
                      className="w-full"
                    >
                      {ending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Trash2 className="h-4 w-4 mr-2" />
                      Завершить сессию
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}