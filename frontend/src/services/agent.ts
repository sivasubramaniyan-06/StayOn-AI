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
