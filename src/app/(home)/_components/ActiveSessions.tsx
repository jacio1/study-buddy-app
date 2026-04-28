import { Flame } from 'lucide-react';
import { SessionCard } from '@/src/components/layout/SessionCard';
import { StudySession } from '@/src/types/types';

interface ActiveSessionsProps {
  sessions: StudySession[];
}

export function ActiveSessions({ sessions }: ActiveSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <Flame className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          Мои активные сессии
        </h2>
        <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-muted text-muted-foreground">
          {sessions.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}