import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  colorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className, colorClassName, ...props }) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-slate-100 h-2.5', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-stayon-purple to-pink-400',
          colorClassName
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
