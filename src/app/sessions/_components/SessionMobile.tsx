"use client";

import { useEffect, useState } from "react";
import {
  StickyNote,
  Timer,
  ListChecks,
  FolderOpen,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  Archive,
  Loader2,
  Download,
  File,
  Users,
  ArrowLeft,
  Palette,
} from "lucide-react";
import { Message, Profile, StudySession, User } from "@/src/types/types";
import { supabase } from "@/src/lib/supabase";
import { Button } from "@/src/components/ui/button";
import { VoiceChat } from "@/src/components/layout/VoiceChat";
import { ChatMessage } from "@/src/components/layout/ChatMessage";
import { SharedNotes } from "@/src/components/layout/SharedNotes";
import { PomodoroTimer } from "@/src/components/layout/PomodoroTimer";
import { TodoList } from "@/src/components/layout/TodoList";
import { MediaGallery } from "@/src/components/layout/MediaGallery";
import { SharedWhiteboard } from "@/src/components/layout/SharedWhiteboard";
import { cn } from "@/src/lib/utils";
import { ChatInput } from "@/src/components/layout/ChatInput";
import Image from "next/image";
import Link from "next/link";

type ToolTab =
  | "notes"
  | "pomodoro"
  | "todos"
  | "media"
  | "whiteboard"
  | "participants";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}


