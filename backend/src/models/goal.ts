export interface Goal {
  goalId: string;
  userId: string;
  title: string;
  description?: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}
