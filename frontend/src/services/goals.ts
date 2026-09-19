import { apiClient } from './api';
import { Goal, CreateGoalRequest } from '../types';
import { mockGoals } from '../mock/data';

const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

let inMemoryGoals: Goal[] = [...mockGoals];

export const goalsService = {
  /**
   * POST /goals
   * Create goal sending ONLY supported contract fields: title, description, deadline, documentId
   */
  async createGoal(request: CreateGoalRequest): Promise<Goal> {
    try {
      const response = await apiClient.post<Goal>('/goals', request);
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        console.warn('POST /goals failed, using mock goal creation fallback.');
        const newGoal: Goal = {
          id: `goal-${Date.now()}`,
          title: request.title,
          description: request.description,
          deadline: request.deadline,
          documentId: request.documentId,
          status: 'active',
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          createdAt: new Date().toISOString()
        };
        inMemoryGoals = [newGoal, ...inMemoryGoals];
        return newGoal;
      }
      throw error;
    }
  },

  /**
   * GET /goals
   */
  async getGoals(): Promise<Goal[]> {
    try {
      const response = await apiClient.get<{ goals: Goal[] }>('/goals');
      return response.data.goals;
    } catch (error) {
      if (ENABLE_MOCK) {
        return inMemoryGoals;
      }
      throw error;
    }
  }
};
