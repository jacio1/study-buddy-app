'use client';

import { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Message } from '@/src/types/types';
import { X, Download, FileText, FileSpreadsheet, FileCode, FileArchive, File } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

// Pick a relevant icon based on file extension
function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext))                          return <FileText className="h-5 w-5 text-red-400" />;
  if (['xls', 'xlsx', 'csv'].includes(ext))           return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(ext))
                                                       return <FileCode className="h-5 w-5 text-blue-400" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className="h-5 w-5 text-amber-400" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const [lightbox, setLightbox] = useState(false);

  const hasText  = message.content?.trim().length > 0;
  const hasImage = !!message.image_url;
  const hasFile  = !!message.file_url;

  // Bubble is transparent wrapper when image-only (no padding, image fills it)
  const imageOnly = hasImage && !hasText && !hasFile;

  return (
    <>
      <div className={cn(
        'flex mb-4 animate-in slide-in-from-left-2 duration-300',
        isOwnMessage && 'justify-end'
      )}>
        <div className={cn(
          'max-w-[72%] rounded-2xl overflow-hidden',
          imageOnly ? 'p-0.5' : 'px-4 py-3',
          isOwnMessage
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        )}>
          {/* Sender name */}
          {!isOwnMessage && (
            <div className={cn('text-xs font-semibold mb-1.5 opacity-75', imageOnly && 'px-3 pt-2.5')}>
              {message.profiles?.full_name}
            </div>
          )}

          {/* Image */}
          {hasImage && (
            <img
              src={message.image_url!}
              alt="attachment"
              onClick={() => setLightbox(true)}
              className={cn(
                'rounded-xl object-cover cursor-zoom-in block',
                imageOnly ? 'max-h-72 w-full' : 'max-h-56 w-full mb-2'
              )}
            />
          )}

          {/* File attachment card */}
          {hasFile && (
            <a
              href={message.file_url!}
              target="_blank"
              rel="noopener noreferrer"
              download={message.file_name ?? true}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors mb-2',
                isOwnMessage
                  ? 'bg-purple-700/50 border-purple-500/30 hover:bg-purple-700/70'
                  : 'bg-gray-700/50 border-gray-600/50 hover:bg-gray-700'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                isOwnMessage ? 'bg-purple-800/60' : 'bg-gray-800'
              )}>
                <FileIcon name={message.file_name ?? ''} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {message.file_name ?? 'Файл'}
                </p>
                {message.file_size != null && (
                  <p className={cn('text-xs mt-0.5', isOwnMessage ? 'text-purple-300' : 'text-gray-400')}>
                    {formatBytes(message.file_size)}
                  </p>
                )}
              </div>
              <Download className={cn('h-4 w-4 flex-shrink-0', isOwnMessage ? 'text-purple-300' : 'text-gray-400')} />
            </a>
          )}

          {/* Text */}
          {hasText && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            'text-[10px] mt-1 text-right',
            imageOnly && 'px-2 pb-1',
            isOwnMessage ? 'text-purple-200' : 'text-gray-500'
          )}>
            {new Date(message.created_at).toLocaleTimeString('ru-RU', {
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={message.image_url!}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Download className="h-5 w-5" />
          </a>
          <img
            src={message.image_url!}
            alt="preview"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}