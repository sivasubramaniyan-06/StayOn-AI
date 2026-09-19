import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Calendar, ArrowLeft, Sparkles, FileText, CheckCircle2, ChevronRight, Bell } from 'lucide-react';
import { goalsService } from '../services/goals';
import { documentsService } from '../services/documents';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { authService } from '../services/auth';

// Validation Schema following Zod
const goalSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500, 'Maximum 500 characters'),
  deadline: z.string().min(1, 'Please select a deadline date'),
  documentId: z.string().min(1, 'Please select a reference document'),
});

type GoalFormData = z.infer<typeof goalSchema>;

export const CreateGoal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('documentId') || 'doc-101';
  const currentUser = authService.getUser();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch available ready documents
  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.getDocuments(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: 'AWS Certification',
      description: 'Complete my AWS certification preparation and practice to get certified.',
      deadline: '2026-11-30',
      documentId: initialDocId,
    },
  });

  const selectedDocumentId = watch('documentId');
  const descriptionText = watch('description') || '';
  const goalTitleText = watch('title') || 'AWS Certification';
  const selectedDoc = documents?.find((d) => d.id === selectedDocumentId) || documents?.[0];

  const createGoalMutation = useMutation({
    mutationFn: (data: GoalFormData) => goalsService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      navigate('/goals');
    },
  });

  const onSubmit = (data: GoalFormData) => {
    createGoalMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Top Header & Back Button matching Screenshot Page 3 */}
      <button
        onClick={() => navigate('/goals')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-stayon-purple transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-stayon-purple text-white flex items-center justify-center shadow-lg shadow-stayon-purple/30">
          <Target className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create a Goal</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Turn what you've learned into something you can achieve.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Desktop Form + Middle Info Cards + Right Side-by-Side Mobile Frame (matching Page 3 PDF) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Desktop Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 sm:p-8 bg-white/90">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Goal title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Goal title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('title')}
                    placeholder="e.g. AWS Certification"
                    className="stayon-input w-full py-3 px-4 text-sm text-slate-800 focus:bg-white font-semibold pr-10"
                  />
                  <Sparkles className="w-4 h-4 text-stayon-purple absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.title && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.title.message}</p>}
              </div>

              {/* What do you want to achieve? */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  What do you want to achieve? <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description')}
                  maxLength={500}
                  rows={4}
                  placeholder="Complete my AWS certification preparation and practice to get certified."
                  className="stayon-input w-full py-3 px-4 text-sm text-slate-800 focus:bg-white resize-y"
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description ? (
                    <p className="text-xs text-red-500 font-semibold">{errors.description.message}</p>
                  ) : <div />}
                  <span className="text-xs text-slate-400 font-medium ml-auto">
                    {descriptionText.length}/500
                  </span>
                </div>
              </div>

              {/* Deadline date picker */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Deadline <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    {...register('deadline')}
                    className="stayon-input w-full py-3 pl-10 pr-4 text-sm text-slate-800 focus:bg-white"
                  />
                </div>
                {errors.deadline && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.deadline.message}</p>}
              </div>

              {/* Based on (Document) selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Based on (Document) <span className="text-red-500">*</span>
                </label>
                
                {selectedDoc ? (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        PDF
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{selectedDoc.fileName}</h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Uploaded on {new Date(selectedDoc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <select
                      value={selectedDocumentId}
                      onChange={(e) => setValue('documentId', e.target.value)}
                      className="text-xs font-bold text-stayon-purple bg-white px-3 py-1.5 rounded-xl border border-purple-200 cursor-pointer"
                    >
                      {documents?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fileName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    {...register('documentId')}
                    placeholder="doc-101"
                    className="stayon-input w-full py-3 px-4 text-sm text-slate-800"
                  />
                )}
                {errors.documentId && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.documentId.message}</p>}
              </div>

              {/* Submit button matching Page 3 */}
              <button
                type="submit"
                disabled={createGoalMutation.isPending}
                className="w-full py-4 px-6 bg-gradient-to-r from-stayon-purple via-purple-600 to-indigo-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-stayon-purple/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-4"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>{createGoalMutation.isPending ? 'Creating Goal...' : 'Create Goal →'}</span>
              </button>

            </form>
          </Card>
        </div>

        {/* Middle Info Column (5 cols) matching Screenshot Page 3 */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* How it works card */}
          <Card className="p-6 bg-white/90">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                💡
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">How it works</h3>
            </div>

            <ol className="space-y-3.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stayon-purple text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Give your goal a title</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stayon-purple text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Add a short description</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stayon-purple text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Set a deadline</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stayon-purple text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <span>We'll use your document to help plan it</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-stayon-purple text-white flex items-center justify-center text-xs font-bold shrink-0">5</span>
                <span>Click create and you're ready!</span>
              </li>
            </ol>
          </Card>

          {/* Robot reading book card with quote matching Screenshot Page 3 */}
          <Card className="p-6 text-center bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-100 relative overflow-hidden">
            <div className="text-5xl mb-3 animate-float">🤖</div>
            <p className="text-xs text-slate-700 font-bold italic mb-1 leading-relaxed">
              "A goal turns your study material into real progress."
            </p>
            <span className="text-[11px] text-stayon-purple font-semibold">— StayOn AI</span>
          </Card>

          {/* Handwriting Notes matching Screenshot Page 3 */}
          <div className="text-center space-y-1">
            <p className="handwriting-note text-xs text-purple-600">Turn Knowledge into Achievement ♡</p>
            <p className="handwriting-note text-[11px] text-slate-400">Same Knowledge Bigger Progress ♡</p>
          </div>

        </div>

      </div>
    </div>
  );
};
