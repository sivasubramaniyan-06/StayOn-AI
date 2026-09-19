import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'stayon-gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-stayon-purple/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-stayon-purple text-white hover:bg-stayon-purple/90 shadow-md shadow-stayon-purple/25 rounded-2xl',
      'stayon-gradient': 'bg-gradient-to-r from-stayon-purple via-purple-600 to-pink-500 text-white hover:opacity-95 shadow-lg shadow-stayon-purple/30 rounded-2xl',
      secondary: 'bg-stayon-lavender text-stayon-purple hover:bg-stayon-lavender/80 rounded-2xl',
      outline: 'border border-stayon-purple/30 text-stayon-purple hover:bg-stayon-lavender/40 rounded-2xl',
      ghost: 'text-slate-600 hover:text-stayon-purple hover:bg-stayon-purple/10 rounded-xl',
      danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-2xl',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
      icon: 'p-2 w-10 h-10 rounded-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
