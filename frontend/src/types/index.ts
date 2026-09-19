// Document Types
export type DocumentStatus = 'pending_upload' | 'processing' | 'ready' | 'failed';

export interface Document {
  id: string;
  fileName: string;
  fileType?: string;
  uploadUrl?: string;
  status: DocumentStatus;
  extractedSummary?: string;
  createdAt: string;
}

export interface DocumentUploadResponse {
  id: string;
  fileName: string;
  uploadUrl: string;
  status: DocumentStatus;
  createdAt: string;
}

// Goal Types
export type GoalStatus = 'active' | 'completed' | 'paused';

export interface CreateGoalRequest {
  title: string;
  description: string;
  deadline: string;
  documentId: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  documentId?: string;
  status: GoalStatus;
  progress: number; // 0 - 100
  totalTasks?: number;
  completedTasks?: number;
  createdAt?: string;
}

// Task Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  goalId?: string;
  goalTitle?: string;
  title: string;
  description?: string;
  parentId?: string | null;
  scheduledDate?: string;
  estimatedMinutes?: number;
  priority?: PriorityLevel;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  goalId?: string;
  title: string;
  parentId?: string | null;
  scheduledDate?: string;
  estimatedMinutes?: number;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  title?: string;
  scheduledDate?: string;
}

// Habit Types
export interface Habit {
  id: string;
  title: string;
  frequency?: 'daily' | 'weekly';
  targetMinutes?: number;
  completedToday?: boolean;
  streak: number;
  lastCompletedDate?: string;
  createdAt?: string;
}

// Today Dashboard Response
export interface ProgressSummary {
  completedCount: number;
  totalCount: number;
  completionRate: number; // 0.0 - 1.0
}

export interface TodayResponse {
  date: string;
  tasks: Task[];
  habits: Habit[];
  progressSummary: ProgressSummary;
}

// AI Agent Types
export interface SuggestedAction {
  type: 'start_task' | 'view_goal' | 'create_task' | 'reschedule';
  taskId?: string;
  goalId?: string;
  label: string;
}

export interface AgentMessageRequest {
  message: string;
}

export interface AgentMessageResponse {
  reply: string;
  suggestedActions?: SuggestedAction[];
}

export interface ReplanRequest {
  reason: string;
}

export interface ProposedChange {
  taskId: string;
  currentDate?: string;
  proposedDate: string;
}

export interface ReplanResponse {
  planId: string;
  summary: string;
  changes: ProposedChange[];
  requiresUserConfirmation: boolean;
}

// User & Profile Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;
}
