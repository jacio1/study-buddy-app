'use client';

import { useRouter } from 'next/navigation';
import { Clock, User, Trash2, MapPin, Wifi, Users } from 'lucide-react';
import { StudyListing } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

interface ListingCardProps {
  listing: StudyListing;
  currentUserId?: string;
  onDeleted?: (id: string) => void;
}

const levelLabels: Record<string, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

const levelColors: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const formatLabel: Record<string, string> = {
  online: 'Онлайн',
  offline: 'Офлайн',
  any: 'Любой формат',
};

export function ListingCard({ listing, currentUserId, onDeleted }: ListingCardProps) {
  const router = useRouter();
  const isOwner = currentUserId && listing.user_id === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить это объявление?')) return;
    const { error } = await supabase.from('study_listings').delete().eq('id', listing.id);
    if (!error) onDeleted?.(listing.id);
    else alert('Ошибка при удалении');
  };

  return (
    <div
      onClick={() => router.push(`/listings/${listing.id}`)}
      className="relative bg-card rounded-xl p-5 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
    >
      {isOwner && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
            Моё
          </span>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2.5 pr-12">
        {listing.title}
      </h3>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-primary font-medium text-xs">{listing.subject}</span>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[11px] font-medium border',
          levelColors[listing.level] ?? 'text-muted-foreground bg-muted border-border'
        )}>
          {levelLabels[listing.level]}
        </span>
      </div>

      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mb-4">
        {listing.description}
      </p>

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-3 border-t border-border">
        <span className="flex items-center gap-1">
          {listing.format === 'online' ? <Wifi className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          {formatLabel[listing.format ?? 'any']}
        </span>

        {listing.city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {listing.city}
          </span>
        )}

        <span className="flex items-center gap-1 ml-auto">
          <User className="h-3 w-3" />
          {listing.profiles?.full_name}
        </span>

        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(listing.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}