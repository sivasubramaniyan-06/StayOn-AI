import React from 'react';
import { cn } from '../../utils/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, name = 'Siva', size = 'md', className, ...props }) => {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
  };

  const getInitials = (n: string) => {
    return n.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-stayon-purple to-purple-400 text-white font-medium shadow-sm ring-2 ring-white',
        sizes[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
