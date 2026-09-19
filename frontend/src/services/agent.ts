import { apiClient } from './api';
import { AgentMessageRequest, AgentMessageResponse, ReplanRequest, ReplanResponse } from '../types';

const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

export const agentService = {
  /**
   * POST /agent
   * Never call Bedrock directly. Send request to API Gateway -> Lambda -> Bedrock / Bedrock Agent.
   */
  async sendMessage(request: AgentMessageRequest): Promise<AgentMessageResponse> {
    try {
      const response = await apiClient.post<AgentMessageResponse>('/agent', request);
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        const lower = (request.message || '').toLowerCase();

        if (lower.includes('break') || lower.includes('goal')) {
          return {
            reply: `Sure! Here's a breakdown for your goal **"AWS Certification"**:`,
            suggestedActions: [
              { type: 'create_task', label: 'Add to My Tasks' },
              { type: 'reschedule', label: 'View in Schedule' }
            ]
          };
        }

        if (lower.includes('summarize') || lower.includes('notes')) {
          return {
            reply: `Here is a summary of your recent study materials for **Cloud Computing**:\n\n• **Core Concepts**: S3 Storage Classes, EC2 Lifecycle, and IAM Permissions.\n• **Upcoming Target**: AWS Certification exam on Nov 30, 2026.\n• **Action Item**: Complete hands-on lab on AWS Lambda functions today.`,
            suggestedActions: [
              { type: 'start_task', taskId: 'task-501', label: 'Review S3 Notes' }
            ]
          };
        }

        if (lower.includes('explain') || lower.includes('concept') || lower.includes('topic')) {
          return {
            reply: `**AWS Lambda Explained Simply:**\n\nAWS Lambda is an event-driven, serverless computing platform. You upload your code and AWS automatically manages the server infrastructure, scaling dynamically from 0 to thousands of concurrent requests without provisioning servers!`,
            suggestedActions: [
              { type: 'start_task', taskId: 'task-502', label: 'Start Lambda Study Task' }
            ]
          };
        }

        if (lower.includes('plan') || lower.includes('week')) {
          return {
            reply: `**Your Recommended Weekly Study Plan:**\n\n• **Mon – Tue**: Deep dive into AWS Cloud Architecture & Lambda (1 hr/day)\n• **Wed – Thu**: DSA Trees and System Design chapter review (1 hr/day)\n• **Fri – Sat**: Timed mock exam and GitHub portfolio update (45 min/day)`,
            suggestedActions: [
              { type: 'reschedule', label: 'Open Schedule Planner' }
            ]
          };
        }

        if (lower.includes('pending') || lower.includes('tasks')) {
          return {
            reply: `You have **3 pending tasks** scheduled for today:\n\n1. **Complete AWS research notes** (High Priority · 45 min)\n2. **Study AWS Lambda** (Medium Priority · 1 hr)\n3. **Update GitHub Portfolio** (Low Priority · 30 min)`,
            suggestedActions: [
              { type: 'start_task', taskId: 'task-501', label: 'Start First Task' }
            ]
          };
        }

        return {
          reply: `I analyzed your study schedule and goals! Regarding "${request.message}", I recommend focusing on your high-priority AWS tasks today. Let me know if you would like me to generate a tailored step-by-step study breakdown!`,
          suggestedActions: [
            {
              type: 'start_task',
              taskId: 'task-501',
              label: 'Start S3 Research Notes'
            },
            {
              type: 'view_goal',
              goalId: 'goal-001',
              label: 'View AWS Certification Goal'
            }
          ]
        };
      }
      throw error;
    }
  },

  /**
   * POST /replan
   * AI-generated replanning schedule request
   */
  async requestReplan(request: ReplanRequest): Promise<ReplanResponse> {
    try {
      const response = await apiClient.post<ReplanResponse>('/replan', request);
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        return {
          planId: `replan-${Date.now()}`,
          summary: `Re-balanced study load based on your input: "${request.reason}". Shifted 2 pending tasks to lighter days later this week.`,
          changes: [
            {
              taskId: 'task-501',
              currentDate: '2026-09-19',
              proposedDate: '2026-09-21'
            }
          ],
          requiresUserConfirmation: true
        };
      }
      throw error;
    }
  }
};
