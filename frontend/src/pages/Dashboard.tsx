import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Target,
  CheckSquare,
  Calendar,
  ArrowRight,
  Clock,
  Send,
  MoreHorizontal,
  Flame,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Grid,
  BarChart2,
  CheckCircle,
  Flag
} from 'lucide-react';
import { tasksService } from '../services/tasks';
import { goalsService } from '../services/goals';
import { authService } from '../services/auth';
import { getGreeting, formatFormattedDate } from '../utils/date';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Button } from '../components/ui/Button';

export const Dashboard: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'knowledge' | 'goals' | 'tasks' | 'schedule'>('all');
  const [aiPrompt, setAiPrompt] = useState('');
  const user = authService.getUser();
  const navigate = useNavigate();

  // Dynamic local greeting & formatted date
  const greeting = getGreeting();
  const formattedDate = formatFormattedDate();

  // Fetch today dashboard data from backend contract GET /today
  const { data: todayData } = useQuery({
    queryKey: ['today'],
    queryFn: () => tasksService.getToday(),
  });

  // Fetch goals data from backend contract GET /goals
  const { data: goalsData } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsService.getGoals(),
  });

  const activeTasks = todayData?.tasks || [];
  const pendingCount = activeTasks.filter(t => t.status !== 'completed').length;

  const handleAskAI = (promptText?: string) => {
    const textToSend = promptText || aiPrompt;
    if (!textToSend.trim()) return;
    navigate('/stay-on-ai', { state: { initialPrompt: textToSend } });
  };

  return (
    <div className="space-y-6 pb-8 select-none relative z-10">
      
      {/* ========================================================================= */}
      {/* SUBHEADER: GREETING, DATE & FILTER CATEGORY PILLS MATCHING PDF IMAGE */}
      {/* ========================================================================= */}
      <div className="flex flex-col space-y-4">
        
        {/* Greeting & Date Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{greeting}, <span className="text-[#6C5CE7]">{user.name}</span></span>
              <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="text-slate-600 font-semibold">{pendingCount} tasks for today</span>
            </p>
          </div>

          {/* Top Right Handwriting Note matching PDF Image */}
          <div className="hidden lg:block text-right text-[#6C5CE7] font-sans text-xs tracking-wide transform -rotate-3 opacity-90 leading-tight">
            Small steps<br />today, a brighter<br />tomorrow. ♡
          </div>
        </div>

        {/* Filter Category Pills & Search Anything bar matching PDF Image */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>All</span>
            </button>

            <button
              onClick={() => setFilterCategory('knowledge')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filterCategory === 'knowledge'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge</span>
            </button>

            <button
              onClick={() => setFilterCategory('goals')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filterCategory === 'goals'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Goals</span>
            </button>

            <button
              onClick={() => setFilterCategory('tasks')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filterCategory === 'tasks'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </button>

            <button
              onClick={() => setFilterCategory('schedule')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filterCategory === 'schedule'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
          </div>

          {/* Right side Search input with Filter icon matching PDF */}
          <div className="relative flex items-center w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-white/80 backdrop-blur-md border border-white rounded-full pl-10 pr-9 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:bg-white shadow-sm"
            />
            <SlidersHorizontal className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MAIN DASHBOARD CARDS GRID (MATCHING PDF EXACT PROPORTIONS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Columns Container */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Row 1: Today's Focus & Learning Progress */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Today's Focus Card (7 cols) */}
            <Card className="md:col-span-7 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#6C5CE7]">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Today's Focus</h3>
                </div>
                <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="text-lg font-bold text-slate-900">Complete AWS research notes</h4>
                
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#6C5CE7]" /> 45 min
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                    <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> High Priority
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  Build a strong foundation for your certification journey.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="stayon-gradient" size="sm" onClick={() => navigate('/tasks')} className="gap-2 shadow-md rounded-full px-6 py-2.5">
                  <span>Start Focus</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                {/* Pink/Peach Sticky Note Graphic matching PDF Page */}
                <div className="bg-[#FFF3D6] border border-amber-200/80 p-3 rounded-2xl rotate-6 shadow-md max-w-[130px] text-center transform hover:rotate-0 transition-transform">
                  <p className="text-[11px] font-bold text-slate-800 handwriting-note leading-tight">
                    You Can Do This! ♡
                  </p>
                  <div className="text-xl mt-1">💻</div>
                </div>
              </div>
            </Card>

            {/* Learning Progress Card (5 cols) */}
            <Card className="md:col-span-5 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Learning Progress</h3>
                </div>
                <button onClick={() => navigate('/goals')} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                {/* Knowledge Box */}
                <div className="bg-[#FFF7ED] p-3.5 rounded-2xl border border-amber-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span>Knowledge</span>
                  </div>
                  <span className="text-3xl font-black text-amber-600 my-1">43%</span>
                  {/* Amber Sparkline Curve SVG */}
                  <svg className="w-full h-6 text-amber-400 my-1" viewBox="0 0 100 30" fill="none">
                    <path d="M 0 20 Q 25 5 50 15 T 100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] text-slate-400 font-medium">8/12 topics</span>
                </div>

                {/* Goals Box */}
                <div className="bg-[#F3F0FF] p-3.5 rounded-2xl border border-purple-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Target className="w-3.5 h-3.5 text-[#6C5CE7]" />
                    <span>Goals</span>
                  </div>
                  <span className="text-3xl font-black text-[#6C5CE7] my-1">74%</span>
                  {/* Purple Sparkline Curve SVG */}
                  <svg className="w-full h-6 text-[#6C5CE7] my-1" viewBox="0 0 100 30" fill="none">
                    <path d="M 0 25 Q 30 10 60 20 T 100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] text-slate-400 font-medium">3/4 goals</span>
                </div>
              </div>
            </Card>

          </div>

          {/* Row 2: My Goals, Today's Tasks, Upcoming */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* My Goals Card (4 cols) */}
            <Card className="md:col-span-4 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-base tracking-tight">My Goals</h3>
                <button onClick={() => navigate('/goals')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 my-auto">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Flag className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">AWS Certification</h4>
                    <p className="text-[11px] text-slate-400 leading-tight">Build cloud skills and get certified</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-black text-[#6C5CE7]">
                    <div />
                    <span>40%</span>
                  </div>
                  <Progress value={40} className="h-2.5 bg-slate-100" />
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-medium pt-3 block border-t border-slate-100">
                8 / 20 tasks completed
              </span>
            </Card>

            {/* Today's Tasks Card (5 cols) */}
            <Card className="md:col-span-5 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#6C5CE7]" />
                  <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Today's Tasks</h3>
                </div>
                <button onClick={() => navigate('/tasks')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-800">Complete AWS research notes</span>
                  </div>
                  <Badge variant="pink" className="text-[10px] px-2 py-0.5">High</Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-800">Read System Design chapter</span>
                  </div>
                  <Badge variant="amber" className="text-[10px] px-2 py-0.5">Medium</Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 cursor-pointer" />
                    <span className="text-xs font-bold text-slate-800">Prepare internship application draft</span>
                  </div>
                  <Badge variant="blue" className="text-[10px] px-2 py-0.5">Low</Badge>
                </div>
              </div>
            </Card>

            {/* Upcoming Card (3 cols) */}
            <Card className="md:col-span-3 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6C5CE7]" />
                  <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Upcoming</h3>
                </div>
                <button onClick={() => navigate('/schedule')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="text-center font-black text-slate-700 leading-none shrink-0 w-8">
                    <span className="text-[9px] uppercase block text-slate-400">OCT</span>
                    <span className="text-base">15</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[11px] truncate">AWS Internship Application</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="text-center font-black text-slate-700 leading-none shrink-0 w-8">
                    <span className="text-[9px] uppercase block text-slate-400">OCT</span>
                    <span className="text-base">22</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[11px] truncate">System Design Milestone</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="text-center font-black text-slate-700 leading-none shrink-0 w-8">
                    <span className="text-[9px] uppercase block text-slate-400">NOV</span>
                    <span className="text-base">30</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800 text-[11px] truncate">AWS Certification Exam</span>
                </div>
              </div>
            </Card>

          </div>

        </div>

        {/* Right 4 Columns: StayOn AI Companion Card matching PDF Image */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          <Card className="bg-gradient-to-b from-[#F3F0FF] via-white to-[#E8E5FF] border border-purple-200/80 rounded-[2.5rem] p-7 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[440px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#6C5CE7]" />
                  <h3 className="font-extrabold text-slate-900 text-lg">StayOn AI</h3>
                </div>
                <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-semibold text-slate-600 mb-6">
                Your personal study companion.
              </p>

              <ul className="space-y-3 text-xs text-slate-700 font-semibold">
                <li className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#6C5CE7] shadow-sm">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span>Summarize notes</span>
                </li>

                <li className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#6C5CE7] shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span>Explain concepts</span>
                </li>

                <li className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#6C5CE7] shadow-sm">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span>Plan your week</span>
                </li>

                <li className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[#6C5CE7] shadow-sm">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span>Break down goals</span>
                </li>
              </ul>
            </div>

            {/* Robot 3D Illustration Vector matching PDF Image */}
            <div className="relative mt-6 flex justify-end">
              <div className="w-36 h-36 relative animate-float">
                <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl">
                  {/* Robot Head */}
                  <rect x="40" y="30" width="80" height="60" rx="25" fill="#1E1B4B" />
                  <rect x="48" y="38" width="64" height="44" rx="18" fill="#312E81" />
                  {/* Visor & Glowing Eyes */}
                  <ellipse cx="64" cy="58" rx="8" ry="10" fill="#60A5FA" />
                  <ellipse cx="96" cy="58" rx="8" ry="10" fill="#60A5FA" />
                  <ellipse cx="66" cy="56" rx="3" ry="4" fill="#FFFFFF" />
                  <ellipse cx="98" cy="56" rx="3" ry="4" fill="#FFFFFF" />
                  {/* Antenna */}
                  <circle cx="80" cy="18" r="7" fill="#6C5CE7" />
                  <rect x="78" y="24" width="4" height="8" fill="#6C5CE7" />
                  {/* Body & Arms */}
                  <rect x="50" y="95" width="60" height="50" rx="20" fill="#FFFFFF" />
                  <rect x="62" y="105" width="36" height="25" rx="8" fill="#EEF2FF" />
                  {/* Laptop */}
                  <rect x="40" y="125" width="65" height="25" rx="4" fill="#2563EB" />
                  <polygon points="35,145 110,145 120,152 25,152" fill="#64748B" />
                </svg>
              </div>
            </div>
          </Card>

          {/* Bottom Right Handwriting Note matching PDF Image */}
          <div className="text-right text-[#6C5CE7] font-sans text-xs tracking-wide transform -rotate-3 opacity-90 leading-tight pt-2 pr-2">
            Better<br />Students<br />Brighter<br />Tomorrows<br />♡
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ROW 3: ASK STAYON AI PROMPT BANNER AT BOTTOM MATCHING PDF */}
      {/* ========================================================================= */}
      <Card className="bg-white/90 border border-purple-100/80 rounded-[2rem] p-6 shadow-sm mt-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles className="w-5 h-5 text-[#6C5CE7]" />
          <h3 className="font-extrabold text-slate-900 text-base">Ask StayOn AI</h3>
        </div>
        <p className="text-xs text-slate-400 font-medium mb-4">
          Ask anything about your notes, goals, tasks, or learning journey!
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="How can I help you today?"
            className="w-full bg-[#F4F3F8] border border-slate-200/80 rounded-full py-3.5 px-6 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:bg-white shadow-inner font-medium"
          />
          <button
            type="submit"
            className="w-12 h-12 rounded-2xl bg-[#6C5CE7] hover:bg-[#5A4AD1] text-white flex items-center justify-center shadow-lg shadow-[#6C5CE7]/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Suggested Prompt Chips matching PDF Image */}
        <div className="flex flex-wrap items-center gap-2.5">
          {['Plan my week', 'Summarize this document', 'Break down a goal', 'How can I stay consistent?', 'Explain a concept'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleAskAI(chip)}
              className="px-4 py-2 rounded-full bg-[#F4F3F8] hover:bg-[#E8E5FF] border border-slate-200/60 text-xs text-slate-700 font-semibold transition-all shadow-sm cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </Card>

    </div>
  );
};
