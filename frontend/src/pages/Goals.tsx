import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { goalsService } from '../services/goals';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';

export const Goals: React.FC = () => {
  const navigate = useNavigate();

  const { data: goals, isLoading, isError, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsService.getGoals(),
  });

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>My Learning Goals</span>
            <Target className="w-5 h-5 text-stayon-purple" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Track academic milestones and course completion metrics.
          </p>
        </div>

        <Button variant="stayon-gradient" onClick={() => navigate('/goals/new')} className="gap-2 shadow-lg">
          <Plus className="w-4 h-4" />
          <span>Create New Goal</span>
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Fetching your learning goals..." />
      ) : isError ? (
        <ErrorState onRetry={refetch} message="Could not fetch goals from API Gateway." />
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <Card key={goal.id} className="flex flex-col justify-between hover:border-stayon-purple/40 p-6">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-stayon-lavender flex items-center justify-center text-stayon-purple shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <Badge variant={goal.status === 'completed' ? 'emerald' : 'purple'} className="capitalize">
                    {goal.status}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{goal.title}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{goal.description || 'Academic goal target'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Overall Progress</span>
                    <span className="text-stayon-purple font-extrabold">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2.5" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stayon-purple" />
                  <span>{goal.completedTasks || 0} / {goal.totalTasks || 0} tasks completed</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{goal.deadline}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 text-stayon-purple mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Goals</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Create your first learning goal to start breaking down syllabus materials into manageable daily tasks.
          </p>
          <Button variant="primary" onClick={() => navigate('/goals/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First Goal
          </Button>
        </Card>
      )}
    </div>
  );
};
