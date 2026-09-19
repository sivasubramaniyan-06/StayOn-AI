import { Document, Goal, Task, Habit, TodayResponse, UserProfile } from '../types';

export const mockCurrentUser: UserProfile = {
  id: 'user-001',
  name: 'Siva',
  email: 'siva.student@example.com',
  studentId: '2301CS123',
  bio: 'Computer Science student passionate about cloud and AI.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  role: 'Student'
};

export const mockDocuments: Document[] = [
  {
    id: 'doc-101',
    fileName: 'Cloud_Computing_Syllabus.pdf',
    fileType: 'application/pdf',
    status: 'ready',
    extractedSummary: 'Introduction to distributed systems, virtualization, AWS services, serverless computing, S3 storage classes, DynamoDB single-table design, and final certification exam prep guidelines.',
    createdAt: '2026-09-19T09:00:00Z'
  },
  {
    id: 'doc-102',
    fileName: 'System_Design_Fundamentals.pdf',
    fileType: 'application/pdf',
    status: 'ready',
    extractedSummary: 'Overview of horizontal scaling, load balancing, relational vs NoSQL databases, caching strategies, rate limiting, and event-driven microservice architecture.',
    createdAt: '2026-09-18T14:30:00Z'
  },
  {
    id: 'doc-103',
    fileName: 'Machine_Learning_Lecture_Notes.pdf',
    fileType: 'application/pdf',
    status: 'processing',
    createdAt: '2026-09-19T11:20:00Z'
  }
];

export const mockGoals: Goal[] = [
  {
    id: 'goal-001',
    title: 'AWS Certification',
    description: 'Build cloud skills and get certified',
    deadline: '2026-11-30',
    documentId: 'doc-101',
    status: 'active',
    progress: 40,
    totalTasks: 20,
    completedTasks: 8,
    createdAt: '2026-09-19T09:10:00Z'
  },
  {
    id: 'goal-002',
    title: 'System Design Mastery',
    description: 'Master large-scale distributed architecture principles',
    deadline: '2026-10-22',
    documentId: 'doc-102',
    status: 'active',
    progress: 74,
    totalTasks: 12,
    completedTasks: 9,
    createdAt: '2026-09-15T10:00:00Z'
  }
];

export const mockToday: TodayResponse = {
  date: '2026-09-19',
  tasks: [
    {
      id: 'task-501',
      goalId: 'goal-001',
      goalTitle: 'AWS Certification',
      title: 'Complete AWS research notes',
      description: 'Build a strong foundation for your certification journey.',
      estimatedMinutes: 45,
      priority: 'high',
      status: 'pending',
      scheduledDate: '2026-09-19'
    },
    {
      id: 'task-502',
      goalId: 'goal-002',
      goalTitle: 'System Design Mastery',
      title: 'Read System Design chapter',
      description: 'Study database partitioning and replication techniques.',
      estimatedMinutes: 60,
      priority: 'medium',
      status: 'pending',
      scheduledDate: '2026-09-19'
    },
    {
      id: 'task-503',
      goalId: 'goal-001',
      goalTitle: 'AWS Certification',
      title: 'Prepare internship application draft',
      description: 'Update resume with AWS cloud project bullet points.',
      estimatedMinutes: 30,
      priority: 'low',
      status: 'pending',
      scheduledDate: '2026-09-19'
    }
  ],
  habits: [
    {
      id: 'habit-01',
      title: 'Review Flashcards',
      frequency: 'daily',
      targetMinutes: 15,
      completedToday: false,
      streak: 5
    },
    {
      id: 'habit-02',
      title: 'Practice AWS Hands-on Lab',
      frequency: 'daily',
      targetMinutes: 30,
      completedToday: true,
      streak: 12
    }
  ],
  progressSummary: {
    completedCount: 1,
    totalCount: 3,
    completionRate: 0.33
  }
};
