import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading your STAYON workspace...', className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center stayon-card my-6', className)}>
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-stayon-purple/20 border-t-stayon-purple animate-spin" />
        <Sparkles className="w-5 h-5 text-stayon-purple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-600 animate-pulse">{message}</p>
    </div>
  );
};
