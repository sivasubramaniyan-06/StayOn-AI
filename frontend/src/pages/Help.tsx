import React, { useState } from 'react';
import { HelpCircle, Rocket, BookOpen, MessageSquare, Lightbulb, ArrowRight, ChevronRight, Mail, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Help: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I upload study material?',
      answer: 'Navigate to the Knowledge page and click "Upload Study Material". Choose your syllabus or lecture PDF. The file will be securely uploaded to S3 for automated Bedrock AI processing.',
    },
    {
      question: 'How does StayOn AI extract information from my documents?',
      answer: 'StayOn AI utilizes Amazon Bedrock foundation models to analyze your uploaded PDF syllabus and generate a concise summary and milestone topics.',
    },
    {
      question: 'How do I create a goal from a document?',
      answer: 'Once a document reaches "Ready" status, click "View AI Summary" and press "Create Goal from this Document". This connects your document ID directly to your new learning goal.',
    },
    {
      question: 'How are tasks and schedules generated?',
      answer: 'Tasks are derived from your goals and syllabus milestones. StayOn AI helps break down large goals into daily manageable study blocks.',
    },
    {
      question: 'What file formats are supported?',
      answer: 'StayOn AI currently supports PDF documents (.pdf) up to 25MB.',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {/* Header matching Screenshot Page 5 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-stayon-purple text-white flex items-center justify-center shadow-lg shadow-stayon-purple/30">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Help & Support</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Find answers, learn how to use StayOn, or get in touch with our team.
            </p>
          </div>
        </div>

        {/* Decorative Quote */}
        <div className="hidden lg:block handwriting-note text-xs text-purple-600 opacity-90 text-right">
          Your Questions Today<br />A Brighter Tomorrow ♡
        </div>
      </div>

      {/* Category Cards 4 Grid matching Screenshot Page 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 text-center bg-white/90 hover:border-stayon-purple/40 flex flex-col items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-stayon-purple flex items-center justify-center mb-3">
            <Rocket className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Getting Started</h4>
          <p className="text-xs text-slate-400 mb-4">Learn the basics and set up your account.</p>
          <button className="text-stayon-purple text-xs font-bold flex items-center gap-1 hover:underline mt-auto">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>

        <Card className="p-5 text-center bg-white/90 hover:border-stayon-purple/40 flex flex-col items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">User Guide</h4>
          <p className="text-xs text-slate-400 mb-4">Step-by-step guides for every feature.</p>
          <button className="text-stayon-purple text-xs font-bold flex items-center gap-1 hover:underline mt-auto">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>

        <Card className="p-5 text-center bg-white/90 hover:border-stayon-purple/40 flex flex-col items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">FAQs</h4>
          <p className="text-xs text-slate-400 mb-4">Common questions and quick answers.</p>
          <button className="text-stayon-purple text-xs font-bold flex items-center gap-1 hover:underline mt-auto">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>

        <Card className="p-5 text-center bg-white/90 hover:border-stayon-purple/40 flex flex-col items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Tips & Best Practices</h4>
          <p className="text-xs text-slate-400 mb-4">Make the most out of StayOn.</p>
          <button className="text-stayon-purple text-xs font-bold flex items-center gap-1 hover:underline mt-auto">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      </div>

      {/* Main Grid: Left Popular Questions + Right Support Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Popular Questions & Quick Links (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Popular Questions List */}
          <Card className="p-6 bg-white/90">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-stayon-purple" />
                <span>Popular Questions</span>
              </h3>
              <button className="text-xs font-bold text-stayon-purple hover:underline">
                View All FAQs →
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-stayon-lavender/30 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-stayon-purple shrink-0" />
                      {faq.question}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="p-3 pl-8 text-xs text-slate-600 leading-relaxed bg-slate-50/80 rounded-xl mt-1">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Links Grid matching Screenshot Page 5 */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Quick Links</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-stayon-purple/40 transition-all flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-stayon-purple flex items-center justify-center">
                    👤
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Account Setup</h5>
                    <span className="text-[10px] text-slate-400">Set up your profile</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-stayon-purple/40 transition-all flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    📄
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Manage Documents</h5>
                    <span className="text-[10px] text-slate-400">Upload and view files</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-stayon-purple/40 transition-all flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    🎯
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Goal Planning</h5>
                    <span className="text-[10px] text-slate-400">Create and manage goals</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-stayon-purple/40 transition-all flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    📅
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Task Scheduling</h5>
                    <span className="text-[10px] text-slate-400">Organize your study plan</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

        </div>

        {/* Right Support Sidebar (4 cols) matching Screenshot Page 5 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Robot Support Card */}
          <Card className="p-6 text-center bg-gradient-to-br from-purple-100/60 via-purple-50/40 to-pink-50/60 border-purple-200">
            <div className="text-5xl mb-3 animate-float">🤖</div>
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">We're here to help you Stay On Track! ♡</h3>
            <p className="text-[11px] text-slate-600 italic mb-4 leading-relaxed">
              "A small question today can lead to a bigger tomorrow." — StayOn AI
            </p>

            <div className="space-y-4 text-left">
              <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 mb-1">Need more help?</h4>
                <p className="text-[11px] text-slate-500 mb-3">Our team is here to support you.</p>
                <Button variant="stayon-gradient" size="sm" className="w-full gap-2 text-xs">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Support</span>
                </Button>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70">
                  <MessageSquare className="w-3.5 h-3.5 text-stayon-purple" />
                  <div>
                    <span className="font-bold block text-[11px]">Live Chat</span>
                    <span className="text-[10px] text-slate-400">Available 9 AM - 9 PM (IST)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70">
                  <Clock className="w-3.5 h-3.5 text-stayon-purple" />
                  <div>
                    <span className="font-bold block text-[11px]">Response Time</span>
                    <span className="text-[10px] text-slate-400">We usually reply within 24 hours.</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Bottom Quote matching Screenshot Page 5 */}
      <div className="text-center pt-4 border-t border-slate-200/60">
        <p className="handwriting-note text-xs text-purple-600">
          "Every question is a step closer to your success." — StayOn AI
        </p>
      </div>
    </div>
  );
};
