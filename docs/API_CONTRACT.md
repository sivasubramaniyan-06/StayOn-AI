# StayOn AI — API Contract

This document defines the shared REST API contract between the Frontend and the Backend/AWS services. All requests and responses use `application/json` unless otherwise specified. Authentication is handled via standard `Bearer <Cognito-JWT-Token>` headers.

> **CRITICAL RULE**: Do not silently change API endpoint paths, request bodies, or response structures without team consensus.

---

## Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/documents` | Request pre-signed upload URL or register uploaded document |
| `GET` | `/documents` | Retrieve list of uploaded documents and extraction status |
| `POST` | `/goals` | Create a new goal (manually or derived from document) |
| `GET` | `/goals` | List all student goals |
| `POST` | `/tasks` | Create a new task under a goal |
| `GET` | `/tasks` | List tasks (filterable by goal or status) |
| `PATCH` | `/tasks/{id}` | Update task status, title, or schedule |
| `GET` | `/today` | Fetch today's scheduled agenda, tasks, and habits |
| `POST` | `/habits` | Create a recurring habit |
| `PATCH` | `/habits/{id}` | Update habit or mark daily completion |
| `POST` | `/agent` | Send an instruction or query to the StayOn AI Agent |
| `POST` | `/replan` | Request AI-generated rescheduling plan based on progress |

---

## Detailed Specifications

### 1. Documents

#### `POST /documents`
- **Purpose**: Register a new document and receive an S3 upload pre-signed URL or trigger extraction.
- **Request**:
```json
{
  "fileName": "Cloud_Computing_Syllabus.pdf",
  "fileType": "application/pdf"
}
```
- **Response**:
```json
{
  "id": "doc-101",
  "fileName": "Cloud_Computing_Syllabus.pdf",
  "uploadUrl": "https://stayon-documents.s3.amazonaws.com/uploads/doc-101.pdf?signature=...",
  "status": "pending_upload",
  "createdAt": "2026-09-19T09:00:00Z"
}
```
- **Important Fields**: `uploadUrl` (pre-signed S3 URL), `status` (`pending_upload` | `processing` | `ready` | `failed`).

#### `GET /documents`
- **Purpose**: Fetch all user uploaded documents and extraction summaries.
- **Request**: *None*
- **Response**:
```json
{
  "documents": [
    {
      "id": "doc-101",
      "fileName": "Cloud_Computing_Syllabus.pdf",
      "status": "ready",
      "extractedSummary": "Introduction to distributed systems, virtualization, AWS services, and final exam on Nov 15.",
      "createdAt": "2026-09-19T09:00:00Z"
    }
  ]
}
```

---

### 2. Goals

#### `POST /goals`
- **Purpose**: Create a new learning objective or academic goal.
- **Request**:
```json
{
  "title": "Master AWS Cloud Solutions",
  "description": "Complete AWS certification prep modules and labs",
  "deadline": "2026-10-30",
  "documentId": "doc-101"
}
```
- **Response**:
```json
{
  "id": "goal-001",
  "title": "Master AWS Cloud Solutions",
  "description": "Complete AWS certification prep modules and labs",
  "deadline": "2026-10-30",
  "documentId": "doc-101",
  "status": "active",
  "progress": 0,
  "createdAt": "2026-09-19T09:10:00Z"
}
```

#### `GET /goals`
- **Purpose**: Retrieve all active and completed goals.
- **Request**: *None*
- **Response**:
```json
{
  "goals": [
    {
      "id": "goal-001",
      "title": "Master AWS Cloud Solutions",
      "deadline": "2026-10-30",
      "status": "active",
      "progress": 25,
      "totalTasks": 12,
      "completedTasks": 3
    }
  ]
}
```

---

### 3. Tasks

#### `POST /tasks`
- **Purpose**: Create a task (standalone or linked to a goal).
- **Request**:
```json
{
  "goalId": "goal-001",
  "title": "Read S3 Storage Classes Whitepaper",
  "parentId": null,
  "scheduledDate": "2026-09-20",
  "estimatedMinutes": 45
}
```
- **Response**:
```json
{
  "id": "task-501",
  "goalId": "goal-001",
  "title": "Read S3 Storage Classes Whitepaper",
  "parentId": null,
  "scheduledDate": "2026-09-20",
  "estimatedMinutes": 45,
  "status": "pending",
  "createdAt": "2026-09-19T09:15:00Z"
}
```

