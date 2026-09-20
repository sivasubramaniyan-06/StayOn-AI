import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authService } from '../services/auth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('demo@stayon.ai');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0B1A] font-sans text-white select-none flex flex-col justify-between">
      
      {/* ========================================================================= */}
      {/* CELESTIAL SPACE & PASTEL WAVE BACKGROUND CANVAS LAYER */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-0">
        
        {/* Deep Cosmic Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0B1E] via-[#121332] to-[#1C1747]" />

        {/* Dynamic Curved Flowing Pastel Waves (Right & Bottom Pink/Peach/Amber Glow) */}
        <svg className="absolute inset-0 w-full h-full preserve-3d" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#EC4899" stopOpacity="0.80" />
              <stop offset="75%" stopColor="#F97316" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="0.85" />
            </linearGradient>
            
            <linearGradient id="waveGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#FCE7F3" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.95" />
            </linearGradient>

            <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="60%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#3B0764" />
            </radialGradient>
          </defs>

          {/* Main Diagonal Colorful Ribbon Wave */}
          <path
            d="M 450,0 C 750,150 500,450 1440,220 L 1440,900 L 0,900 L 0,400 C 250,550 300,100 450,0 Z"
            fill="url(#waveGradient1)"
          />

          {/* Foreground Soft White/Pastel Light Wave Layer behind card */}
          <path
            d="M 600,900 C 800,650 650,400 1440,300 L 1440,900 Z"
            fill="url(#waveGradientLight)"
          />
        </svg>

        {/* Ringed Planet in Deep Space (Upper Middle Right) */}
        <div className="absolute top-[8%] left-[42%] sm:left-[45%] opacity-90 animate-float">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32">
            {/* Tilted Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-12 sm:w-52 sm:h-16 border-[3px] border-pink-300/60 rounded-full transform -rotate-12 blur-[0.5px] shadow-lg shadow-purple-500/30" />
            {/* Planet Body */}
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-800 via-purple-500 to-pink-400 shadow-2xl shadow-purple-900/60 ring-1 ring-white/30" />
          </div>
        </div>

        {/* Secondary Moon/Planet */}
        <div className="absolute top-[22%] left-[50%] w-6 h-6 rounded-full bg-gradient-to-tr from-amber-300 to-pink-300 shadow-md opacity-80" />

        {/* Shooting Stars / Comet Lines */}
        <div className="absolute top-[12%] left-[30%] w-36 h-0.5 bg-gradient-to-r from-white via-pink-300 to-transparent transform -rotate-[35deg] opacity-80" />
        <div className="absolute top-[6%] left-[48%] w-24 h-0.5 bg-gradient-to-r from-white via-purple-300 to-transparent transform -rotate-[35deg] opacity-60" />

        {/* Twinkling Stars */}
        <div className="absolute top-[15%] left-[12%] w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <div className="absolute top-[28%] left-[22%] w-2 h-2 rounded-full bg-purple-200 animate-pulse" />
        <div className="absolute top-[8%] left-[35%] w-1 h-1 rounded-full bg-white opacity-80" />
        <div className="absolute top-[20%] right-[30%] w-2 h-2 rounded-full bg-pink-200 animate-pulse" />

        {/* Floating Astronaut reaching for Yellow Star */}
        <div className="absolute top-[42%] left-[28%] sm:left-[32%] -translate-y-1/2 flex items-center z-10 animate-float">
          <div className="relative">
            {/* Curved light trail behind astronaut */}
            <svg className="absolute -left-20 top-10 w-32 h-20 opacity-60" viewBox="0 0 100 60">
              <path d="M 0 50 Q 50 10 100 30" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            {/* Astronaut Vector Illustration */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 relative">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                {/* Backpack */}
                <rect x="45" y="65" width="30" height="60" rx="10" fill="#3B2E7E" />
                <rect x="40" y="70" width="10" height="50" rx="5" fill="#60A5FA" />
                {/* Body Suit */}
                <ellipse cx="100" cy="115" rx="35" ry="40" fill="#F1F5F9" />
                {/* Suit Details / Belt */}
                <path d="M 75 110 Q 100 120 125 110" stroke="#64748B" strokeWidth="3" fill="none" />
                <rect x="88" y="115" width="24" height="12" rx="3" fill="#3B82F6" />
                {/* Helmet */}
                <circle cx="100" cy="65" r="32" fill="#FFFFFF" />
                <ellipse cx="104" cy="65" rx="24" ry="20" fill="#1E1B4B" />
                <ellipse cx="106" cy="63" rx="20" ry="15" fill="url(#visorGradient)" />
                <defs>
                  <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                {/* Reaching Arm */}
                <path d="M 125 95 Q 155 75 175 60" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" fill="none" />
                <circle cx="175" cy="60" r="8" fill="#F1F5F9" />
                {/* Legs */}
                <path d="M 80 145 Q 70 175 55 185" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" fill="none" />
                <path d="M 115 145 Q 110 175 95 190" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Reached Yellow Star */}
          <div className="ml-2 -mt-16 animate-pulse">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.9)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        </div>

        {/* Bottom Left Dark Mountain Peaks & Stacked Books */}
        <div className="absolute bottom-0 left-0 z-10">
          <svg className="w-[320px] sm:w-[420px] h-[220px]" viewBox="0 0 400 220" fill="none">
            {/* Dark Mountain Peaks */}
            <path d="M -50 220 L 80 80 L 180 160 L 280 60 L 420 220 Z" fill="#1C1242" />
            <path d="M -20 220 L 120 110 L 240 220 Z" fill="#291A5B" />
            {/* Plant & Leaf Silhouettes */}
            <path d="M 20 180 Q 0 140 -20 130 Q 10 150 20 180" fill="#3B2675" />
            <path d="M 40 190 Q 30 130 10 110 Q 35 135 40 190" fill="#4C328E" />
            <path d="M 220 190 Q 240 140 260 120 Q 235 145 220 190" fill="#3B2675" />
          </svg>

          {/* Stacked Books with Spine Labels: Learn, Plan, Grow, Succeed */}
          <div className="absolute bottom-8 left-10 flex flex-col space-y-1 z-20">
            <div className="w-32 h-7 bg-[#2E2164] border-l-4 border-purple-400 rounded-r-md px-3 flex items-center text-xs font-bold text-white shadow-md">
              Learn
            </div>
            <div className="w-36 h-7 bg-[#251954] border-l-4 border-pink-400 rounded-r-md px-3 flex items-center text-xs font-bold text-white shadow-md ml-1">
              Plan
            </div>
            <div className="w-40 h-7 bg-[#1C1242] border-l-4 border-amber-400 rounded-r-md px-3 flex items-center text-xs font-bold text-white shadow-md">
              Grow
            </div>
            <div className="w-44 h-8 bg-[#150B33] border-l-4 border-emerald-400 rounded-r-md px-3 flex items-center text-sm font-bold text-white shadow-lg -ml-1">
              Succeed
            </div>
          </div>
        </div>

        {/* Handwriting Notes matching Exact PDF Locations */}
        <div className="absolute top-[36%] left-[51%] sm:left-[53%] text-white/90 text-xs sm:text-sm font-sans tracking-wide text-center transform -rotate-6">
          A<br />Focused You<br />A Brighter<br />Tomorrow<br />♡
        </div>

        <div className="absolute top-[52%] left-[10%] text-white/80 text-xs font-sans tracking-wide text-center transform -rotate-6">
          Same<br />Students<br />Bigger<br />Goals<br />♡
        </div>

        <div className="absolute bottom-6 left-6 text-white/70 text-[11px] font-sans leading-tight">
          Discipline<br />today,<br />freedom<br />tomorrow.
        </div>

        <div className="absolute bottom-6 right-8 text-slate-600 text-xs font-sans text-right transform -rotate-6">
          Small<br />Steps<br />Big<br />Futures<br />♡
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR MATCHING PDF EXACTLY */}
      {/* ========================================================================= */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
        {/* Brand Logo Left */}
        <div className="flex flex-col">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            STAY<span className="text-purple-400">ON</span>
          </span>
          <span className="text-[10px] text-purple-200/80 font-medium tracking-widest uppercase mt-1">
            Plan · Focus · Achieve
          </span>
        </div>

        {/* Nav Links Right */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-purple-100/90">
          <a href="#home" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Home</a>
          <a href="#features" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Features</a>
          <a href="#about" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">About</a>
          <a href="#contact" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contact</a>
          
          <button
            onClick={() => setError('Self-service registration is restricted for this demo. Please log in using demo@stayon.ai.')}
            className="px-7 py-2.5 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-all shadow-sm cursor-pointer"
          >
            Sign Up
          </button>
        </nav>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT HERO & RIGHT LOGIN CARD MATCHING PDF */}
      {/* ========================================================================= */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Hero Title & Subtitle */}
        <div className="lg:col-span-7 flex flex-col justify-center max-w-xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-4">
            Never Stop <br />
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-100 bg-clip-text text-transparent">
              Learning
            </span>
          </h1>

          <p className="text-base sm:text-lg text-purple-100/80 mb-3 font-normal leading-relaxed">
            Your AI study companion<br />for a brighter tomorrow.
          </p>

          <div className="w-12 h-1 bg-purple-400 rounded-full mb-12" />
        </div>

        {/* Right Login Card matching PDF visual reference */}
        <div className="lg:col-span-5 flex justify-end">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-slate-800 border border-white">
            
            {/* Card Header */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome to STAY<span className="text-purple-600">ON</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Log in to continue your learning journey.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-semibold text-center">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email Address */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-11 pr-11 py-3.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setError('Self-service password reset is disabled for this demo pool. Please use demo@stayon.ai or contact the administrator.')}
                    className="text-xs font-semibold text-purple-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
              >
                <span>{isLoading ? 'Logging in...' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-200/80 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
                OR
              </span>
            </div>

            {/* Social OAuth Login Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setError('Social login (Google) is not configured for this Cognito User Pool. Please log in with your email and password.')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => setError('Social login (GitHub) is not configured for this Cognito User Pool. Please log in with your email and password.')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Sign Up Footer Link */}
            <p className="mt-6 text-center text-xs text-slate-500 font-medium">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setError('Self-service registration is restricted for this demo. Please log in using demo@stayon.ai.')}
                className="text-purple-600 font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

      </main>

      {/* Spacer Footer */}
      <footer className="h-6 relative z-10" />

    </div>
  );
};
