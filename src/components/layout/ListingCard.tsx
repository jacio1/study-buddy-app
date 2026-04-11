'use client';

import { useRouter } from 'next/navigation';
import { Clock, User, Trash2, MapPin, Wifi, Users } from 'lucide-react';
import { StudyListing } from '@/src/types/types';
import { supabase } from '@/src/lib/supabase';

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
      className="relative bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group hover:shadow-xl hover:shadow-purple-500/8 hover:-translate-y-0.5"
    >
      {isOwner && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            Моё
          </span>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug mb-2.5 pr-12">
        {listing.title}
      </h3>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-purple-400 font-medium text-xs">{listing.subject}</span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${levelColors[listing.level] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
          {levelLabels[listing.level]}
        </span>
      </div>

      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-4">
        {listing.description}
      </p>

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 pt-3 border-t border-gray-800">
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