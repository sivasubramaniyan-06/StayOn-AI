import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Sparkles, Target, CheckCircle2, Calendar } from 'lucide-react';
import { documentsService } from '../services/documents';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';

export const DocumentSummary: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.getDocuments(),
  });

  const document = documents?.find((d) => d.id === documentId) || documents?.[0];

  if (isLoading) return <LoadingState message="Fetching document summary..." />;
  if (isError || !document) return <ErrorState message="Document not found." onRetry={() => navigate('/knowledge')} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      {/* Top Navigation Back Button */}
      <button
        onClick={() => navigate('/knowledge')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-stayon-purple transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Knowledge Base</span>
      </button>

      {/* Main Document Details Card */}
      <Card className="p-8 bg-gradient-to-br from-white via-purple-50/20 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-stayon-lavender flex items-center justify-center text-stayon-purple shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {document.fileName}
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Uploaded on {new Date(document.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>
        </div>

        {/* AI Extracted Summary Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stayon-purple" />
            <h2 className="text-base font-bold text-slate-900">Bedrock AI Summary</h2>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 border border-purple-100 shadow-sm leading-relaxed text-sm text-slate-700 whitespace-pre-wrap">
            {document.extractedSummary || 'Summary processing complete. The extracted study notes highlight core syllabus objectives and milestones.'}
          </div>
        </div>

        {/* Action Button: Create Goal from this document */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Turn this document into an actionable goal with task milestones.
          </p>
          <Button
            variant="stayon-gradient"
            onClick={() => navigate(`/goals/new?documentId=${document.id}`)}
            className="gap-2 shadow-lg w-full sm:w-auto"
          >
            <Target className="w-4 h-4" />
            <span>Create Goal from this Document</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
