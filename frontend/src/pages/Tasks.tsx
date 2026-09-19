import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Filter, Clock, Flame, CheckCircle2 } from 'lucide-react';
import { tasksService } from '../services/tasks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';

export const Tasks: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [estimatedMins, setEstimatedMins] = useState(45);

  const queryClient = useQueryClient();

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

  const createTaskMutation = useMutation({
    mutationFn: () =>
      tasksService.createTask({
        title: taskTitle,
        estimatedMinutes: estimatedMins,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      setShowAddModal(false);
      setTaskTitle('');
    },
  });

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Study Tasks</span>
            <CheckSquare className="w-5 h-5 text-stayon-purple" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage granular learning tasks and daily focus items.
          </p>
        </div>

        <Button variant="stayon-gradient" onClick={() => setShowAddModal(true)} className="gap-2 shadow-lg">
          <Plus className="w-4 h-4" />
          <span>Add New Task</span>
        </Button>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="stayon-card max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-stayon-purple" /> Add Study Task
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Read S3 Whitepaper"
                  className="stayon-input w-full py-2.5 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Minutes</label>
                <input
                  type="number"
                  value={estimatedMins}
                  onChange={(e) => setEstimatedMins(Number(e.target.value))}
                  className="stayon-input w-full py-2.5 px-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => createTaskMutation.mutate()}
                  disabled={!taskTitle.trim() || createTaskMutation.isPending}
                >
                  Save Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <LoadingState message="Fetching your study tasks..." />
      ) : isError ? (
        <ErrorState onRetry={refetch} message="Could not fetch tasks." />
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 flex items-center justify-between hover:border-stayon-purple/40">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={(e) => toggleTaskMutation.mutate({ id: task.id, completed: e.target.checked })}
                  className="w-5 h-5 rounded-full text-stayon-purple focus:ring-stayon-purple border-slate-300 cursor-pointer"
                />
                <div>
                  <h4 className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </h4>
                  {task.goalTitle && (
                    <span className="text-[11px] text-stayon-purple font-semibold block">{task.goalTitle}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {task.estimatedMinutes || 45}m
                </span>
                {task.priority && (
                  <Badge variant={task.priority === 'high' ? 'pink' : 'blue'} className="capitalize text-[10px]">
                    {task.priority}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-xs text-slate-500">No tasks created yet.</p>
        </Card>
      )}
    </div>
  );
};
