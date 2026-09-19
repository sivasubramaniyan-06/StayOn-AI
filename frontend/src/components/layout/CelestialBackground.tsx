import React from 'react';
import { Sparkles, Star } from 'lucide-react';

interface CelestialBackgroundProps {
  variant?: 'login' | 'app';
}

export const CelestialBackground: React.FC<CelestialBackgroundProps> = ({ variant = 'app' }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Pastel Space Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-purple-50/50 to-pink-50/60" />

      {/* Floating Organic Soft Wavy Waves */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-purple-200/40 via-pink-200/30 to-transparent rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[700px] h-[500px] bg-gradient-to-tr from-blue-200/30 via-lavender/40 to-transparent rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4" />

      {/* Saturn-like Ringed Planet (Upper Right / Center-Top as in Page 1 & 2 PDF) */}
      <div className="absolute top-6 right-[15%] sm:right-[20%] opacity-85 animate-float">
        <div className="relative w-20 h-20 sm:w-28 sm:h-28">
          {/* Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-10 sm:w-44 sm:h-14 border-[3px] border-purple-300/60 rounded-full transform -rotate-12 blur-[0.5px] shadow-sm" />
          {/* Planet Body */}
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-400 via-pink-300 to-amber-200 shadow-xl shadow-purple-500/20 ring-2 ring-white/50" />
        </div>
      </div>

      {/* Small Secondary Pastel Moon / Planet (Upper Left) */}
      <div className="absolute top-16 left-[10%] opacity-60 animate-pulse-subtle">
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-300 via-purple-200 to-pink-200 shadow-md ring-1 ring-white/60" />
      </div>

      {/* Shooting Star Comet Trail (Top Left to Center) */}
      <div className="absolute top-12 left-[25%] opacity-70 transform -rotate-45">
        <div className="w-32 sm:w-48 h-0.5 bg-gradient-to-r from-white via-purple-300 to-transparent rounded-full shadow-lg shadow-purple-400/50" />
      </div>

      {/* Floating Sparkles & Twinkling Stars Pattern */}
      <div className="absolute top-[18%] left-[8%] text-purple-400/70 animate-pulse">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="absolute top-[8%] left-[45%] text-pink-400/70 animate-pulse">
        <Sparkles className="w-3 h-3" />
      </div>
      <div className="absolute top-[25%] right-[8%] text-amber-400/80 animate-pulse">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="absolute bottom-[20%] left-[15%] text-purple-400/60 animate-pulse">
        <Star className="w-3 h-3 fill-purple-300" />
      </div>
      <div className="absolute bottom-[35%] right-[25%] text-pink-400/60 animate-pulse">
        <Star className="w-4 h-4 fill-pink-200" />
      </div>

      {/* Soft Wave Curves matching StayOn PDF bottom/top boundaries */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-32 text-purple-200/20 fill-current" viewBox="0 0 1440 320">
        <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,224C960,245,1056,235,1152,208C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
    </div>
  );
};
