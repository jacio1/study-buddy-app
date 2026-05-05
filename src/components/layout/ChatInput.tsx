'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ImagePlus, Paperclip, X, Loader2, File } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { User } from '@/src/types/types';
import { cn } from '@/src/lib/utils';
import Image from 'next/image';
import { Button } from '../ui/button';

interface ChatInputProps {
  sessionId: string;
  user: User;
  disabled?: boolean;
}

type Attachment =
  | { kind: 'image'; file: File; preview: string }
  | { kind: 'file';  file: File };

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({ sessionId, user, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  useEffect(() => () => {
    if (attachment?.kind === 'image') URL.revokeObjectURL(attachment.preview);
  }, [attachment]);

  const applyImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (attachment?.kind === 'image') URL.revokeObjectURL(attachment.preview);
    setAttachment({ kind: 'image', file, preview: URL.createObjectURL(file) });
  };

  const applyFile = (file: File) => {
    if (file.type.startsWith('image/')) { applyImage(file); return; }
    if (attachment?.kind === 'image') URL.revokeObjectURL(attachment.preview);
    setAttachment({ kind: 'file', file });
  };

  const clearAttachment = () => {
    if (attachment?.kind === 'image') URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (fileInputRef.current)  fileInputRef.current.value  = '';
  };

  // Ctrl+V paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const imgItem = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (file) applyImage(file);
    }
  }, []);

  const uploadToStorage = async (
    bucket: string,
    file: File,
    folder: string
  ): Promise<string> => {
    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachment) || sending) return;
    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        session_id: sessionId,
        user_id:    user.id,
        content:    text.trim() || null,
      };

          // 👇 Добавьте эту проверку
    console.log('Sending payload:', payload);
    console.log('Attachment:', attachment);

      if (attachment?.kind === 'image') {
        payload.image_url = await uploadToStorage('chat-images', attachment.file, user.id);
      } else if (attachment?.kind === 'file') {
        payload.file_url  = await uploadToStorage('chat-files', attachment.file, user.id);
        payload.file_name = attachment.file.name;
        payload.file_size = attachment.file.size;
      }

      const { error } = await supabase.from('session_messages').insert([payload]);
      if (!error) {
        setText('');
        clearAttachment();
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } else {
        console.error(error);
        alert('Ошибка при отправке. Попробуйте ещё раз.');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при отправке. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (!!text.trim() || !!attachment) && !sending && !disabled;

  return (
    <div className="p-4 border-t border-border shrink-0">
      {attachment && (
        <div className="mb-3 relative inline-flex items-start">
          {attachment.kind === 'image' ? (
            <div className="relative">
              <Image
                src={attachment.preview}
                alt="preview"
                width={200}
                height={112}
                className="h-28 w-auto rounded-xl object-cover border border-border block"
              />
              <span className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {formatBytes(attachment.file.size)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-muted border border-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                <File className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium truncate max-w-50">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatBytes(attachment.file.size)}</p>
              </div>
            </div>
          )}

          <button
            onClick={clearAttachment}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 shrink-0 h-11">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || sending}
            className={cn(
              "h-11 w-11 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground flex items-center justify-center",
              attachment?.kind === 'image' && "bg-primary/20 text-primary"
            )}
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            className={cn(
              "h-11 w-11 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground flex items-center justify-center",
              attachment?.kind === 'file' && "bg-primary/20 text-primary"
            )}
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? "Чат недоступен" : (attachment ? "Добавьте подпись…" : "Напишите сообщение...")}
            disabled={disabled || sending}
            className="w-full px-4 rounded-xl resize-none text-sm h-11 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary leading-relaxed py-2"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            rows={1}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyImage(file);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}