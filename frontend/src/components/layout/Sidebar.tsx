import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  BookOpen,
  Target,
  CheckSquare,
  Calendar,
  Sparkles,
  Settings,
  HelpCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Knowledge', path: '/knowledge', icon: BookOpen },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Schedule', path: '/schedule', icon: Calendar },
  { name: 'StayOn AI', path: '/stay-on-ai', icon: Sparkles },
];

const secondaryNavItems: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Help', path: '/help', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 64 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="hidden md:flex flex-col fixed left-4 top-20 bottom-6 z-40 bg-[#120D2B] rounded-[2.5rem] py-6 px-2.5 shadow-2xl select-none items-center justify-between"
    >
      {/* Top Nav Items Group */}
      <div className="w-full space-y-3 flex flex-col items-center">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 py-3 px-3 rounded-full transition-all duration-200 group text-left cursor-pointer w-full justify-center',
                isExpanded ? 'justify-start px-4' : 'justify-center',
                active
                  ? 'bg-[#6C5CE7] text-white shadow-lg shadow-[#6C5CE7]/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}
              title={!isExpanded ? item.name : undefined}
            >
              <div className={cn('w-6 h-6 flex items-center justify-center shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-white')}>
                <Icon className="w-5 h-5" />
              </div>

              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs font-semibold tracking-wide whitespace-nowrap overflow-hidden"
                >
                  {item.name}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>

      {/* Middle Divider Line */}
      <div className="w-8 border-t border-white/15 my-2" />

      {/* Bottom Nav Items Group */}
      <div className="w-full space-y-3 flex flex-col items-center">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 py-3 px-3 rounded-full transition-all duration-200 group text-left cursor-pointer w-full justify-center',
                isExpanded ? 'justify-start px-4' : 'justify-center',
                active
                  ? 'bg-[#6C5CE7] text-white shadow-lg shadow-[#6C5CE7]/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}
              title={!isExpanded ? item.name : undefined}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>

              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs font-semibold tracking-wide whitespace-nowrap overflow-hidden"
                >
                  {item.name}
                </motion.span>
              )}
            </button>
          );
        })}

        {/* Bottom Status Dot Indicator matching PDF */}
        <div className="pt-2 flex items-center justify-center">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute top-0 left-0 opacity-75" />
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
