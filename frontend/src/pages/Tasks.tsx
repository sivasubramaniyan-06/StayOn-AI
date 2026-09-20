import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Clock, MoreHorizontal, Calendar, ChevronLeft, ChevronRight,
  BookOpen, CheckSquare, X
} from 'lucide-react';
import { tasksService } from '../services/tasks';
import { goalsService } from '../services/goals';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { cn } from '../utils/cn';
import type { Task, PriorityLevel, TaskStatus } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const TODAY_ISO = new Date().toISOString().split('T')[0];
const TOMORROW_ISO = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();
const WEEK_END_ISO = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
})();

function getGroup(scheduledDate?: string): 'today' | 'tomorrow' | 'week' | 'later' {
  if (!scheduledDate) return 'today';
  if (scheduledDate <= TODAY_ISO) return 'today';
  if (scheduledDate === TOMORROW_ISO) return 'tomorrow';
  if (scheduledDate <= WEEK_END_ISO) return 'week';
  return 'later';
}

function formatGroupHeader(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMins(mins?: number): string {
  if (!mins) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// Scheduled times aren't in the data model (only scheduledDate), so we derive
// a display time from task ID for visual consistency with the reference design.
const MOCK_TIMES: Record<string, string> = {
  'task-501': '6:00 PM',
  'task-502': '7:00 PM',
  'task-503': '8:30 PM',
  'task-504': '10:00 AM',
  'task-505': '2:00 PM',
  'task-506': 'Sat, 21 Sep',
  'task-507': 'Sun, 22 Sep',
  'task-508': 'Sun, 22 Sep',
};

function getDisplayTime(task: Task): string {
  return MOCK_TIMES[task.id] || (task.scheduledDate ? formatGroupHeader(task.scheduledDate) : '');
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface PriorityBadgeProps { priority?: PriorityLevel }
const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  if (!priority) return null;
  const map: Record<PriorityLevel, { variant: 'pink' | 'amber' | 'blue'; label: string }> = {
    high: { variant: 'pink', label: 'High' },
    medium: { variant: 'amber', label: 'Medium' },
    low: { variant: 'blue', label: 'Low' },
  };
  const { variant, label } = map[priority];
  return <Badge variant={variant} className="text-[10px] px-2.5 py-0.5">{label}</Badge>;
};

interface TaskRowProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  isPending: boolean;
}
const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onDelete, onEdit, isPending }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const completed = task.status === 'completed';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-200 group relative',
        completed && 'opacity-70'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !completed)}
        disabled={isPending}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 cursor-pointer',
          completed
            ? 'bg-stayon-purple border-stayon-purple'
            : 'border-slate-300 hover:border-stayon-purple'
        )}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title + Goal */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold text-slate-800 truncate', completed && 'line-through text-slate-400')}>
          {task.title}
        </p>
        {task.goalTitle && (
          <span className="flex items-center gap-1 text-[11px] text-stayon-purple font-medium mt-0.5">
            <BookOpen className="w-3 h-3 flex-shrink-0" />
            {task.goalTitle}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatMins(task.estimatedMinutes)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {getDisplayTime(task)}
        </span>
      </div>

      {/* Priority badge */}
      <div className="flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Three-dot menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Task options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-36 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 shadow-lg z-20 py-1"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                onEdit?.(task);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-stayon-purple transition-colors cursor-pointer"
            >
              Edit task
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onDelete?.(task);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Delete task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface TaskGroupProps {
  label: string;
  dateLabel: string;
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  isPending: boolean;
}
const TaskGroup: React.FC<TaskGroupProps> = ({ label, dateLabel, tasks, onToggle, onDelete, onEdit, isPending }) => {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">
          {label}
          {dateLabel && (
            <span className="ml-2 text-slate-400 font-normal">· {dateLabel}</span>
          )}
        </h3>
        <span className="text-xs text-slate-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} isPending={isPending} />
      ))}
    </div>
  );
};

// ─── mini calendar ───────────────────────────────────────────────────────────

interface MiniCalendarProps { selectedDate: Date }
const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const adjustedFirst = (firstDay === 0 ? 6 : firstDay - 1); // shift to Mon-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayDate = new Date();
  const isToday = (d: number) =>
    d === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear();
  const isSelected = (d: number) =>
    d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-700">{monthNames[month]} {year}</span>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:bg-purple-50 hover:text-stayon-purple transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextMonth}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:bg-purple-50 hover:text-stayon-purple transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-400 font-semibold py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {day ? (
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium cursor-default transition-colors',
                  isSelected(day) && 'bg-stayon-purple text-white shadow-sm',
                  isToday(day) && !isSelected(day) && 'bg-stayon-purple/10 text-stayon-purple font-bold',
                  !isToday(day) && !isSelected(day) && 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {day}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── main page ───────────────────────────────────────────────────────────────

