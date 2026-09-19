import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Target, CheckSquare, Calendar, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MobileNavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const mobileItems: MobileNavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Knowledge', path: '/knowledge', icon: BookOpen },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Schedule', path: '/schedule', icon: Calendar },
  { name: 'AI', path: '/stay-on-ai', icon: Sparkles },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 px-2 py-2 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all',
                active ? 'text-stayon-purple font-bold' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <div className={cn('p-1 rounded-full transition-transform', active && 'bg-stayon-lavender scale-110')}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 font-medium tracking-tight">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
