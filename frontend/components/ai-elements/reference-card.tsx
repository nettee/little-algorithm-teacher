'use client';

import { cn } from '@/lib/utils';
import { BookOpenIcon, ChevronRightIcon } from 'lucide-react';
import { type ComponentProps } from 'react';

export type ReferenceCardProps = ComponentProps<'div'> & {
  title: string;
  artifactId: string;
  description?: string;
  onClick?: () => void;
};

export const ReferenceCard = ({
  title,
  artifactId,
  description,
  onClick,
  className,
  ...props
}: ReferenceCardProps) => {
  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20',
        'flex items-center gap-3 max-w-72',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* 左侧图标 */}
      <div className="flex-shrink-0">
        <BookOpenIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      {/* 中间内容区域 */}
      <div className={cn(
        "flex-1 min-w-0",
        !description && "flex items-center"
      )}>
        {/* 标题 */}
        <h4 className="font-medium text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h4>
        
        {/* 描述 */}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      
      {/* 右侧箭头 */}
      <div className="flex-shrink-0">
        <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export type ReferenceCardsProps = ComponentProps<'div'> & {
  references: Array<{
    title: string;
    artifactId: string;
    description?: string;
  }>;
  onReferenceClick?: (reference: { title: string; artifactId: string; description?: string }) => void;
};

export const ReferenceCards = ({
  references,
  onReferenceClick,
  className,
  ...props
}: ReferenceCardsProps) => {
  if (!references || references.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        references.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        className
      )}
      {...props}
    >
      {references.map((reference, index) => (
        <ReferenceCard
          key={index}
          title={reference.title}
          artifactId={reference.artifactId}
          description={reference.description}
          onClick={() => onReferenceClick?.(reference)}
        />
      ))}
    </div>
  );
};
