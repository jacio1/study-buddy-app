'use client';

import { cn } from '@/src/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  text?: string;
}

const Spinner = ({ size }: { size: LoaderProps['size'] }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className="relative">
      <div
        className={cn(
          sizeClasses[size || 'md'],
          'rounded-full border-t-transparent border-primary animate-spin',
          'border-primary/30 border-t-primary'
        )}
      />
      {size !== 'sm' && (
        <div className="absolute inset-0 rounded-full bg-linear-to-r from-primary/20 via-primary/10 to-transparent animate-pulse" />
      )}
    </div>
  );
};

export function Loader({ size = 'md', fullScreen = false, text }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner size={size} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}