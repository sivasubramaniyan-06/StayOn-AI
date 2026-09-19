# StayOn AI — Architecture

## System Overview

StayOn AI is an intelligent student workspace designed to connect syllabus materials, academic goals, granular tasks, dynamic scheduling, daily habits, and progress analytics into a unified feedback loop.

### Architecture Diagram

```
Student
  │
  ▼
StayOn Frontend (React / Next.js)
  │
  ▼
AWS Amplify / Web Hosting
  │
  ▼
Amazon Cognito (Authentication & User Pools)
  │
  ▼
Amazon API Gateway (REST API Entry Point)
  │
  ▼
AWS Lambda (Backend Business Logic)
  ├── Amazon S3 (Document Storage)
  ├── Amazon DynamoDB (Single-Table / Structured Persistence)
  └── Amazon Bedrock (Foundation Models)
          │
          ▼
      Amazon Bedrock Agent (Autonomous Planning & Tool Calling)
          │
          ▼
      Controlled Lambda Action Tools (get_today_tasks, replan_tasks, etc.)
```

---

## AWS Component Responsibilities

| Service | Primary Responsibility |
| :--- | :--- |
| **AWS Amplify / Hosting** | Continuous hosting, asset delivery, and CDN distribution for the web frontend. |
| **Amazon Cognito** | Secure student signup, signin, token management (JWT), session handling, and user pools. |
| **Amazon API Gateway** | Secure, managed REST API endpoint routing, request throttling, and Cognito Authorizer integration. |
| **AWS Lambda** | Serverless compute executing backend business logic, validation, task generation, and data access. |
| **Amazon S3** | Durable, encrypted object storage for student uploads (PDFs, syllabus docs, lecture slides). |
| **Amazon DynamoDB** | Low-latency, scalable persistence for Goals, Tasks, Habits, Schedules, Document Metadata, and User Profiles. |
| **Amazon Bedrock** | Document comprehension, syllabus analysis, breakdown of goals into structured tasks, and natural language assistance. |
| **Amazon Bedrock Agent** | Orchestrated agentic capabilities invoking controlled Lambda action tools: `get_today_tasks`, `get_pending_tasks`, `create_tasks`, `replan_tasks`. |
| **Amazon CloudWatch** | Centralized logging, distributed metrics, operational monitoring, and error tracing. |
| **AWS IAM** | Granular, least-privilege execution roles and permission policies across all cloud resources. |

---

## Core Architecture Principle

> **"Bedrock suggests, backend validates."**

1. **Controlled Actions**: The AI Foundation Models / Bedrock Agents must **never** directly read or modify the database without strictly typed, validated Lambda action tools.
2. **Deterministic Validation**: Every suggestion produced by Bedrock (e.g., extracted milestones, generated tasks, proposed schedules) is vetted by backend validation rules before persisting to DynamoDB.
3. **Student in Control**: High-impact state changes—specifically rescheduling, task deadline shifting, or bulk replanning—require explicit user confirmation through the UI prior to execution.
