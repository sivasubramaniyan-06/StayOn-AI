import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, maxLength, showCharCount, value, onChange, ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className={cn(
            'stayon-input w-full py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all resize-y min-h-[100px]',
            error && 'border-red-400 focus:border-red-500',
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between mt-1">
          {error ? <p className="text-xs text-red-500 font-medium">{error}</p> : <div />}
          {showCharCount && maxLength && (
            <span className="text-xs text-slate-400 font-medium ml-auto">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
