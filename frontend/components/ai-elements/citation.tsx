'use client';

import { cn } from '@/lib/utils';
import { BrainIcon, CodeXml, BookOpenIcon, LucideIcon } from 'lucide-react';
import { type ComponentProps } from 'react';
import { CitationType } from '@/lib/types';

export interface CitationData {
  type: CitationType;
  title: string;
}

export type CitationProps = ComponentProps<'div'> & {
  citation?: CitationData;
};

const getCitationIcon = (type: CitationType): LucideIcon => {
  switch (type) {
    case CitationType.MIND_MAP:
      return BrainIcon;
    case CitationType.SOLUTION_CODE:
      return CodeXml;
    case CitationType.COURSE:
    default:
      return BookOpenIcon;
  }
};

const getCitationColor = (type: CitationType): string => {
  switch (type) {
    case CitationType.MIND_MAP:
      return 'text-orange-600';
    case CitationType.SOLUTION_CODE:
      return 'text-blue-600';
    case CitationType.COURSE:
      return 'text-green-600';
    default:
      return 'text-primary';
  }
};

const getCitationDescription = (type: CitationType, description?: string) => {
  if (description) {
    return description;
  }
  switch (type) {
    case CitationType.MIND_MAP:
      return "思维导图";
    case CitationType.COURSE:
      return "课程";
    case CitationType.SOLUTION_CODE:
      return "代码";
    default:
      return "";
  }
};

export const Citation = ({
  citation,
  onClick,
  className,
  ...props
}: CitationProps) => {
  if (!citation) {
    return null;
  }

  const IconComponent = getCitationIcon(citation.type);
  const color = getCitationColor(citation.type);

  return (
    <div
      className={cn(
        'my-2 p-3 rounded-lg border border-gray-300 bg-gray-200 backdrop-blur-sm',
        'hover:bg-gray-300 transition-colors duration-200',
        'group cursor-pointer inline-block max-w-72',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* 图标区域 */}
        <div className="flex-shrink-0 p-2 rounded-md text-muted-foreground group-hover:text-foreground transition-colors">
          <IconComponent className={cn("h-5 w-5", color)} />
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h4 className="font-medium text-sm text-foreground truncate mb-1">
            {citation.title}
          </h4>
          
          {/* 类型 */}
          <span className="text-muted-foreground text-xs font-medium">
            {getCitationDescription(citation.type)}
          </span>
        </div>
      </div>
    </div>
  );
};
