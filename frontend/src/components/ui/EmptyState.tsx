import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <FolderOpen className="w-8 h-8 text-stayon-purple" />,
  title,
  description,
  actionLabel,
  onAction,
  className
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-10 text-center stayon-card my-4', className)}>
      <div className="w-14 h-14 rounded-2xl bg-stayon-lavender/60 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
