'use client';

import { cn } from "@/src/lib/utils";
import { Message } from "@/src/types/types";


interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex mb-4 animate-in slide-in-from-left-2 duration-300",
      isOwnMessage && "justify-end"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-3",
        isOwnMessage 
          ? "bg-purple-600 text-white rounded-br-sm" 
          : "bg-gray-800 text-gray-100 rounded-bl-sm"
      )}>
        {!isOwnMessage && (
          <div className="text-xs font-semibold mb-1 opacity-80">
            {message.profiles?.full_name}
          </div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
        <div className={cn(
          "text-[10px] mt-1 text-right",
          isOwnMessage ? "text-purple-200" : "text-gray-500"
        )}>
          {new Date(message.created_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}