#### `GET /tasks`
- **Purpose**: Retrieve tasks list. Supports optional query param `?goalId=goal-001`.
- **Request**: *Query params:* `goalId` (optional), `date` (optional).
- **Response**:
```json
{
  "tasks": [
    {
      "id": "task-501",
      "goalId": "goal-001",
      "title": "Read S3 Storage Classes Whitepaper",
      "parentId": null,
      "scheduledDate": "2026-09-20",
      "estimatedMinutes": 45,
      "status": "pending"
    }
  ]
}
```

#### `PATCH /tasks/{id}`
- **Purpose**: Update task status (e.g., mark done) or reschedule.
- **Request**:
```json
{
  "status": "completed",
  "scheduledDate": "2026-09-20"
}
```
- **Response**:
```json
{
  "id": "task-501",
  "status": "completed",
  "scheduledDate": "2026-09-20",
  "updatedAt": "2026-09-20T10:30:00Z"
}
```

---

### 4. Today Dashboard

#### `GET /today`
- **Purpose**: Fetch everything relevant to the current day for instant student execution.
- **Request**: *None*
- **Response**:
```json
{
  "date": "2026-09-19",
  "tasks": [
    {
      "id": "task-501",
      "goalTitle": "Master AWS Cloud Solutions",
      "title": "Read S3 Storage Classes Whitepaper",
      "estimatedMinutes": 45,
      "status": "pending"
    }
  ],
  "habits": [
    {
      "id": "habit-01",
      "title": "Review Flashcards",
      "completedToday": false,
      "streak": 5
    }
  ],
  "progressSummary": {
    "completedCount": 2,
    "totalCount": 5,
    "completionRate": 0.40
  }
}
```

---

### 5. Habits

#### `POST /habits`
- **Purpose**: Create a daily or weekly habit to build learning consistency.
- **Request**:
```json
{
  "title": "Review Flashcards",
  "frequency": "daily",
  "targetMinutes": 15
}
```
- **Response**:
```json
{
  "id": "habit-01",
  "title": "Review Flashcards",
  "frequency": "daily",
  "targetMinutes": 15,
  "streak": 0,
  "createdAt": "2026-09-19T09:20:00Z"
}
```

#### `PATCH /habits/{id}`
- **Purpose**: Mark habit done for a specific date or edit configuration.
- **Request**:
```json
{
  "date": "2026-09-19",
  "completed": true
}
```
- **Response**:
```json
{
  "id": "habit-01",
  "completedToday": true,
  "streak": 1,
  "lastCompletedDate": "2026-09-19"
}
```

---

### 6. AI Agent & Replanning

#### `POST /agent`
- **Purpose**: Chat with or trigger actions from the StayOn AI Assistant.
- **Request**:
```json
{
  "message": "What should I focus on this afternoon?"
}
```
- **Response**:
```json
{
  "reply": "You have 2 pending tasks under 'Master AWS Cloud Solutions'. I suggest spending 45 minutes on the S3 Whitepaper.",
  "suggestedActions": [
    {
      "type": "start_task",
      "taskId": "task-501",
      "label": "Start S3 Whitepaper Task"
    }
  ]
}
```

#### `POST /replan`
- **Purpose**: Request an AI-generated replanning schedule when student falls behind or wants optimization.
- **Request**:
```json
{
  "reason": "Fell behind on 3 tasks due to midterm exams"
}
```
- **Response**:
```json
{
  "planId": "replan-901",
  "summary": "Shifted 3 overdue tasks into available slots over the upcoming weekend.",
  "changes": [
    {
      "taskId": "task-501",
      "currentDate": "2026-09-18",
      "proposedDate": "2026-09-20"
    }
  ],
  "requiresUserConfirmation": true
}
```
- **Important Fields**: `requiresUserConfirmation: true` enforces the architecture rule "Bedrock suggests, backend validates, user confirms".
