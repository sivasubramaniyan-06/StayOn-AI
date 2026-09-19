import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'purple' | 'pink' | 'amber' | 'blue' | 'emerald' | 'rose' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'purple', children, ...props }) => {
  const variants = {
    purple: 'bg-purple-50 text-stayon-purple border border-purple-100',
    pink: 'bg-pink-50 text-pink-600 border border-pink-100',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100',
    outline: 'bg-white/80 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
