import { apiClient } from './api';
import { TodayResponse, Task, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { mockToday } from '../mock/data';

const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false';

let inMemoryToday: TodayResponse = { ...mockToday };

export const tasksService = {
  /**
   * GET /today
   */
  async getToday(): Promise<TodayResponse> {
    try {
      const response = await apiClient.get<TodayResponse>('/today');
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        return inMemoryToday;
      }
      throw error;
    }
  },

  /**
   * GET /tasks
   */
  async getTasks(goalId?: string): Promise<Task[]> {
    try {
      const response = await apiClient.get<{ tasks: Task[] }>('/tasks', {
        params: { goalId }
      });
      return response.data.tasks;
    } catch (error) {
      if (ENABLE_MOCK) {
        if (goalId) {
          return inMemoryToday.tasks.filter(t => t.goalId === goalId);
        }
        return inMemoryToday.tasks;
      }
      throw error;
    }
  },

  /**
   * POST /tasks
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    try {
      const response = await apiClient.post<Task>('/tasks', request);
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          goalId: request.goalId,
          title: request.title,
          parentId: request.parentId || null,
          scheduledDate: request.scheduledDate || new Date().toISOString().split('T')[0],
          estimatedMinutes: request.estimatedMinutes || 30,
          status: 'pending'
        };
        inMemoryToday.tasks.push(newTask);
        return newTask;
      }
      throw error;
    }
  },

  /**
   * PATCH /tasks/{id}
   */
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    try {
      const response = await apiClient.patch<Task>(`/tasks/${id}`, updates);
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        const taskIndex = inMemoryToday.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
          inMemoryToday.tasks[taskIndex] = {
            ...inMemoryToday.tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return inMemoryToday.tasks[taskIndex];
        }
        return {
          id,
          title: 'Updated Task',
          status: updates.status || 'completed',
          updatedAt: new Date().toISOString()
        };
      }
      throw error;
    }
  }
};
