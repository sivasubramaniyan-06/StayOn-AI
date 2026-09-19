import React, { useState } from 'react';
import { Search, RefreshCw, Download, Plus, Grid, ChevronDown } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { authService } from '../../services/auth';
import { useNavigate } from 'react-router-dom';

export interface TopbarProps {
  onSearchChange?: (term: string) => void;
  onRefresh?: () => void;
  onQuickAdd?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onSearchChange, onRefresh, onQuickAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const user = authService.getUser();
  const navigate = useNavigate();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 w-full h-20 bg-transparent px-4 lg:px-8 flex items-center justify-between transition-all select-none">
      
      {/* Brand Logo - Desktop Top Left matching PDF */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <span className="font-extrabold text-2xl tracking-tight text-slate-900 leading-none">
          STAY<span className="text-[#6C5CE7]">ON</span>
        </span>
      </div>

      {/* Center Top Search Bar matching PDF */}
      <div className="hidden md:flex items-center flex-1 max-w-lg mx-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search for notes, tasks, goals..."
            className="w-full bg-white/70 backdrop-blur-xl border border-white/90 rounded-full pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:bg-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          />
        </div>
      </div>

      {/* Action Controls Right matching PDF */}
      <div className="flex items-center gap-2.5">
        
        {/* Refresh Button Pill */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs font-semibold text-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Export Button Pill */}
        <button
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs font-semibold text-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Quick Add Black Circle (+) Button */}
        <button
          onClick={onQuickAdd || (() => navigate('/goals/new'))}
          className="w-10 h-10 rounded-full bg-[#120D2B] hover:bg-[#191436] text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Grid 4-Dots Button */}
        <button
          className="w-10 h-10 rounded-full bg-white/80 hover:bg-white border border-white/90 text-slate-700 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* User Profile Avatar & Name matching PDF */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-transparent hover:bg-white/40 transition-all cursor-pointer"
          >
            <Avatar src={user.avatarUrl} name={user.name} size="md" className="ring-2 ring-white shadow-sm" />
            <div className="hidden sm:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
              <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">Student</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 stayon-card p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 bg-white/95">
              <div className="p-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 rounded-xl transition-colors text-left"
              >
                Settings
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/help'); }}
                className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 rounded-xl transition-colors text-left"
              >
                Help & Support
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left font-semibold"
              >
                Log Out
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
