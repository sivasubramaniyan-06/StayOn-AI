import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight,
  MoreHorizontal, BookOpen, Coffee, GitBranch, Zap, FileText,
  CalendarCheck, ArrowRight, X, List as ListIcon, CheckCircle2,
  Dumbbell
} from 'lucide-react';
import { tasksService } from '../services/tasks';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { cn } from '../utils/cn';
import type { Task, PriorityLevel } from '../types';

// ─── helpers & date utilities ────────────────────────────────────────────────

const TIME_SLOTS = [
  '5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
];

function formatDisplayDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMins(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// Map task to category accent colors, icons, and borders
interface TaskStyleConfig {
  bg: string;
  borderLeft: string;
  border: string;
  text: string;
  iconBg: string;
  iconColor: string;
  IconComponent: React.ElementType;
}

function getTaskStyle(task: Task): TaskStyleConfig {
  const title = (task.title || '').toLowerCase();
  const goal = (task.goalTitle || '').toLowerCase();

  if (title.includes('exercise') || title.includes('workout') || goal.includes('growth')) {
    if (title.includes('exercise')) {
      return {
        bg: 'bg-purple-50/90 hover:bg-purple-100/90',
        borderLeft: 'border-l-purple-500',
        border: 'border-purple-200/70',
        text: 'text-purple-950',
        iconBg: 'bg-purple-100 text-purple-600',
        iconColor: 'text-purple-600',
        IconComponent: Dumbbell,
      };
    }
  }

  if (title.includes('lunch') || title.includes('break') || title.includes('meal')) {
    return {
      bg: 'bg-amber-50/90 hover:bg-amber-100/90',
      borderLeft: 'border-l-amber-500',
      border: 'border-amber-200/70',
      text: 'text-amber-950',
      iconBg: 'bg-amber-100 text-amber-600',
      iconColor: 'text-amber-600',
      IconComponent: Coffee,
    };
  }

  if (title.includes('github') || title.includes('portfolio') || title.includes('git')) {
    return {
      bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
      borderLeft: 'border-l-emerald-500',
      border: 'border-emerald-200/70',
      text: 'text-emerald-950',
      iconBg: 'bg-emerald-100 text-emerald-600',
      iconColor: 'text-emerald-600',
      IconComponent: GitBranch,
    };
  }

  if (title.includes('lambda') || title.includes('code') || title.includes('dev')) {
    return {
      bg: 'bg-pink-50/90 hover:bg-pink-100/90',
      borderLeft: 'border-l-pink-500',
      border: 'border-pink-200/70',
      text: 'text-pink-950',
      iconBg: 'bg-pink-100 text-pink-600',
      iconColor: 'text-pink-600',
      IconComponent: Zap,
    };
  }

  if (title.includes('system design') || title.includes('dsa') || title.includes('read') || title.includes('study')) {
    return {
      bg: 'bg-violet-50/90 hover:bg-violet-100/90',
      borderLeft: 'border-l-stayon-purple',
      border: 'border-purple-200/70',
      text: 'text-purple-950',
      iconBg: 'bg-purple-100 text-stayon-purple',
      iconColor: 'text-stayon-purple',
      IconComponent: BookOpen,
    };
  }

  if (title.includes('plan') || title.includes('review') || title.includes('tomorrow')) {
    return {
      bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
      borderLeft: 'border-l-indigo-500',
      border: 'border-indigo-200/70',
      text: 'text-indigo-950',
      iconBg: 'bg-indigo-100 text-indigo-600',
      iconColor: 'text-indigo-600',
      IconComponent: CalendarCheck,
    };
  }

  // AWS research / general default
  return {
    bg: 'bg-sky-50/90 hover:bg-sky-100/90',
    borderLeft: 'border-l-sky-500',
    border: 'border-sky-200/70',
    text: 'text-sky-950',
    iconBg: 'bg-sky-100 text-sky-600',
    iconColor: 'text-sky-600',
    IconComponent: FileText,
  };
}

// Convert "08:00" or "13:30" to standard 12-hr label "8:00 AM" or "1:30 PM"
function formatStartTime(startStr?: string): string {
  if (!startStr) return '';
  const [hStr, mStr] = startStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

// Map task start time to nearest timeline slot index for positioning
function getSlotForTask(task: Task): string {
  if (!task.scheduledStart) {
    if (task.id === 'task-500') return '6:00 AM';
    if (task.id === 'task-501') return '8:00 AM';
    if (task.id === 'task-502') return '9:00 AM';
    if (task.id === 'task-510') return '1:00 PM';
    if (task.id === 'task-503') return '2:00 PM';
    if (task.id === 'task-504') return '5:00 PM';
    if (task.id === 'task-511') return '7:00 PM';
    return '9:00 AM';
  }

  const [hStr] = task.scheduledStart.split(':');
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:00 ${period}`;
}

// ─── Monthly Calendar Widget ────────────────────────────────────────────────

interface MonthlyCalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  taskDates: Set<string>;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onSelectDate,
  taskDates,
}) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const adjustedFirst = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isSelected = (day: number) =>
    day === selectedDate.getDate() &&
    month === selectedDate.getMonth() &&
    year === selectedDate.getFullYear();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="stayon-card p-5 bg-white/90 backdrop-blur-md shadow-xs border border-white/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {dayLabels.map(day => (
          <span key={day} className="text-[11px] font-semibold text-slate-400">
            {day}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-8" />;
          }

          const currentIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasTasks = taskDates.has(currentIso);
          const active = isSelected(day);

          return (
            <button
              key={`day-${day}`}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={cn(
                'h-8 w-8 mx-auto rounded-full text-xs font-semibold flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer',
                active
                  ? 'bg-stayon-purple text-white shadow-md font-bold'
                  : 'text-slate-700 hover:bg-purple-50 hover:text-stayon-purple'
              )}
            >
              <span>{day}</span>
              {hasTasks && !active && (
                <span className="w-1 h-1 rounded-full bg-stayon-purple absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Upcoming Tasks Widget ───────────────────────────────────────────────────

interface UpcomingTasksProps {
  tasks: Task[];
  onToggleTask: (id: string, completed: boolean) => void;
}

const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ tasks }) => {
  const navigate = useNavigate();

  const priorityColors: Record<PriorityLevel, { text: string; bg: string }> = {
    high: { text: 'text-pink-600 font-semibold', bg: 'bg-pink-50 border border-pink-100' },
    medium: { text: 'text-amber-600 font-semibold', bg: 'bg-amber-50 border border-amber-100' },
    low: { text: 'text-sky-600 font-semibold', bg: 'bg-sky-50 border border-sky-100' },
  };

  const dotColors = ['bg-stayon-purple', 'bg-sky-500', 'bg-emerald-500', 'bg-pink-500'];

  const displayTasks = tasks.slice(0, 4);

  return (
    <div className="stayon-card p-5 bg-white/90 backdrop-blur-md shadow-xs border border-white/80">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Upcoming Tasks</h3>
        <button
          onClick={() => navigate('/tasks')}
          className="text-xs font-bold text-stayon-purple hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer group"
        >
          View All
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="space-y-2.5">
        {displayTasks.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No upcoming tasks scheduled</p>
        ) : (
          displayTasks.map((task, idx) => {
            const priority = task.priority || 'medium';
            const dotColor = dotColors[idx % dotColors.length];
            const pStyle = priorityColors[priority];
            const timeLabel = task.scheduledStart
              ? `Today, ${formatStartTime(task.scheduledStart)}`
              : 'Today';

            return (
              <div
                key={task.id}
                className="p-2.5 rounded-2xl bg-white/60 hover:bg-white border border-slate-100 hover:border-purple-100 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                  <div className="min-w-0">
                    <h4
                      className={cn(
                        'text-xs font-bold text-slate-800 truncate',
                        task.status === 'completed' && 'line-through text-slate-400'
                      )}
                    >
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {timeLabel}
                    </span>
                  </div>
                </div>

                <span className={cn('text-[10px] px-2 py-0.5 rounded-md flex-shrink-0 uppercase tracking-wide', pStyle.bg, pStyle.text)}>
                  {priority}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Motivational Card ───────────────────────────────────────────────────────

const MotivationalCard: React.FC = () => {
  return (
    <div className="stayon-card p-5 bg-gradient-to-br from-purple-50/90 via-white to-pink-50/90 border border-purple-100/70 shadow-xs relative overflow-hidden">
      {/* Decorative soft glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 text-emerald-600 mb-1">
              <span className="text-sm">🌱</span>
            </div>
            <p className="text-xs font-extrabold text-slate-700 italic leading-snug tracking-tight">
              "Discipline today,<br />freedom tomorrow."
            </p>
          </div>

          {/* Cute Astronaut SVG on crescent / rock */}
          <div className="flex-shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* Rock / Mountain base */}
              <path d="M10 65 Q 36 50 68 62 L 68 70 L 10 70 Z" fill="#6C5CE7" opacity="0.3"/>
              <path d="M20 62 Q 40 54 62 60" stroke="#7C6EFA" strokeWidth="2" strokeLinecap="round"/>

              {/* Body */}
              <ellipse cx="38" cy="42" rx="14" ry="16" fill="#F0EEFF" stroke="#C4B5FD" strokeWidth="1.5"/>
              {/* Helmet */}
              <circle cx="38" cy="24" r="12" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="1.5"/>
              {/* Visor */}
              <ellipse cx="38" cy="24" rx="7.5" ry="6" fill="#6C5CE7" opacity="0.7"/>
              <ellipse cx="38" cy="24" rx="7.5" ry="6" fill="none" stroke="#7C6EFA" strokeWidth="1"/>
              {/* Visor shine */}
              <path d="M34 21 Q 38 19 40 21" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>

              {/* Laptop in hands */}
              <rect x="26" y="38" width="16" height="10" rx="1.5" fill="#A29BFE" stroke="#6C5CE7" strokeWidth="1"/>
              <polygon points="24,48 44,48 42,52 26,52" fill="#C4B5FD"/>

              {/* Left arm */}
              <path d="M24 38 Q 28 42 30 42" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
              {/* Right arm */}
              <path d="M50 38 Q 46 42 42 42" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>

              {/* Backpack */}
              <rect x="46" y="36" width="6" height="10" rx="2" fill="#D6CEFF" stroke="#A29BFE" strokeWidth="1"/>

              {/* Sparkles */}
              <path d="M60 14 L61 17 L64 18 L61 19 L60 22 L59 19 L56 18 L59 17 Z" fill="#FD79A8" opacity="0.9"/>
              <circle cx="16" cy="26" r="1.5" fill="#A29BFE"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Schedule Page Component ───────────────────────────────────────────

type ViewMode = 'day' | 'week' | 'list';

export const Schedule: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  // Default to reference date Sep 19, 2026 for pixel-perfect design alignment
  const [selectedDate, setSelectedDate] = useState<Date>(new Date('2026-09-19T00:00:00'));
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  // Schedule task modal state
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('goal-001');
  const [scheduledStartTime, setScheduledStartTime] = useState('08:00');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);

  const queryClient = useQueryClient();

  // ── fetch tasks ──
  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksService.getTasks(),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      tasksService.updateTask(id, { status: completed ? 'completed' : 'pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setTaskToDelete(null);
    },
  });

  const totalDurationMins = useMemo(() => {
    return (Math.max(0, Number(estimatedHours) || 0) * 60) + Math.max(0, Number(estimatedMinutes) || 0);
  }, [estimatedHours, estimatedMinutes]);

  const createTaskMutation = useMutation({
    mutationFn: () => {
      return tasksService.createTask({
        title: taskTitle,
        goalId: selectedGoalId || undefined,
        scheduledDate: toIsoDate(selectedDate),
        scheduledStart: scheduledStartTime,
        estimatedMinutes: totalDurationMins > 0 ? totalDurationMins : 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setShowScheduleModal(false);
      setTaskTitle('');
      setEstimatedHours(1);
      setEstimatedMinutes(0);
    },
  });

  const allTasks = useMemo(() => tasks ?? [], [tasks]);

  // Set of dates that have tasks (for calendar dot indicators)
  const taskDates = useMemo(() => {
    const set = new Set<string>();
    allTasks.forEach(t => {
      if (t.scheduledDate) set.add(t.scheduledDate);
    });
    return set;
  }, [allTasks]);

  // Tasks scheduled for the currently selected date
  const selectedIsoDate = toIsoDate(selectedDate);
  const dayTasks = useMemo(() => {
    return allTasks.filter(t => (t.scheduledDate || '2026-09-19') === selectedIsoDate);
  }, [allTasks, selectedIsoDate]);

  // Group tasks by timeline slot for the Day view
  const tasksBySlot = useMemo(() => {
    const map = new Map<string, Task[]>();
    TIME_SLOTS.forEach(slot => map.set(slot, []));

    dayTasks.forEach(task => {
      const slot = getSlotForTask(task);
      const list = map.get(slot) || [];
      list.push(task);
      map.set(slot, list);
    });

    return map;
  }, [dayTasks]);

  // Date navigation handlers
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date('2026-09-19T00:00:00'));
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingState message="Loading your schedule..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16">
        <ErrorState message="Failed to load schedule." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="select-none space-y-5">
      {/* ── Top Header Banner & Controls ── */}
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Schedule</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">Plan your time, own your future.</p>
          </div>

          {/* Top-Right Decorative Banner & CTA */}
          <div className="flex items-center gap-3">
            {/* Soft Motivational Quote Banner */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-50/90 via-pink-50/80 to-purple-50/90 border border-purple-100/80 shadow-xs">
              <span className="text-xs font-bold text-slate-700 italic">
                A Well Planned Day Leads to a Brighter Tomorrow ♡
              </span>
              <span className="text-base">🚀</span>
            </div>

            <Button
              variant="stayon-gradient"
              size="md"
              onClick={() => setShowScheduleModal(true)}
              className="gap-2 shadow-lg flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Schedule Task
            </Button>
          </div>
        </div>

        {/* ── View Controls Bar + Date Navigation ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-xs">
            {(['day', 'week', 'list'] as ViewMode[]).map(mode => {
              const isActive = viewMode === mode;
              const labels: Record<ViewMode, { name: string; icon: React.ElementType }> = {
                day: { name: 'Day', icon: CalendarIcon },
                week: { name: 'Week', icon: CalendarCheck },
                list: { name: 'List', icon: ListIcon },
              };
              const { name, icon: Icon } = labels[mode];

              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5',
                    isActive
                      ? 'bg-stayon-purple text-white shadow-sm'
                      : 'text-slate-600 hover:text-stayon-purple hover:bg-purple-50/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {name}
                </button>
              );
            })}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/90 backdrop-blur-md rounded-full border border-white/90 shadow-xs px-1.5 py-1">
              <button
                onClick={handlePrevDate}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-stayon-purple hover:bg-purple-50 transition-colors cursor-pointer"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-800">
                <CalendarIcon className="w-3.5 h-3.5 text-stayon-purple" />
                <span>{formatDisplayDate(selectedDate)}</span>
              </div>

              <button
                onClick={handleNextDate}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-stayon-purple hover:bg-purple-50 transition-colors cursor-pointer"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/90 shadow-xs text-xs font-bold text-slate-700 hover:text-stayon-purple hover:bg-purple-50 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout Split: Timeline (Left) & Widgets (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: Daily Timeline Card ── */}
        <div className="lg:col-span-8">
          <div className="stayon-card p-6 bg-white/90 backdrop-blur-md shadow-xs border border-white/80 rounded-3xl min-h-[600px]">
            {/* All Day Banner Header */}
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-16 flex-shrink-0 text-right">
                All day
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50/80 border border-pink-100/80 text-pink-600 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                Stay consistent! 💪
              </div>
            </div>

            {/* ── DAY VIEW: Timeline Grid ── */}
            {viewMode === 'day' && (
              <div className="space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const slotTasks = tasksBySlot.get(slot) || [];

                  return (
                    <div key={slot} className="flex items-start gap-4 min-h-[52px] group">
                      {/* Left Hour Label */}
                      <span className="text-xs font-semibold text-slate-400 w-16 text-right flex-shrink-0 pt-2.5">
                        {slot}
                      </span>

                      {/* Right Timeline Lane & Schedule Block */}
                      <div className="flex-1 border-t border-slate-100/90 pt-1 pb-1 relative">
                        {slotTasks.length === 0 ? (
                          <div className="h-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center pl-2">
                            <button
                              onClick={() => {
                                const hMatch = slot.match(/^(\d+):00\s*(AM|PM)$/);
                                if (hMatch) {
                                  let hourNum = parseInt(hMatch[1], 10);
                                  if (hMatch[2] === 'PM' && hourNum < 12) hourNum += 12;
                                  if (hMatch[2] === 'AM' && hourNum === 12) hourNum = 0;
                                  setScheduledStartTime(`${String(hourNum).padStart(2, '0')}:00`);
                                }
                                setShowScheduleModal(true);
                              }}
                              className="text-[11px] font-semibold text-stayon-purple/80 hover:text-stayon-purple flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Quick Add
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {slotTasks.map(task => {
                              const style = getTaskStyle(task);
                              const { IconComponent } = style;

                              return (
                                <div
                                  key={task.id}
                                  className={cn(
                                    'p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs',
                                    style.bg,
                                    style.borderLeft,
                                    style.border
                                  )}
                                >
                                  {/* Left: Icon + Title + Goal */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs', style.iconBg)}>
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className={cn('text-xs sm:text-sm font-bold truncate leading-tight', style.text)}>
                                        {task.title}
                                      </h4>
                                      {task.goalTitle && (
                                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                          {task.goalTitle}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Duration + Actions */}
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-white/70 px-2.5 py-1 rounded-full border border-white">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {formatMins(task.estimatedMinutes)}
                                    </span>

                                    <button
                                      onClick={() => toggleTaskMutation.mutate({ id: task.id, completed: task.status !== 'completed' })}
                                      className={cn(
                                        'w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer border',
                                        task.status === 'completed'
                                          ? 'bg-emerald-500 text-white border-emerald-500'
                                          : 'border-slate-300 text-transparent hover:border-stayon-purple'
                                      )}
                                      title={task.status === 'completed' ? 'Mark incomplete' : 'Mark completed'}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>

                                    <div className="relative">
                                      <button
                                        onClick={() => setOpenMenuTaskId(prev => prev === task.id ? null : task.id)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
                                        aria-label="Options"
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </button>
                                      {openMenuTaskId === task.id && (
                                        <div
                                          className="absolute right-0 mt-1 w-32 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 shadow-lg z-20 py-1"
                                          onMouseLeave={() => setOpenMenuTaskId(null)}
                                        >
                                          <button
                                            onClick={() => {
                                              setOpenMenuTaskId(null);
                                              setTaskToDelete(task);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                          >
                                            Delete task
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── WEEK VIEW: 7-Day Agenda ── */}
            {viewMode === 'week' && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 py-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
                  const currentDayDate = new Date(selectedDate);
                  const dayOffset = idx - ((selectedDate.getDay() + 6) % 7);
                  currentDayDate.setDate(selectedDate.getDate() + dayOffset);
                  const currentIso = toIsoDate(currentDayDate);
                  const weekTasks = allTasks.filter(t => t.scheduledDate === currentIso);

                  return (
                    <div
                      key={dayName}
                      className={cn(
                        'p-3 rounded-2xl border transition-all min-h-[220px] flex flex-col',
                        currentIso === selectedIsoDate
                          ? 'bg-purple-50/50 border-stayon-purple/40 shadow-xs'
                          : 'bg-slate-50/60 border-slate-100'
                      )}
                    >
                      <div className="text-center pb-2 mb-2 border-b border-slate-200/60">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">{dayName}</span>
                        <h4 className="text-sm font-extrabold text-slate-800">{currentDayDate.getDate()}</h4>
                      </div>

                      <div className="space-y-1.5 flex-1 overflow-y-auto">
                        {weekTasks.map(t => (
                          <div
                            key={t.id}
                            className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs text-[11px]"
                          >
                            <span className="font-bold text-slate-800 line-clamp-1">{t.title}</span>
                            <span className="text-[10px] text-slate-400">{formatMins(t.estimatedMinutes)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── LIST VIEW: Chronological Agenda List ── */}
            {viewMode === 'list' && (
              <div className="space-y-2 py-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No tasks scheduled for this day</p>
                ) : (
                  dayTasks.map(task => {
                    const style = getTaskStyle(task);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'p-3 rounded-2xl border flex items-center justify-between gap-3',
                          style.bg,
                          style.borderLeft,
                          style.border
                        )}
                      >
                        <div>
                          <h4 className={cn('text-xs font-bold', style.text)}>{task.title}</h4>
                          <span className="text-[10px] text-slate-500">
                            {task.scheduledStart ? formatStartTime(task.scheduledStart) : 'Scheduled'} · {formatMins(task.estimatedMinutes)}
                          </span>
                        </div>
                        <Badge variant={task.status === 'completed' ? 'emerald' : 'purple'}>
                          {task.status}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Calendar + Upcoming Tasks + Motivational Card ── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Monthly Calendar */}
          <MonthlyCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            taskDates={taskDates}
          />

          {/* Upcoming Tasks */}
          <UpcomingTasks
            tasks={dayTasks}
            onToggleTask={(id, completed) => toggleTaskMutation.mutate({ id, completed })}
          />

          {/* Motivational Card */}
          <MotivationalCard />
        </div>
      </div>

      {/* ── Schedule Task Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="stayon-card max-w-md w-full p-6 bg-white shadow-2xl rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-stayon-purple" /> Schedule Task
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Read DynamoDB Architecture"
                  className="stayon-input w-full py-2.5 px-3 text-sm"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && taskTitle.trim()) createTaskMutation.mutate();
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Goal / Topic</label>
                <select
                  value={selectedGoalId}
                  onChange={e => setSelectedGoalId(e.target.value)}
                  className="stayon-input w-full py-2.5 px-3 text-sm cursor-pointer"
                >
                  <option value="goal-001">AWS Internship</option>
                  <option value="goal-002">DSA Preparation</option>
                  <option value="goal-003">Personal Growth</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={toIsoDate(selectedDate)}
                    onChange={e => {
                      if (e.target.value) {
                        setSelectedDate(new Date(`${e.target.value}T00:00:00`));
                      }
                    }}
                    className="stayon-input w-full py-2 px-3 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduledStartTime}
                    onChange={e => setScheduledStartTime(e.target.value)}
                    className="stayon-input w-full py-2 px-3 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Duration Inputs: Hours & Minutes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stayon-purple" />
                    Estimated Duration
                  </label>
                  <span className="text-xs font-bold text-stayon-purple bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {formatMins(totalDurationMins)} ({totalDurationMins} mins)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hours</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={estimatedHours}
                        onChange={e => setEstimatedHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="stayon-input w-full py-2.5 pl-3 pr-10 text-sm font-medium"
                        min={0}
                        max={24}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        hr{estimatedHours !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Minutes</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={estimatedMinutes}
                        onChange={e => setEstimatedMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="stayon-input w-full py-2.5 pl-3 pr-10 text-sm font-medium"
                        min={0}
                        max={59}
                        step={5}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        min{estimatedMinutes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Presets:</span>
                  {[
                    { label: '15m', h: 0, m: 15 },
                    { label: '30m', h: 0, m: 30 },
                    { label: '45m', h: 0, m: 45 },
                    { label: '1h', h: 1, m: 0 },
                    { label: '1h 30m', h: 1, m: 30 },
                    { label: '2h', h: 2, m: 0 },
                  ].map(preset => {
                    const isActive = estimatedHours === preset.h && estimatedMinutes === preset.m;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setEstimatedHours(preset.h);
                          setEstimatedMinutes(preset.m);
                        }}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border',
                          isActive
                            ? 'bg-stayon-purple text-white border-stayon-purple shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-stayon-purple hover:border-purple-200'
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => createTaskMutation.mutate()}
                  disabled={!taskTitle.trim() || createTaskMutation.isPending}
                  isLoading={createTaskMutation.isPending}
                >
                  Save Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="stayon-card max-w-sm w-full p-6 bg-white shadow-2xl rounded-3xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">
                Delete this task?
              </h3>
              <button
                onClick={() => setTaskToDelete(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              "{taskToDelete.title}" will be permanently removed from your schedule and task list.
            </p>

            <div className="flex justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setTaskToDelete(null)}
                disabled={deleteTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteTaskMutation.mutate(taskToDelete.id)}
                isLoading={deleteTaskMutation.isPending}
                disabled={deleteTaskMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
