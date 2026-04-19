'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Message } from '@/src/types/types';
import {
  Image as ImageIcon, FileText, FileSpreadsheet, FileCode,
  FileArchive, File, Download, X, Loader2, FolderOpen,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MediaGalleryProps {
  sessionId: string;
}

type MediaTab = 'images' | 'files';

function formatBytes(b: number) {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')                                             return <FileText        className="h-6 w-6 text-destructive"     />;
  if (['xls','xlsx','csv'].includes(ext))                        return <FileSpreadsheet className="h-6 w-6 text-secondary" />;
  if (['js','ts','py','java','cpp','html','css','json','go','rs'].includes(ext))
                                                                 return <FileCode        className="h-6 w-6 text-primary"    />;
  if (['zip','rar','7z','tar','gz'].includes(ext))               return <FileArchive     className="h-6 w-6 text-accent"   />;
  return <File className="h-6 w-6 text-muted-foreground" />;
}

function extColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')                              return 'bg-destructive/10 border-destructive/20';
  if (['xls','xlsx','csv'].includes(ext))         return 'bg-secondary/10 border-secondary/20';
  if (['zip','rar','7z','tar','gz'].includes(ext))return 'bg-accent/10 border-accent/20';
  if (['js','ts','py','html','css','json','go','rs','java','cpp'].includes(ext))
                                                  return 'bg-primary/10 border-primary/20';
  return 'bg-muted border-border';
}

export function MediaGallery({ sessionId }: MediaGalleryProps) {
  const [tab, setTab] = useState<MediaTab>('images');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();

    // Real-time: add new media messages as they arrive
    const channel = supabase
      .channel(`media-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.image_url || msg.file_url) {
          setMessages((prev) => [msg, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const loadMedia = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('session_messages')
      .select('*, profiles(*)')
      .eq('session_id', sessionId)
      .or('image_url.not.is.null,file_url.not.is.null')
      .order('created_at', { ascending: false });

    if (data) setMessages(data as Message[]);
    setLoading(false);
  };

  const images = messages.filter((m) => m.image_url);
  const files  = messages.filter((m) => m.file_url);

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('images')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
            tab === 'images'
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Изображения
          {images.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/30 text-primary text-xs font-bold">
              {images.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('files')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
            tab === 'files'
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          )}
        >
          <FolderOpen className="h-4 w-4" />
          Файлы
          {files.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/30 text-primary text-xs font-bold">
              {files.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>

      ) : tab === 'images' ? (
        images.length === 0 ? (
          <Empty icon={<ImageIcon className="h-10 w-10" />} text="Нет изображений" sub="Отправьте картинку в чате" />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {images.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setLightbox(msg.image_url!)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all"
                >
                  <img
                    src={msg.image_url!}
                    alt="media"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay with meta */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                    <p className="text-[10px] text-white/80 truncate">{msg.profiles?.full_name}</p>
                    <p className="text-[10px] text-white/60">
                      {new Date(msg.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      ) : (
        files.length === 0 ? (
          <Empty icon={<FolderOpen className="h-10 w-10" />} text="Нет файлов" sub="Прикрепите файл через скрепку в чате" />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {files.map((msg) => (
              <a
                key={msg.id}
                href={msg.file_url!}
                target="_blank"
                rel="noopener noreferrer"
                download={msg.file_name ?? true}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  extColor(msg.file_name ?? '')
                )}
              >
                {/* Icon */}
                <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                  <FileTypeIcon name={msg.file_name ?? ''} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate leading-tight">
                    {msg.file_name ?? 'Файл'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {msg.file_size != null && (
                      <span className="text-xs text-muted-foreground">{formatBytes(msg.file_size)}</span>
                    )}
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground truncate">{msg.profiles?.full_name}</span>
                    <span className="text-xs text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        )
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={lightbox}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Download className="h-5 w-5" />
          </a>
          <img
            src={lightbox}
            alt="full"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function Empty({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      <div className="text-muted-foreground/30 mb-3">{icon}</div>
      <p className="text-muted-foreground font-medium">{text}</p>
      <p className="text-muted-foreground/60 text-sm mt-1">{sub}</p>
    </div>
  );
}