function ParticipantsPanel({
  session,
  userId,
}: {
  session: StudySession;
  userId: string;
}) {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipants = async () => {
      const userIds = [session.creator_id, session.partner_id].filter(Boolean);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
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
    <div className="space-y-3 p-4">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
        >
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {participant.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {participant.full_name || "Пользователь"}
            </p>
            <p className="text-xs text-muted-foreground">
              {participant.id === userId ? "Вы" : "Участник"}
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


function ToolPanel({
  activeTab,
  onClose,
  session,
  sessionId,
  user,
}: {
  activeTab: ToolTab;
  onClose: () => void;
  session: StudySession;
  sessionId: string;
  user: User;
}) {
  const tabLabels: Record<ToolTab, { label: string; sub: string }> = {
    notes: { label: "Заметки", sub: "Общие заметки" },
    todos: { label: "Задачи", sub: "Список задач" },
    pomodoro: { label: "Помодоро", sub: "Таймер Pomodoro" },
    media: { label: "Медиа", sub: "Медиафайлы" },
    whiteboard: { label: "Доска", sub: "Совместная доска" },
    participants: { label: "Участники", sub: "Участники сессии" },
  };

  const meta = tabLabels[activeTab];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-right duration-250">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0 safe-area-top">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground leading-tight">
            {meta.label}
          </h2>
          <p className="text-xs text-muted-foreground">{meta.sub}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "notes" && (
          <SharedNotes sessionId={sessionId} user={user} />
        )}
        {activeTab === "todos" && (
          <TodoList sessionId={sessionId} user={user} />
        )}
        {activeTab === "pomodoro" && (
          <div className="flex justify-center py-6 px-4">
            <PomodoroTimer />
          </div>
        )}
        {activeTab === "media" && <MediaGallery sessionId={sessionId} />}
        {activeTab === "whiteboard" && (
          <SharedWhiteboard sessionId={sessionId} userId={user.id} />
        )}
        {activeTab === "participants" && (
          <ParticipantsPanel session={session} userId={user.id} />
        )}
      </div>
    </div>
  );
}


interface SessionMobileProps {
  session: StudySession;
  user: User;
  profile: Profile | null;
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>  ;
  onEndSession: () => void;
  ending: boolean;
  onUpdateSession: (s: StudySession) => void;
}

export function SessionMobile({
  session,
  user,
  profile,
  messages,
  messagesEndRef,
  onEndSession,
  ending,
  onUpdateSession,
}: SessionMobileProps) {
  const sessionId = session.id;
  const [activeToolTab, setActiveToolTab] = useState<ToolTab | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const isActive = session.status === "active";
  const isPending = session.status === "pending_confirmation";
  const isArchived = session.status === "completed";

  const toolTabs: { id: ToolTab; icon: React.ElementType; label: string }[] = [
    { id: "notes", icon: StickyNote, label: "Заметки" },
    { id: "todos", icon: ListChecks, label: "Задачи" },
    { id: "pomodoro", icon: Timer, label: "Помодоро" },
    { id: "media", icon: FolderOpen, label: "Медиа" },
    { id: "whiteboard", icon: Palette, label: "Доска" },
    { id: "participants", icon: Users, label: "Участники" },
  ];

  const acceptSession = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("study_sessions")
      .update({ status: "active" })
      .eq("id", session.id)
      .select()
      .single();
    if (!error && data) {
      onUpdateSession(data);
      await supabase.from("notifications").insert([
        {
          user_id: session.initiated_by,
          actor_id: user.id,
          type: "session_accepted",
          title: `${profile?.full_name ?? "Пользователь"} принял приглашение`,
          body: session.study_listings?.title ?? undefined,
          link: `/sessions/${session.id}`,
        },
      ]);
    }
    setBusy(false);
  };

  const declineSession = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("study_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id)
      .select()
      .single();
    if (!error && data) onUpdateSession(data);
    setBusy(false);
  };

  const [archiveMessages, setArchiveMessages] = useState<Message[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    if (!isArchived) return;
    setArchiveLoading(true);
    supabase
      .from("session_messages")
      .select("*, profiles(*)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setArchiveMessages(data);
        setArchiveLoading(false);
      });
  }, [isArchived, sessionId]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div
        className="shrink-0 px-4 pt-safe pb-3 border-b border-border bg-card flex items-center gap-3"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors active:scale-95 shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate leading-tight">
            {session.study_listings?.title ?? "Сессия"}
          </h1>
          <p className="text-xs text-primary truncate">
            {session.study_listings?.subject ?? ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isActive && <VoiceChat sessionId={sessionId} user={user} />}

          {isActive && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="p-2 rounded-xl hover:bg-destructive/10 transition-colors text-destructive active:scale-95"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          )}

          {isArchived && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted">
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Архив</span>
            </div>
          )}
        </div>
      </div>

      {isPending && (
        <div className="shrink-0 px-4 py-3 border-b border-border bg-accent/5">
          {session.initiated_by === user.id ? (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm text-accent/80">
                Ждём подтверждения от второго участника…
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-primary font-medium">
                  Вас приглашают в совместную сессию
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={acceptSession}
                  disabled={busy}
                  size="sm"
                  className="flex-1"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Принять
                </Button>
                <Button
                  onClick={declineSession}
                  disabled={busy}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Отклонить
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {isArchived ? (
          archiveLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : archiveMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Archive className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Сообщений нет</p>
            </div>
          ) : (
            archiveMessages.map((msg) => {
              const isOwn = msg.user_id === user.id;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex mb-2",
                    isOwn ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5",
                      isOwn
                        ? "bg-primary/70 text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm",
                    )}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold text-primary mb-1 opacity-80">
                        {msg.profiles?.full_name}
                      </p>
                    )}
                    {msg.image_url && (
                      <Image
                        src={msg.image_url}
                        className="rounded-xl max-h-56 w-full object-cover mb-2 block"
                        alt=""
                      />
                    )}
                    {msg.file_url && (
                      <a
                        href={msg.file_url}
                        download={msg.file_name ?? true}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border mb-2 hover:opacity-80 transition-opacity bg-background/50"
                      >
                        <File className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs truncate flex-1">
                          {msg.file_name}
                        </span>
                        {msg.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(msg.file_size)}
                          </span>
                        )}
                        <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </a>
                    )}
                    {msg.content && (
                      <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isOwn
                          ? "text-primary-foreground/60 text-right"
                          : "text-muted-foreground",
                      )}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm text-center px-6">
              {isPending
                ? "Чат откроется после подтверждения сессии"
                : "Начните общение! 💬"}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwnMessage={msg.user_id === user.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isActive && <ChatInput sessionId={sessionId} user={user} />}

      {!isActive && !isArchived && (
        <div
          className="shrink-0 px-4 py-3 border-t border-border text-center text-xs text-muted-foreground bg-card"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          Чат будет доступен после подтверждения сессии обоими участниками
        </div>
      )}

      {isActive && (
        <div
          className="shrink-0 border-t border-border bg-card"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around px-2 py-1">
            {toolTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeToolTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveToolTab(isSelected ? null : tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-90",
                    isSelected
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      isSelected && "scale-110",
                    )}
                  />
                  <span className="text-[10px] font-medium leading-none">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeToolTab && (
        <ToolPanel
          activeTab={activeToolTab}
          onClose={() => setActiveToolTab(null)}
          session={session}
          sessionId={sessionId}
          user={user}
        />
      )}

      {showEndConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowEndConfirm(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50 p-6 animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Завершить сессию?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Сессия перейдёт в архив. Это действие нельзя отменить.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndSession();
                }}
                disabled={ending}
                className="w-full h-12"
              >
                {ending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Trash2 className="h-4 w-4 mr-2" />
                Завершить сессию
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEndConfirm(false)}
                className="w-full h-12"
              >
                Отмена
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
