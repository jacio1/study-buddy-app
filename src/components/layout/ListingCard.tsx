'use client';

import { useRouter } from 'next/navigation';
import { Clock, User } from 'lucide-react';
import { StudyListing } from '@/src/types/types';

interface ListingCardProps {
  listing: StudyListing;
}

const levelLabels = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый'
};

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/listings/${listing.id}`)}
      className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <span className="px-3 py-1 bg-gray-800 rounded-full text-xs font-medium text-gray-300 whitespace-nowrap ml-2">
          {levelLabels[listing.level]}
        </span>
      </div>

      <p className="text-purple-400 font-medium text-sm mb-3">
        {listing.subject}
      </p>

      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
        {listing.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5" />
          <span>{listing.profiles?.full_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(listing.created_at).toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
    </div>
  );
}