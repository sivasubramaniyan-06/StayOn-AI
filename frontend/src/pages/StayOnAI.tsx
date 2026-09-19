import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Send, Bot, User, RefreshCw, ArrowRight,
  Paperclip, Target, FileText, Lightbulb, Calendar, CheckSquare,
  MessageSquare, Plus, CheckCircle2, ChevronRight
} from 'lucide-react';
import { agentService } from '../services/agent';
import { authService } from '../services/auth';
import { tasksService } from '../services/tasks';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

interface StructuredStep {
  number: number;
  text: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  steps?: StructuredStep[];
  followUpPrompt?: string;
  suggestedActions?: Array<{ type: string; taskId?: string; goalId?: string; label: string }>;
  timestamp: string;
}

const QUICK_ACTIONS = [
  {
    id: 'break_goal',
    title: 'Break a Goal into Tasks',
    description: 'Turn your goal into a step-by-step plan.',
    icon: Target,
    prompt: 'Help me break my AWS goal into tasks',
    bg: 'bg-pink-50/80 hover:bg-pink-100/80',
    border: 'border-pink-100/90',
    iconBg: 'bg-pink-100 text-pink-600',
  },
  {
    id: 'summarize_notes',
    title: 'Summarize Notes',
    description: 'Get key points from your study materials.',
    icon: FileText,
    prompt: 'Summarize my latest study notes',
    bg: 'bg-sky-50/80 hover:bg-sky-100/80',
    border: 'border-sky-100/90',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'explain_concept',
    title: 'Explain a Concept',
    description: 'Understand anything in simple terms.',
    icon: Lightbulb,
    prompt: 'Explain AWS Lambda and serverless concepts simply',
    bg: 'bg-amber-50/80 hover:bg-amber-100/80',
    border: 'border-amber-100/90',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'plan_week',
    title: 'Plan My Week',
    description: 'Create a focused study plan.',
    icon: Calendar,
    prompt: 'Create a focused study plan for my week',
    bg: 'bg-purple-50/80 hover:bg-purple-100/80',
    border: 'border-purple-100/90',
    iconBg: 'bg-purple-100 text-stayon-purple',
  },
  {
    id: 'pending_tasks',
    title: 'Show My Pending Tasks',
    description: 'See what you need to work on.',
    icon: CheckSquare,
    prompt: 'Show my pending tasks for today',
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/80',
    border: 'border-emerald-100/90',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'ask_anything',
    title: 'Ask Anything',
    description: 'Talk to StayOn about your studies.',
    icon: MessageSquare,
    prompt: '',
    bg: 'bg-indigo-50/80 hover:bg-indigo-100/80',
    border: 'border-indigo-100/90',
    iconBg: 'bg-indigo-100 text-indigo-600',
  },
];

const SUGGESTION_CHIPS = [
  'Explain this topic',
  'Summarize my notes',
  'Create a study plan',
  'Break down a goal'
];

