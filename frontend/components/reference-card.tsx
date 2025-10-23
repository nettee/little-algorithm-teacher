'use client';

import { cn } from '@/lib/utils';
import { BookOpenIcon, ChevronRightIcon, BrainIcon, CodeXml } from 'lucide-react';
import { type ComponentProps } from 'react';
import { ReferenceType } from '@/lib/types';

export type ReferenceCardProps = ComponentProps<'div'> & {
  title: string;
  artifactId: string;
  type?: ReferenceType;
  description?: string;
  onClick?: () => void;
};

const getReferenceIcon = (type: ReferenceType) => {
  switch (type) {
    case ReferenceType.MIND_MAP:
      return BrainIcon;
    case ReferenceType.SOLUTION_CODE:
      return CodeXml;
    case ReferenceType.COURSE:
    default:
      return BookOpenIcon;
  }
};

const getReferenceColor = (type: ReferenceType) => {
  switch (type) {
    case ReferenceType.MIND_MAP:
      return 'group-hover:text-orange-600';
    case ReferenceType.SOLUTION_CODE:
      return 'group-hover:text-blue-600';
    case ReferenceType.COURSE:
      return 'group-hover:text-green-600';
    default:
      return 'group-hover:text-primary';
  }
};

const getReferenceDescription = (type: ReferenceType, description?: string) => {
  if (description) {
    return description;
  }
  switch (type) {
    case ReferenceType.MIND_MAP:
      return "思维导图";
    case ReferenceType.COURSE:
      return "课程";
    case ReferenceType.SOLUTION_CODE:
      return "代码";
    default:
      return "";
  }
};

export const ReferenceCard = ({
  type = ReferenceType.COURSE,
  title,
  artifactId,
  description,
  onClick,
  className,
  ...props
}: ReferenceCardProps) => {
  const IconComponent = getReferenceIcon(type);
  const color = getReferenceColor(type);
  const descriptionText = getReferenceDescription(type, description);
  
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
        <IconComponent className={cn("h-5 w-5 text-muted-foreground transition-colors", color)} />
      </div>
      
      {/* 中间内容区域 */}
      <div className={cn(
        "flex-1 min-w-0",
        !descriptionText && "flex items-center"
      )}>
        {/* 标题 */}
        <h4 className="font-medium text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h4>
        
        {/* 描述 */}
        {descriptionText && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {descriptionText}
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
    type?: ReferenceType;
    description?: string;
  }>;
  onReferenceClick?: (reference: { title: string; artifactId: string; type?: ReferenceType; description?: string }) => void;
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
        'flex flex-wrap gap-3',
        className
      )}
      {...props}
    >
      {references.map((reference, index) => (
        <ReferenceCard
          key={index}
          type={reference.type}
          title={reference.title}
          artifactId={reference.artifactId}
          description={reference.description}
          onClick={() => onReferenceClick?.(reference)}
        />
      ))}
    </div>
  );
};
