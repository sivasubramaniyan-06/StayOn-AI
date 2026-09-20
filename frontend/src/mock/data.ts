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
    title: 'AWS Internship',
    description: 'Build cloud skills and get certified for internship',
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
    title: 'DSA Preparation',
    description: 'Master data structures and algorithms for interviews',
    deadline: '2026-10-22',
    documentId: 'doc-102',
    status: 'active',
    progress: 74,
    totalTasks: 12,
    completedTasks: 9,
    createdAt: '2026-09-15T10:00:00Z'
  },
  {
    id: 'goal-003',
    title: 'Personal Growth',
    description: 'Build portfolio, LinkedIn presence, and career readiness',
    deadline: '2026-12-31',
    status: 'active',
    progress: 20,
    totalTasks: 8,
    completedTasks: 2,
    createdAt: '2026-09-10T08:00:00Z'
  }
];

export const mockToday: TodayResponse = {
  date: '2026-09-19',
  tasks: [
    {
      id: 'task-500',
      goalId: 'goal-003',
      goalTitle: 'Personal Growth',
      title: 'Morning Exercise',
      description: 'Cardio and stretching routine to start the day energized.',
      estimatedMinutes: 30,
      priority: 'low',
      status: 'completed',
      scheduledDate: '2026-09-19',
      scheduledStart: '06:00'
    },
    {
      id: 'task-501',
      goalId: 'goal-001',
      goalTitle: 'AWS Internship',
      title: 'Complete AWS research notes',
      description: 'Build a strong foundation for your certification journey.',
      estimatedMinutes: 45,
      priority: 'high',
      status: 'pending',
      scheduledDate: '2026-09-19',
      scheduledStart: '08:00'
    },
    {
      id: 'task-502',
      goalId: 'goal-001',
      goalTitle: 'AWS Internship',
      title: 'Study AWS Lambda',
      description: 'Deep dive into Lambda functions, triggers and concurrency.',
      estimatedMinutes: 60,
      priority: 'medium',
      status: 'completed',
      scheduledDate: '2026-09-19',
      scheduledStart: '09:30'
    },
    {
      id: 'task-510',
      title: 'Lunch Break',
      description: 'Healthy meal & relaxation break.',
      estimatedMinutes: 60,
      priority: 'low',
      status: 'completed',
      scheduledDate: '2026-09-19',
      scheduledStart: '13:00'
    },
    {
      id: 'task-503',
      goalId: 'goal-003',
      goalTitle: 'Personal Growth',
      title: 'Update GitHub Portfolio',
      description: 'Add recent AWS and system design projects to GitHub.',
      estimatedMinutes: 30,
      priority: 'low',
      status: 'pending',
      scheduledDate: '2026-09-19',
      scheduledStart: '14:30'
    },
    {
      id: 'task-504',
      goalId: 'goal-002',
      goalTitle: 'DSA Preparation',
      title: 'Read System Design chapter',
      description: 'Study database partitioning and replication techniques.',
      estimatedMinutes: 60,
      priority: 'medium',
      status: 'pending',
      scheduledDate: '2026-09-19',
      scheduledStart: '17:30'
    },
    {
      id: 'task-511',
      goalId: 'goal-003',
      goalTitle: 'Personal',
      title: 'Plan tomorrow',
      description: 'Review upcoming priorities and organize calendar for tomorrow.',
      estimatedMinutes: 15,
      priority: 'low',
      status: 'pending',
      scheduledDate: '2026-09-19',
      scheduledStart: '19:30'
    },
    {
      id: 'task-505',
      goalId: 'goal-001',
      goalTitle: 'AWS Internship',
      title: 'Prepare internship application draft',
      description: 'Update resume with AWS cloud project bullet points.',
      estimatedMinutes: 60,
      priority: 'high',
      status: 'pending',
      scheduledDate: '2026-09-20',
      scheduledStart: '10:00'
    },
    {
      id: 'task-506',
      goalId: 'goal-001',
      goalTitle: 'AWS Internship',
      title: 'Build API Gateway project',
      description: 'Create a REST API using AWS API Gateway and Lambda.',
      estimatedMinutes: 120,
      priority: 'medium',
      status: 'pending',
      scheduledDate: '2026-09-21',
      scheduledStart: '14:00'
    },
    {
      id: 'task-507',
      goalId: 'goal-002',
      goalTitle: 'DSA Preparation',
      title: 'Take practice test',
      description: 'Complete a timed mock exam covering Trees and Graphs.',
      estimatedMinutes: 60,
      priority: 'low',
      status: 'pending',
      scheduledDate: '2026-09-22',
      scheduledStart: '11:00'
    },
    {
      id: 'task-508',
      goalId: 'goal-003',
      goalTitle: 'Personal Growth',
      title: 'Update LinkedIn profile',
      description: 'Add AWS certification progress and recent internship projects.',
      estimatedMinutes: 30,
      priority: 'low',
      status: 'pending',
      scheduledDate: '2026-09-22',
      scheduledStart: '16:00'
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