export const StayOnAI: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getUser();
  const queryClient = useQueryClient();
  const initialPrompt = (location.state as any)?.initialPrompt || '';

  const [inputMessage, setInputMessage] = useState('');
  const [addedTasksSuccess, setAddedTasksSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message + demo interaction matching the reference design
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: `Hi ${user.name ? user.name.split('.')[0] : 'Siva'}! 👋\nI'm StayOn AI, your study companion.\n\nI can help you plan, break down goals, explain concepts, and keep you on track.\n\nWhat would you like to do today?`,
      timestamp: '10:24 AM',
    },
    {
      id: 'msg-demo-user',
      sender: 'user',
      text: 'Help me break my AWS goal into tasks',
      timestamp: '10:25 AM',
    },
    {
      id: 'msg-demo-agent',
      sender: 'agent',
      text: `Sure! Here's a breakdown for your goal **"AWS Certification"**:`,
      steps: [
        { number: 1, text: 'Learn AWS fundamentals' },
        { number: 2, text: 'Complete hands-on labs' },
        { number: 3, text: 'Build a mini project' },
        { number: 4, text: 'Take mock tests' },
        { number: 5, text: 'Prepare for certification exam' },
      ],
      followUpPrompt: 'Would you like me to add these to your tasks?',
      suggestedActions: [
        { type: 'add_breakdown_tasks', label: 'Add to My Tasks' },
        { type: 'view_schedule', label: 'View in Schedule' }
      ],
      timestamp: '10:25 AM',
    }
  ]);

  // Scroll smoothly to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message mutation via API Gateway POST /agent
  const agentMutation = useMutation({
    mutationFn: (msg: string) => agentService.sendMessage({ message: msg }),
    onSuccess: (data, variables) => {
      const lower = variables.toLowerCase();
      let steps: StructuredStep[] | undefined = undefined;
      let followUp: string | undefined = undefined;

      if (lower.includes('break') || lower.includes('goal')) {
        steps = [
          { number: 1, text: 'Learn AWS fundamentals' },
          { number: 2, text: 'Complete hands-on labs' },
          { number: 3, text: 'Build a mini project' },
          { number: 4, text: 'Take mock tests' },
          { number: 5, text: 'Prepare for certification exam' },
        ];
        followUp = 'Would you like me to add these to your tasks?';
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'agent',
        text: data.reply,
        steps,
        followUpPrompt: followUp,
        suggestedActions: data.suggestedActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    },
  });

  // Replan mutation via API Gateway POST /replan
  const replanMutation = useMutation({
    mutationFn: (reason: string) => agentService.requestReplan({ reason }),
    onSuccess: (data) => {
      const botMsg: ChatMessage = {
        id: `bot-replan-${Date.now()}`,
        sender: 'agent',
        text: `🤖 **Adaptive Replanning Suggestion**\n\n${data.summary}\n\n*Requires user confirmation before persisting to your schedule.*`,
        suggestedActions: [
          { type: 'view_schedule', label: 'View Proposed Schedule' }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    agentMutation.mutate(text);
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (!action.prompt) {
      inputRef.current?.focus();
      return;
    }
    handleSend(action.prompt);
  };

  const handleActionClick = async (action: { type: string; label: string; taskId?: string; goalId?: string }) => {
    if (action.type === 'view_schedule' || action.type === 'reschedule') {
      navigate('/schedule');
      return;
    }
    if (action.type === 'view_tasks' || action.type === 'start_task') {
      navigate('/tasks');
      return;
    }
    if (action.type === 'view_goal') {
      navigate('/goals');
      return;
    }
    if (action.type === 'add_breakdown_tasks' || action.type === 'add_tasks' || action.type === 'create_task') {
      try {
        await tasksService.createTask({
          title: 'AWS: Complete hands-on labs',
          goalId: action.goalId || 'goal-001',
          estimatedMinutes: 60,
          scheduledDate: new Date().toISOString().split('T')[0]
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['today'] });
        setAddedTasksSuccess(true);
        setTimeout(() => setAddedTasksSuccess(false), 4000);
      } catch (err) {
        console.error(err);
      }
    } else {
      handleSend(action.label);
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  return (
    <div className="select-none space-y-5">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>StayOn AI</span>
            <Sparkles className="w-6 h-6 text-stayon-purple" />
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Your personal study companion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Decorative Quote Banner */}
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-50/90 via-pink-50/80 to-purple-50/90 border border-purple-100/80 shadow-xs">
            <span className="text-xs font-bold text-slate-700 italic">
              A Focused You, A Brighter Tomorrow ♡
            </span>
            <span className="text-base">🪐</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => replanMutation.mutate('Need to balance my study schedule')}
            isLoading={replanMutation.isPending}
            className="gap-2 text-xs rounded-full bg-white/90 border-slate-200 shadow-2xs hover:border-stayon-purple"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stayon-purple" />
            <span>Request AI Replan</span>
          </Button>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Chat (Left) & Quick Actions (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: Chat Interface ── */}
        <div className="lg:col-span-8 flex flex-col h-[650px]">
          <div className="stayon-card flex-1 p-5 bg-white/90 backdrop-blur-md border border-white/80 shadow-xs rounded-3xl flex flex-col overflow-hidden">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-start gap-3',
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-2xs font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stayon-purple text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={cn('max-w-[85%] space-y-1.5', isUser && 'items-end')}>
                      <div
                        className={cn(
                          'p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-2xs transition-all',
                          isUser
                            ? 'bg-stayon-purple text-white rounded-tr-xs'
                            : 'bg-slate-50/90 text-slate-800 border border-slate-100/90 rounded-tl-xs'
                        )}
                      >
                        {/* Main Text */}
                        <div className="whitespace-pre-line font-medium">
                          {msg.text}
                        </div>

                        {/* Structured Steps (e.g. Goal Breakdown) */}
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="mt-3.5 space-y-2 bg-white/80 p-3.5 rounded-2xl border border-purple-100/80">
                            {msg.steps.map((step) => (
                              <div key={step.number} className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-stayon-purple font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                                  {step.number}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">
                                  {step.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Follow-up Prompt */}
                        {msg.followUpPrompt && (
                          <p className="mt-3 text-xs text-slate-500 font-semibold italic">
                            {msg.followUpPrompt}
                          </p>
                        )}

                        {/* Interactive Suggested Action Buttons */}
                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-1">
                            {msg.suggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleActionClick(action)}
                                className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-stayon-purple flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>{action.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className={cn('text-[10px] text-slate-400 block px-1.5', isUser && 'text-right')}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {agentMutation.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stayon-purple text-white flex items-center justify-center flex-shrink-0 shadow-2xs animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100/80 text-xs text-stayon-purple font-semibold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>StayOn AI is thinking...</span>
                  </div>
                </div>
              )}

              {/* Added task toast feedback */}
              {addedTasksSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Task successfully added to your study schedule!</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Suggestion Chips (Directly Above Input) ── */}
            <div className="pt-3 pb-2 border-t border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-xs font-semibold text-slate-600 hover:text-stayon-purple hover:border-stayon-purple hover:bg-purple-50/50 transition-all cursor-pointer flex-shrink-0 shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Chat Input Bar ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="pt-1 flex items-center gap-2"
            >
              <div className="flex-1 relative flex items-center">
                <button
                  type="button"
                  title="Attach study material or syllabus"
                  onClick={() => handleSend('Summarize my uploaded study notes for Cloud Computing')}
                  className="absolute left-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-stayon-purple hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask StayOn AI anything..."
                  className="stayon-input w-full py-3 pl-11 pr-4 text-sm font-medium bg-slate-50/70 border-slate-200 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <Button
                type="submit"
                variant="stayon-gradient"
                disabled={!inputMessage.trim() || agentMutation.isPending}
                className="h-11 w-11 rounded-2xl p-0 flex items-center justify-center flex-shrink-0 shadow-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Quick Actions & Motivational Card ── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Actions Card */}
          <div className="stayon-card p-5 bg-white/90 backdrop-blur-md shadow-xs border border-white/80 rounded-3xl">
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-stayon-purple" />
                Quick Actions
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Get things done faster.
              </p>
            </div>

            <div className="space-y-2.5">
              {QUICK_ACTIONS.map((action) => {
                const { icon: Icon } = action;

                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      'w-full text-left p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer shadow-2xs',
                      action.bg,
                      action.border
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs', action.iconBg)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-stayon-purple transition-colors truncate">
                          {action.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-stayon-purple group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motivational Card */}
          <div className="stayon-card p-5 bg-gradient-to-br from-purple-50/90 via-white to-pink-50/90 border border-purple-100/70 shadow-xs relative overflow-hidden rounded-3xl">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-700 italic leading-snug tracking-tight">
                  Progress happens<br />with curiosity. 💜
                </p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <span className="text-sm">🌱</span>
                  <span className="text-[10px] font-semibold text-slate-500">Keep exploring & growing</span>
                </div>
              </div>

              {/* Cute Astronaut Vector */}
              <div className="flex-shrink-0">
                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <ellipse cx="34" cy="40" rx="14" ry="16" fill="#F0EEFF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  <circle cx="34" cy="22" r="12" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="1.5"/>
                  <ellipse cx="34" cy="22" rx="7.5" ry="6" fill="#6C5CE7" opacity="0.7"/>
                  <ellipse cx="34" cy="22" rx="7.5" ry="6" fill="none" stroke="#7C6EFA" strokeWidth="1"/>
                  <path d="M30 19 Q 34 17 36 19" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/>
                  <path d="M20 36 Q 24 40 26 40" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M48 36 Q 44 40 40 40" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <rect x="42" y="34" width="6" height="10" rx="2" fill="#D6CEFF" stroke="#A29BFE" strokeWidth="1"/>
                  <path d="M54 12 L55 15 L58 16 L55 17 L54 20 L53 17 L50 16 L53 15 Z" fill="#FD79A8" opacity="0.9"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
