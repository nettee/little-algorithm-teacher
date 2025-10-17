'use client';

import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  LoaderIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';

export type SimpleToolProps = ComponentProps<'div'> & {
  status: 'running' | 'completed';
  title: string;
  description?: string;
};

export const SimpleTool = ({ 
  className, 
  status, 
  title, 
  description,
  ...props 
}: SimpleToolProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoaderIcon className="size-4 animate-spin text-muted-foreground" style={{ animationDuration: '1.5s' }} />;
      case 'completed':
        return <CheckCircleIcon className="size-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 text-sm text-muted-foreground',
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {title}
        </span>
        {description && (
          <span className="ml-2">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};
