import { ListingCard } from '@/src/components/layout/ListingCard';
import { StudyListing } from '@/src/types/types';
import { EmptyState } from './EmptyState';

interface ListingsGridProps {
  listings: StudyListing[];
  currentUserId?: string;
  onDeleted: (id: string) => void;
}

export function ListingsGrid({ listings, currentUserId, onDeleted }: ListingsGridProps) {
  if (listings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          currentUserId={currentUserId}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}