# StayOn AI

> StayOn is an AI-powered student workspace that connects learning materials, goals, tasks, schedules, habits and progress in one environment. Its AI Agent helps students plan, execute and adapt their work while keeping the student in control.

---

## Core Workflow

```
PDF / Document
      │
      ▼
Understanding (Amazon Bedrock)
      │
      ▼
Goal Definition
      │
      ▼
Goal / Task Tree
      │
      ▼
Tasks
      │
      ▼
Schedule
      │
      ▼
Execution & Tracking
      │
      ▼
Progress & Streaks
      │
      ▼
Adaptive Replanning ("Bedrock suggests, backend validates, student confirms")
```

---

## Core MVP Features

- **Authentication & Login**: Secure student onboarding via Amazon Cognito.
- **PDF Upload**: S3-backed document upload for syllabi, rubrics, and lecture notes.
- **Document Extraction**: Bedrock-powered text and milestone extraction.
- **Goal Creation**: Establishing high-level learning outcomes tied to uploaded materials.
- **Task Generation**: Automatic AI breakdown of goals into structured tasks.
- **Editable Task Tree**: Nested, hierarchical task views with easy editing.
- **Scheduling**: Calendar and daily agenda distribution.
- **Task Completion**: Real-time status updates and execution marking.
- **Progress & Habits**: Daily streak tracking, habit logs, and completion metrics.
- **StayOn Agent**: Autonomous assistant with controlled action tools.
- **Adaptive Rescheduling**: Intelligent replanning when students encounter schedule conflicts.

---

## High-Level Architecture

```
StayOn Frontend (React / Next.js)
      │
      ▼
Amazon API Gateway
      │
      ▼
AWS Lambda
  ├── Amazon S3 (Document Storage)
  ├── Amazon DynamoDB (Single-table Data Store)
  └── Amazon Bedrock
          │
          ▼
      Amazon Bedrock Agent (Controlled Lambda Action Tools)
```

For complete architectural details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Project Structure

```
StayOn-AI/
├── frontend/           # Client-side React / Next.js application
├── backend/            # AWS Lambda business logic & handlers
├── ai/                 # Bedrock prompts, schemas, & agent tools
├── infrastructure/     # AWS CloudFormation / SAM / CDK templates
├── docs/               # Shared project documentation
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── DATABASE_SCHEMA.md
│   ├── TEAM_RULES.md
│   └── PROGRESS.md
├── .gitignore
├── package.json
└── README.md
```

---

## Team Development & Branch Strategy

The team adheres to a strict feature branch strategy to ensure `main` remains clean and deployable.

| Developer | Branch | Core Responsibilities |
| :--- | :--- | :--- |
| **Person 1**<br>*(Tech Lead)* | `feature/person-1-aws-ai` | AWS architecture, Bedrock, Bedrock document extraction, AI prompts, Bedrock Agent, AI task generation, AI replanning, AWS integration, final integration/deployment. |
| **Person 4**<br>*(Backend)* | `feature/person-4-backend` | Cognito, API Gateway, Lambda, DynamoDB, S3 backend/storage, CRUD APIs, backend validation, authentication/backend security, API implementation. |
| **Person 2**<br>*(Frontend)* | `feature/person-2-knowledge` | Main frontend, Knowledge, PDF upload UI, Document UI, Goal UI, Dashboard. |
| **Person 3**<br>*(Frontend)* | `feature/person-3-execution` | Goal Tree, Tasks, Scheduling UI, Completion, Progress, Habits, Agent UI, Replanning UI. |

### Development Rules
All team members must read and follow [docs/TEAM_RULES.md](docs/TEAM_RULES.md).
- **Never push directly to `main`**.
- Work exclusively on your assigned feature branch.
- Use mock data while waiting for dependency APIs.
- Submit Pull Requests with at least one teammate review.
