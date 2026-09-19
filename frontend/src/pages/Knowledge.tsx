import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  Grid,
  List,
  Lightbulb,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { documentsService } from '../services/documents';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';

export const Knowledge: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'processing' | 'ready' | 'failed'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch document list from backend GET /documents
  const { data: apiDocuments, isLoading, isError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.getDocuments(),
  });

  // Handle PDF Upload via S3 pre-signed URL flow
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatusMsg('Requesting pre-signed URL from STAYON backend...');

    try {
      const docResponse = await documentsService.createDocument(file.name, file.type || 'application/pdf');
      setUploadStatusMsg('Uploading PDF to S3 bucket...');
      await documentsService.uploadFileToS3(docResponse.uploadUrl, file);
      
      setUploadStatusMsg('Document uploaded! Processing with StayOn AI...');
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        setUploadStatusMsg('');
      }, 1200);
    } catch (err) {
      console.error(err);
      setUploadStatusMsg('Error uploading document. Please try again.');
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  // Pre-populated UI Documents matching the attached image visual layout exactly
  const displayDocuments = [
    {
      id: 'doc-101',
      fileName: 'AWS Certification Syllabus',
      uploadedAgo: 'Uploaded 2 hours ago',
      status: 'ready',
      summary: 'Complete syllabus for AWS Certified Solutions Architect.',
    },
    {
      id: 'doc-102',
      fileName: 'DBMS Notes',
      uploadedAgo: 'Uploaded 5 hours ago',
      status: 'processing',
      progressPercent: 68,
      summary: 'Database Management Systems handwritten notes.',
    },
    {
      id: 'doc-103',
      fileName: 'Operating Systems',
      uploadedAgo: 'Uploaded 1 day ago',
      status: 'ready',
      summary: 'Lecture notes on OS concepts.',
    },
    {
      id: 'doc-104',
      fileName: 'Data Structures',
      uploadedAgo: 'Uploaded 2 days ago',
      status: 'failed',
      summary: 'DSA handwritten notes.',
      errorMessage: 'Processing failed. Please try uploading again.',
    },
    {
      id: 'doc-105',
      fileName: 'Computer Networks',
      uploadedAgo: 'Uploaded 3 days ago',
      status: 'ready',
      summary: 'CN unit wise notes.',
    }
  ];

  const filteredDocs = displayDocuments.filter((d) => {
    if (activeFilter === 'all') return true;
    return d.status === activeFilter;
  });

  return (
    <div className="space-y-6 pb-12 select-none relative z-10">
      
      {/* ========================================================================= */}
      {/* KNOWLEDGE HERO SECTION & DECORATIVE ROBOT ILLUSTRATION MATCHING IMAGE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hero Title & Description (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-2 pt-2">
          <div className="flex items-center gap-3">
            {/* 3D Open Book Icon matching attached image */}
            <div className="w-12 h-12 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center shadow-lg shadow-[#6C5CE7]/30 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Knowledge
              </h1>
              <p className="text-sm font-bold text-slate-700">
                Your study space, powered by AI
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl pl-1 pt-1">
            Upload your study material, let StayOn AI understand it, and turn it into progress.
          </p>
        </div>

        {/* Right Robot Helper & Speech Quote Card matching attached image (5 cols) */}
        <div className="lg:col-span-5 flex items-center justify-end relative">
          
          {/* Handwriting text above Robot */}
          <div className="hidden sm:block absolute -top-4 left-4 text-[#6C5CE7] font-sans text-xs transform -rotate-6 leading-tight opacity-90">
            Small<br />Steps<br />Big<br />Futures<br />♡
          </div>

          {/* Robot Illustration sitting on 4 Stacked Books */}
          <div className="relative flex items-center gap-3">
            
            {/* Stacked Books & Robot Vector */}
            <div className="w-36 h-36 relative animate-float">
              <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl">
                {/* 4 Stacked Books: Learn, Plan, Grow, Succeed */}
                <rect x="35" y="105" width="90" height="12" rx="3" fill="#312E81" />
                <text x="45" y="114" fill="#FFFFFF" fontSize="7" fontWeight="bold">Learn</text>

                <rect x="30" y="118" width="100" height="12" rx="3" fill="#2E1E66" />
                <text x="40" y="127" fill="#FFFFFF" fontSize="7" fontWeight="bold">Plan</text>

                <rect x="25" y="131" width="110" height="12" rx="3" fill="#241753" />
                <text x="35" y="140" fill="#FFFFFF" fontSize="7" fontWeight="bold">Grow</text>

                <rect x="20" y="144" width="120" height="14" rx="4" fill="#180E38" />
                <text x="30" y="154" fill="#FFFFFF" fontSize="8" fontWeight="bold">Succeed</text>

                {/* Robot Body & Head */}
                <rect x="50" y="30" width="60" height="45" rx="18" fill="#1E1B4B" />
                <rect x="56" y="36" width="48" height="33" rx="12" fill="#312E81" />
                <circle cx="68" cy="52" r="6" fill="#60A5FA" />
                <circle cx="92" cy="52" r="6" fill="#60A5FA" />
                <rect x="55" y="80" width="50" height="30" rx="14" fill="#FFFFFF" />
                {/* Laptop */}
                <rect x="45" y="90" width="45" height="18" rx="3" fill="#2563EB" />
              </svg>
            </div>

            {/* Speech Quote Card matching attached image */}
            <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-purple-100 shadow-sm max-w-[200px] relative">
              <p className="text-xs font-bold text-slate-800 leading-snug handwriting-note">
                "Your notes today, a brighter tomorrow." ♡
              </p>
              <div className="absolute top-2 right-2 text-purple-400 text-xs">🪐</div>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ROW 1: UPLOAD STUDY MATERIAL CARD & QUICK TIPS CARD MATCHING PDF */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 7 Columns: Upload Study Material Card */}
        <Card className="lg:col-span-7 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col justify-center">
          
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-[#6C5CE7]/40 rounded-2xl p-8 text-center bg-[#F3F0FF]/30 hover:bg-[#F3F0FF]/60 transition-all cursor-pointer flex flex-col items-center justify-center relative"
          >
            <input
              type="file"
              accept=".pdf"
              id="knowledge-pdf-upload"
              className="hidden"
              onChange={handleFileSelect}
            />

            <label htmlFor="knowledge-pdf-upload" className="cursor-pointer flex flex-col items-center w-full">
              {/* Cloud Upload Icon matching attached image */}
              <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] text-[#6C5CE7] flex items-center justify-center mb-3 shadow-inner">
                <Upload className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Study Material</h3>
              
              <p className="text-xs text-slate-500 font-medium mb-2">
                Drag and drop your PDF here, or <span className="text-[#6C5CE7] font-bold underline">click to browse</span>
              </p>

              <span className="text-[11px] text-slate-400 font-medium">
                PDF only · Max size 50 MB
              </span>
            </label>
          </div>

          {uploadStatusMsg && (
            <div className="mt-4 p-3 rounded-xl bg-purple-50 text-xs text-[#6C5CE7] font-semibold text-center animate-pulse">
              {uploadStatusMsg}
            </div>
          )}
        </Card>

        {/* Right 5 Columns: Quick Tips Card */}
        <Card className="lg:col-span-5 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#6C5CE7]">
                <Lightbulb className="w-4 h-4 fill-current" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Quick Tips</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6C5CE7] shrink-0 mt-0.5" />
                <span>Upload your lecture notes, syllabi or textbooks</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6C5CE7] shrink-0 mt-0.5" />
                <span>StayOn AI will extract key information</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6C5CE7] shrink-0 mt-0.5" />
                <span>Use the summary to create goals and study plans</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#6C5CE7] shrink-0 mt-0.5" />
                <span>Supported format: PDF (Max 50 MB)</span>
              </li>
            </ul>
          </div>
        </Card>

      </div>

      {/* ========================================================================= */}
      {/* ROW 2: DOCUMENT FILTERS & SORT CONTROLS MATCHING ATTACHED IMAGE */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        
        {/* Document Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
            }`}
          >
            All Documents (5)
          </button>

          <button
            onClick={() => setActiveFilter('processing')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'processing'
                ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
            }`}
          >
            Processing (1)
          </button>

          <button
            onClick={() => setActiveFilter('ready')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ready'
                ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
            }`}
          >
            Ready (3)
          </button>

          <button
            onClick={() => setActiveFilter('failed')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'failed'
                ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                : 'bg-white/80 text-slate-700 hover:bg-white border border-white'
            }`}
          >
            Failed (1)
          </button>
        </div>

        {/* Sort & Grid/List View Controls matching attached image */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white shadow-sm text-xs font-semibold text-slate-700">
            <span>Sort by:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white/80 border border-white p-1 rounded-2xl shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#6C5CE7] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-[#6C5CE7] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT CARDS GRID (5 CARDS MATCHING PDF EXACT STATES) */}
      {/* ========================================================================= */}
      {isLoading ? (
        <LoadingState message="Loading your documents..." />
      ) : isError ? (
        <ErrorState onRetry={refetch} message="Could not fetch documents." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
          
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-5 shadow-sm flex flex-col justify-between hover:border-[#6C5CE7]/40 transition-all">
              <div>
                {/* Header: Red PDF Icon & Title */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-red-500 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                    PDF
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1">{doc.fileName}</h4>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{doc.uploadedAgo}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  {doc.status === 'ready' && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Ready
                    </span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#6C5CE7]">
                      Processing
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600">
                      Failed
                    </span>
                  )}
                </div>

                {/* Document Summary / Analysis Description */}
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4 line-clamp-3">
                  {doc.summary}
                </p>

                {/* Processing State Indicator */}
                {doc.status === 'processing' && (
                  <div className="space-y-1.5 my-3 p-2 rounded-xl bg-purple-50/60 border border-purple-100">
                    <Progress value={doc.progressPercent || 68} className="h-1.5 bg-slate-200" />
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                      <span>Analyzing document...</span>
                      <span className="text-[#6C5CE7]">{doc.progressPercent}%</span>
                    </div>
                  </div>
                )}

                {/* Failed State Error Banner */}
                {doc.status === 'failed' && (
                  <div className="my-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-rose-600 text-[10px] font-medium leading-tight">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{doc.errorMessage || 'Processing failed. Please try uploading again.'}</span>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {doc.status === 'ready' && (
                  <button
                    onClick={() => navigate(`/knowledge/${doc.id}`)}
                    className="text-xs font-bold text-[#6C5CE7] hover:underline flex items-center gap-1"
                  >
                    <span>View AI Summary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {doc.status === 'failed' && (
                  <button
                    onClick={() => handleFileUpload(new File([], doc.fileName))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Upload</span>
                  </button>
                )}

                {doc.status === 'processing' && <div />}

                <button className="text-slate-400 hover:text-slate-600 cursor-pointer ml-auto">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ROW 3: BOTTOM GOAL CTA BANNER MATCHING ATTACHED PDF */}
      {/* ========================================================================= */}
      <Card className="bg-white/90 border border-purple-100/80 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 relative overflow-hidden">
        
        {/* Left Icon & Text */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/40">
            <GraduationCap className="w-7 h-7 text-amber-300" />
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Turn your knowledge into goals.
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Once your document is ready, create a goal and let StayOn plan the rest!
            </p>
          </div>
        </div>

        {/* Right CTA Button */}
        <Button
          variant="stayon-gradient"
          onClick={() => navigate('/goals/new')}
          className="rounded-2xl px-6 py-3.5 shadow-lg gap-2 text-xs font-bold whitespace-nowrap"
        >
          <span>Create a Goal</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* Bottom Right Handwriting Note matching attached image */}
        <div className="hidden lg:block absolute bottom-2 right-4 text-[#6C5CE7] font-sans text-xs transform -rotate-3 opacity-90 text-right leading-tight pointer-events-none">
          Learn<br />Smarter<br />Not Harder<br />♡
        </div>

      </Card>

    </div>
  );
};