type TabKey = 'today' | 'upcoming' | 'all' | 'completed';
type StatusFilter = 'all' | TaskStatus;
type PriorityFilter = 'all' | PriorityLevel;

export const Tasks: React.FC = () => {
  // ── state ──
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<PriorityLevel>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('pending');
  const [editHours, setEditHours] = useState(1);
  const [editMinutes, setEditMinutes] = useState(0);

  const [taskTitle, setTaskTitle] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  // Populate edit fields when taskToEdit is set
  React.useEffect(() => {
    if (taskToEdit) {
      setEditTitle(taskToEdit.title);
      setEditPriority(taskToEdit.priority || 'medium');
      setEditStatus(taskToEdit.status);
      const mins = taskToEdit.estimatedMinutes || 30;
      setEditHours(Math.floor(mins / 60));
      setEditMinutes(mins % 60);
    }
  }, [taskToEdit]);

  const totalMins = useMemo(() => {
    return (Math.max(0, Number(estimatedHours) || 0) * 60) + Math.max(0, Number(estimatedMinutes) || 0);
  }, [estimatedHours, estimatedMinutes]);

  const totalEditMins = useMemo(() => {
    return (Math.max(0, Number(editHours) || 0) * 60) + Math.max(0, Number(editMinutes) || 0);
  }, [editHours, editMinutes]);

  // ── data ──
  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksService.getTasks(),
  });

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsService.getGoals(),
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

  const updateTaskMutation = useMutation({
    mutationFn: () => {
      if (!taskToEdit) return Promise.resolve(null);
      return tasksService.updateTask(taskToEdit.id, {
        title: editTitle,
        status: editStatus,
        priority: editPriority,
        estimatedMinutes: totalEditMins > 0 ? totalEditMins : 30,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setTaskToEdit(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () => {
      const activeGoalId =
        goalFilter !== 'all'
          ? goalFilter
          : (goals && goals.length > 0
              ? goals[0].id
              : (tasks && tasks.length > 0 && tasks[0].goalId
                  ? tasks[0].goalId
                  : 'goal-001'));

      return tasksService.createTask({
        goalId: activeGoalId,
        title: taskTitle.trim(),
        parentId: null,
        estimatedMinutes: totalMins > 0 ? totalMins : 70,
        scheduledDate: TODAY_ISO,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setShowAddModal(false);
      setTaskTitle('');
      setEstimatedHours(1);
      setEstimatedMinutes(10);
    },
  });

  // ── derived counts (for tabs) ──
  const allTasks = tasks ?? [];
  const todayTasks = useMemo(() => allTasks.filter(t => getGroup(t.scheduledDate) === 'today'), [allTasks]);
  const upcomingTasks = useMemo(() => allTasks.filter(t => {
    const g = getGroup(t.scheduledDate);
    return g === 'tomorrow' || g === 'week' || g === 'later';
  }), [allTasks]);
  const completedTasks = useMemo(() => allTasks.filter(t => t.status === 'completed'), [allTasks]);

  const tabCounts: Record<TabKey, number> = {
    today: todayTasks.length,
    upcoming: upcomingTasks.length,
    all: allTasks.length,
    completed: completedTasks.length,
  };

  // ── unique goals for filter dropdown ──
  const uniqueGoals = useMemo(() => {
    const map = new Map<string, string>();
    (goals ?? []).forEach(g => { if (g.id && g.title) map.set(g.id, g.title); });
    allTasks.forEach(t => { if (t.goalId && t.goalTitle) map.set(t.goalId, t.goalTitle); });
    return Array.from(map.entries()); // [id, title][]
  }, [allTasks, goals]);

  // ── base tasks for current tab ──
  const tabTasks = useMemo(() => {
    switch (activeTab) {
      case 'today': return todayTasks;
      case 'upcoming': return upcomingTasks;
      case 'completed': return completedTasks;
      default: return allTasks;
    }
  }, [activeTab, todayTasks, upcomingTasks, completedTasks, allTasks]);

  // ── apply side-panel filters ──
  const filteredTasks = useMemo(() => {
    return tabTasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (goalFilter !== 'all' && t.goalId !== goalFilter) return false;
      return true;
    });
  }, [tabTasks, statusFilter, priorityFilter, goalFilter]);

  // ── grouped tasks (for today/all/upcoming views) ──
  const groupedTasks = useMemo(() => {
    const today: Task[] = [], tomorrow: Task[] = [], week: Task[] = [], later: Task[] = [];
    filteredTasks.forEach(t => {
      const g = getGroup(t.scheduledDate);
      if (g === 'today') today.push(t);
      else if (g === 'tomorrow') tomorrow.push(t);
      else if (g === 'week') week.push(t);
      else later.push(t);
    });
    return { today, tomorrow, week, later };
  }, [filteredTasks]);

  const handleToggle = (id: string, completed: boolean) => {
    toggleTaskMutation.mutate({ id, completed });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setGoalFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || goalFilter !== 'all';

  // ── tab config ──
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="select-none">
      {/* ── Page heading + Tabs + Add Task ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tasks</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Turn your plans into progress.</p>
          </div>
          <Button
            variant="stayon-gradient"
            size="md"
            onClick={() => setShowAddModal(true)}
            className="gap-2 shadow-lg flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer',
                activeTab === tab.key
                  ? 'stayon-pill-active text-white shadow-md'
                  : 'bg-white/70 text-slate-600 hover:bg-white border border-white/80 hover:border-stayon-purple/20'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-1.5 text-xs',
                activeTab === tab.key ? 'text-white/80' : 'text-slate-400'
              )}>
                ({tabCounts[tab.key]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: Task list ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {isLoading ? (
            <LoadingState message="Fetching your study tasks..." />
          ) : isError ? (
            <ErrorState onRetry={refetch} message="Could not fetch tasks." />
          ) : filteredTasks.length === 0 ? (
            <div className="stayon-card p-10 text-center">
              <CheckSquare className="w-10 h-10 text-stayon-purple/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No tasks match your filters.</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs text-stayon-purple hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Today group */}
              {(activeTab === 'today' || activeTab === 'all') && groupedTasks.today.length > 0 && (
                <TaskGroup
                  label="Today"
                  dateLabel={formatGroupHeader(TODAY_ISO)}
                  tasks={groupedTasks.today}
                  onToggle={handleToggle}
                  onDelete={setTaskToDelete}
                  onEdit={setTaskToEdit}
                  isPending={toggleTaskMutation.isPending}
                />
              )}

              {/* Tomorrow group */}
              {(activeTab === 'upcoming' || activeTab === 'all') && groupedTasks.tomorrow.length > 0 && (
                <TaskGroup
                  label="Tomorrow"
                  dateLabel={formatGroupHeader(TOMORROW_ISO)}
                  tasks={groupedTasks.tomorrow}
                  onToggle={handleToggle}
                  onDelete={setTaskToDelete}
                  onEdit={setTaskToEdit}
                  isPending={toggleTaskMutation.isPending}
                />
              )}

              {/* Later this week group */}
              {(activeTab === 'upcoming' || activeTab === 'all') && groupedTasks.week.length > 0 && (
                <TaskGroup
                  label="Later This Week"
                  dateLabel=""
                  tasks={groupedTasks.week}
                  onToggle={handleToggle}
                  onDelete={setTaskToDelete}
                  onEdit={setTaskToEdit}
                  isPending={toggleTaskMutation.isPending}
                />
              )}

              {/* Later / Future group */}
              {(activeTab === 'upcoming' || activeTab === 'all') && groupedTasks.later.length > 0 && (
                <TaskGroup
                  label="Later"
                  dateLabel=""
                  tasks={groupedTasks.later}
                  onToggle={handleToggle}
                  onDelete={setTaskToDelete}
                  onEdit={setTaskToEdit}
                  isPending={toggleTaskMutation.isPending}
                />
              )}

              {/* Completed tab — flat list */}
              {activeTab === 'completed' && (
                <div className="space-y-2">
                  {filteredTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={setTaskToDelete}
                      onEdit={setTaskToEdit}
                      isPending={toggleTaskMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Calendar + Filters + Motivational card ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">

          {/* Calendar */}
          <div className="stayon-card p-4">
            <MiniCalendar selectedDate={new Date()} />
          </div>

          {/* Filters */}
          <div className="stayon-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-stayon-purple font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'in_progress', 'completed'] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all',
                      statusFilter === s
                        ? 'bg-stayon-purple text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Priority</p>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all',
                      priorityFilter === p
                        ? p === 'all'
                          ? 'bg-stayon-purple text-white'
                          : p === 'high'
                            ? 'bg-pink-500 text-white'
                            : p === 'medium'
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Goal</p>
              <select
                value={goalFilter}
                onChange={e => setGoalFilter(e.target.value)}
                className="w-full text-xs text-slate-700 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stayon-purple/30 cursor-pointer"
              >
                <option value="all">All Goals</option>
                {uniqueGoals.map(([id, title]) => (
                  <option key={id} value={id}>{title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivational card */}
          <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-purple-100 via-violet-50 to-pink-100 border border-purple-100 p-4 shadow-sm">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-300/20 rounded-full -translate-y-6 translate-x-6" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-pink-300/20 rounded-full translate-y-4 -translate-x-4" />

            {/* Content */}
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-600 italic leading-snug mb-3">
                "Discipline today,<br />freedom tomorrow."
              </p>
              {/* Astronaut SVG illustration */}
              <div className="flex justify-end">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Body */}
                  <ellipse cx="32" cy="38" rx="14" ry="16" fill="#E8E5FF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  {/* Helmet */}
                  <circle cx="32" cy="20" r="12" fill="#F3F0FF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  {/* Visor */}
                  <ellipse cx="32" cy="20" rx="7" ry="6" fill="#A29BFE" opacity="0.5"/>
                  <ellipse cx="32" cy="20" rx="7" ry="6" fill="none" stroke="#7C6EFA" strokeWidth="1"/>
                  {/* Left arm */}
                  <path d="M18 34 Q12 36 14 42" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <circle cx="14" cy="43" r="3" fill="#E8E5FF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  {/* Right arm */}
                  <path d="M46 34 Q52 36 50 42" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <circle cx="50" cy="43" r="3" fill="#E8E5FF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  {/* Left leg */}
                  <path d="M26 52 L24 60" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round"/>
                  <ellipse cx="23" cy="61" rx="4" ry="2" fill="#C4B5FD"/>
                  {/* Right leg */}
                  <path d="M38 52 L40 60" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round"/>
                  <ellipse cx="41" cy="61" rx="4" ry="2" fill="#C4B5FD"/>
                  {/* Star accent */}
                  <path d="M54 12 L55 15 L58 15 L56 17 L57 20 L54 18 L51 20 L52 17 L50 15 L53 15 Z" fill="#FD79A8" opacity="0.8"/>
                  {/* Backpack */}
                  <rect x="38" y="32" width="6" height="8" rx="2" fill="#C4B5FD" stroke="#A29BFE" strokeWidth="1"/>
                </svg>
              </div>
              {/* Plant detail */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-lg" role="img" aria-label="plant">🌱</span>
                <span className="text-[10px] text-slate-500 font-medium">Keep growing, one task at a time</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Add Task Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="stayon-card max-w-md w-full p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-stayon-purple" /> Add Task
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  placeholder="e.g. Read S3 Whitepaper"
                  className="stayon-input w-full py-2.5 px-3 text-sm"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && taskTitle.trim()) createTaskMutation.mutate();
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stayon-purple" />
                    Estimated Duration
                  </label>
                  <span className="text-xs font-bold text-stayon-purple bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {formatMins(totalMins)} ({totalMins} mins total)
                  </span>
                </div>

                {/* Hours and Minutes Side-by-Side */}
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

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Presets:</span>
                  {[
                    { label: '15m', h: 0, m: 15 },
                    { label: '30m', h: 0, m: 30 },
                    { label: '45m', h: 0, m: 45 },
                    { label: '1h', h: 1, m: 0 },
                    { label: '1h 10m', h: 1, m: 10 },
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
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => createTaskMutation.mutate()}
                  disabled={!taskTitle.trim() || createTaskMutation.isPending}
                  isLoading={createTaskMutation.isPending}
                >
                  Save Task
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
              "{taskToDelete.title}" will be permanently removed from your task list.
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

      {/* ── Edit Task Modal ── */}
      {taskToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="stayon-card max-w-md w-full p-6 bg-white shadow-2xl rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Edit Task
              </h3>
              <button
                onClick={() => setTaskToEdit(null)}
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
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="stayon-input w-full py-2.5 px-3 text-sm"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editTitle.trim()) updateTaskMutation.mutate();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as TaskStatus)}
                    className="stayon-input w-full py-2.5 px-3 text-xs font-medium cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as PriorityLevel)}
                    className="stayon-input w-full py-2.5 px-3 text-xs font-medium cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
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
                    {formatMins(totalEditMins)} ({totalEditMins} mins)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hours</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editHours}
                        onChange={e => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="stayon-input w-full py-2.5 pl-3 pr-10 text-sm font-medium"
                        min={0}
                        max={24}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        hr{editHours !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Minutes</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editMinutes}
                        onChange={e => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="stayon-input w-full py-2.5 pl-3 pr-10 text-sm font-medium"
                        min={0}
                        max={59}
                        step={5}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        min{editMinutes !== 1 ? 's' : ''}
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
                    const isActive = editHours === preset.h && editMinutes === preset.m;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setEditHours(preset.h);
                          setEditMinutes(preset.m);
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
                <Button variant="ghost" onClick={() => setTaskToEdit(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => updateTaskMutation.mutate()}
                  disabled={!editTitle.trim() || updateTaskMutation.isPending}
                  isLoading={updateTaskMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
