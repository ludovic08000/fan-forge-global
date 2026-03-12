import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveCoverProps {
  coverUrl?: string | null;
  creatorName: string;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  className?: string;
  placeholderClassName?: string;
  children?: React.ReactNode;
}

export const ResponsiveCover: React.FC<ResponsiveCoverProps> = ({
  coverUrl,
  creatorName,
  coverPositionX,
  coverPositionY,
  className,
  placeholderClassName,
  children,
}) => {
  return (
    <div
      className={cn('relative w-full overflow-hidden bg-gradient-to-br', className)}
      style={{ height: 'clamp(180px, 28vw, 340px)' }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={`Couverture de ${creatorName}`}
          className="w-full h-full object-cover"
          style={{ objectPosition: `${coverPositionX ?? 50}% ${coverPositionY ?? 50}%` }}
          loading="eager"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30',
            placeholderClassName
          )}
        />
      )}
      {children}
    </div>
  );
};
