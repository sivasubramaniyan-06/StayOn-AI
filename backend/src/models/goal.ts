export interface Goal {
  goalId: string;
  id?: string;
  userId: string;
  title: string;
  description?: string;
  deadline?: string;
  documentId?: string;
  status: "active" | "completed" | "archived";
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  createdAt: string;
  updatedAt: string;
}
