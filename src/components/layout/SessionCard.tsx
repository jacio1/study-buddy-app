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
      className="bg-linear-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/30 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {session.study_listings?.title}
        </h3>
        <MessageCircle className="h-5 w-5 text-primary shrink-0 ml-2" />
      </div>

      <p className="text-primary/80 text-sm mb-3">
        {session.study_listings?.subject}
      </p>

      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span className="text-xs font-medium text-primary">Активна</span>
      </div>
    </div>
  );
}