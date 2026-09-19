import React from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Schedule: React.FC = () => {
  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Study Schedule</span>
            <Calendar className="w-5 h-5 text-stayon-purple" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Dynamic calendar & AI-rescheduled agenda planner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-8 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stayon-purple" /> Today's Agenda
          </h3>
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stayon-purple">09:00 AM - 10:00 AM</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Complete AWS research notes</h4>
              </div>
              <Badge variant="purple">Active</Badge>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">02:00 PM - 03:00 PM</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Read System Design chapter</h4>
              </div>
              <Badge variant="outline">Scheduled</Badge>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-4 p-6 bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-stayon-purple" />
            <h3 className="font-extrabold text-slate-900 text-sm">Adaptive Rescheduling</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            StayOn AI automatically balances overdue study tasks into open slots based on your progress velocity.
          </p>
          <div className="text-center p-3 rounded-2xl bg-white border border-purple-100 shadow-sm text-xs font-semibold text-stayon-purple">
            Ready for Bedrock Agent Replan
          </div>
        </Card>
      </div>
    </div>
  );
};
