'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ImagePlus, Paperclip, X, Loader2, File } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { User } from '@/src/types/types';
import { cn } from '@/src/lib/utils';

interface ChatInputProps {
  sessionId: string;
  user: User;
}

type Attachment =
  | { kind: 'image'; file: File; preview: string }
  | { kind: 'file';  file: File };

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({ sessionId, user }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  // Cleanup object URL on unmount
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
    if (!text.trim() && !attachment) return;
    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        session_id: sessionId,
        user_id:    user.id,
        content:    text.trim(),
      };

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

  const canSend = (!!text.trim() || !!attachment) && !sending;

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-3 relative inline-flex items-start">
          {attachment.kind === 'image' ? (
            /* Image preview */
            <div className="relative">
              <img
                src={attachment.preview}
                alt="preview"
                className="h-28 rounded-xl object-cover border border-gray-700 block"
              />
              <span className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {formatBytes(attachment.file.size)}
              </span>
            </div>
          ) : (
            /* File preview card */
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                <File className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium truncate max-w-[200px]">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-gray-400">{formatBytes(attachment.file.size)}</p>
              </div>
            </div>
          )}

          {/* Remove button */}
          <button
            onClick={clearAttachment}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Image button */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          title="Прикрепить изображение"
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl border transition-all',
            attachment?.kind === 'image'
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
          )}
        >
          <ImagePlus className="h-4 w-4" />
        </button>

        {/* File button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить файл"
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl border transition-all',
            attachment?.kind === 'file'
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
          )}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              attachment
                ? 'Добавьте подпись… (Enter — отправить)'
                : 'Напишите сообщение… (Ctrl+V — вставить картинку)'
            }
            className="w-full resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors leading-relaxed"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl border transition-all',
            canSend
              ? 'bg-purple-600 hover:bg-purple-700 border-purple-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
          )}
        >
          {sending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={imageInputRef} type="file" accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) applyImage(f); }}
        className="hidden" />
      <input ref={fileInputRef} type="file" accept="*/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }}
        className="hidden" />

      <p className="text-[10px] text-gray-600 mt-2">
        Enter — отправить · Shift+Enter — перенос · Ctrl+V — вставить картинку
      </p>
    </div>
  );
}