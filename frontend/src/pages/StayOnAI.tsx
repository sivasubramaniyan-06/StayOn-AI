import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Send, Bot, User, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { agentService } from '../services/agent';
import { authService } from '../services/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  suggestedActions?: Array<{ type: string; taskId?: string; goalId?: string; label: string }>;
  timestamp: string;
}

export const StayOnAI: React.FC = () => {
  const location = useLocation();
  const user = authService.getUser();
  const initialPrompt = (location.state as any)?.initialPrompt || '';

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: `Hello ${user.name}! I am StayOn AI, your intelligent study companion. How can I assist you with your goals or tasks today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Send message mutation via API Gateway POST /agent
  const agentMutation = useMutation({
    mutationFn: (msg: string) => agentService.sendMessage({ message: msg }),
    onSuccess: (data) => {
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'agent',
        text: data.reply,
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

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>StayOn AI Assistant</span>
            <Sparkles className="w-5 h-5 text-stayon-purple" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Bedrock Agent powered study companion (React → API Gateway → Lambda → Bedrock).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => replanMutation.mutate('Fell behind on study tasks')}
          isLoading={replanMutation.isPending}
          className="gap-2 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Request AI Replan</span>
        </Button>
      </div>

      {/* Chat Messages Box */}
      <Card className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-white/80">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm ${
                msg.sender === 'user' ? 'bg-slate-800' : 'bg-stayon-purple'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[80%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-stayon-purple text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>

              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action.label)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-stayon-purple flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-400 block px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {agentMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-stayon-purple font-medium p-3 rounded-2xl bg-purple-50/60 max-w-xs animate-pulse">
            <Bot className="w-4 h-4" />
            <span>StayOn AI is thinking...</span>
          </div>
        )}
      </Card>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask StayOn AI to summarize, explain, or plan..."
          className="stayon-input flex-1 py-3.5 px-5 text-sm text-slate-800 shadow-sm"
        />
        <Button type="submit" variant="stayon-gradient" className="h-12 w-12 rounded-2xl p-0 shadow-lg">
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
};
