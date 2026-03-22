'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { StudySession } from '@/src/types/types';

interface SessionCardProps {
  session: StudySession;
}

export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/sessions/${session.id}`)}
      className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 rounded-lg p-6 border border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/20"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
          {session.study_listings?.title}
        </h3>
        <MessageCircle className="h-5 w-5 text-purple-400 flex-shrink-0 ml-2" />
      </div>

      <p className="text-purple-300 text-sm mb-3">
        {session.study_listings?.subject}
      </p>

      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-purple-300">Активна</span>
      </div>
    </div>
  );
}