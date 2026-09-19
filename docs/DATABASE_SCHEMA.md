# StayOn AI — Database Schema (Amazon DynamoDB)

## Design Overview

StayOn AI utilizes a simple single-table Amazon DynamoDB design optimized for student-centric workloads. All entity records are partitioned by `userId`, ensuring complete tenant isolation, swift lookups, and minimal infrastructure overhead.

> **CRITICAL GUIDELINE**: Keep the database design simple. Do NOT introduce vector databases, graph databases, complex RAG infrastructures, or multi-table architectures at this stage.

---

## Primary Keys & Conceptual Records

The single table uses:
- **Partition Key (`PK`)**: `String`
- **Sort Key (`SK`)**: `String`

### Conceptual Entity Records

| Entity | PK Format | SK Format | Attributes & Descriptions |
| :--- | :--- | :--- | :--- |
| **User Profile** | `USER#<userId>` | `PROFILE` | `userId`, `email`, `fullName`, `timezone`, `createdAt`, `updatedAt` |
| **Document** | `USER#<userId>` | `DOC#<documentId>` | `documentId`, `fileName`, `s3Key`, `fileType`, `status`, `summary`, `createdAt` |
| **Goal** | `USER#<userId>` | `GOAL#<goalId>` | `goalId`, `documentId` (optional link), `title`, `description`, `deadline`, `status`, `createdAt` |
| **Task** | `USER#<userId>` | `TASK#<taskId>` | `taskId`, `goalId`, `parentId` (for subtasks), `title`, `scheduledDate`, `estimatedMinutes`, `status`, `completedAt` |
| **Habit** | `USER#<userId>` | `HABIT#<habitId>` | `habitId`, `title`, `frequency` (`daily`), `targetMinutes`, `currentStreak`, `createdAt` |
| **Habit Log** | `USER#<userId>` | `HABITLOG#<date>#<habitId>` | `date` (`YYYY-MM-DD`), `habitId`, `completed` (`Boolean`), `completedAt` |

---

## Entity Relationships

```
Document (DOC#<docId>)
   └── (Source for) ──▶ Goal (GOAL#<goalId>)
                          └── (Composed of) ──▶ Tasks (TASK#<taskId>)
                                                  ├── Schedule (scheduledDate)
                                                  └── Completion (status: completed)

Habit (HABIT#<habitId>)
   └── (Tracks daily progress via) ──▶ Habit Log (HABITLOG#<date>#<habitId>)
```

### Key Relationships Explained:
1. **Document → Goal**: A student uploads a syllabus or assignment document (`DOC#<id>`), from which Bedrock extracts structured milestones and creates one or more Goals (`GOAL#<id>`).
2. **Goal → Tasks**: Each Goal contains multiple granular tasks (`TASK#<id>`). Tasks can optionally reference a `parentId` to form a 2-level hierarchy / task tree.
3. **Task → Schedule**: Each task has a `scheduledDate` allowing quick querying of today's work and upcoming schedules.
4. **Task → Completion**: Task status transitions (`pending` → `in_progress` → `completed`), tracking completion timestamps for analytics.
5. **Habit → Habit Logs**: Daily habit consistency is tracked using daily log items (`HABITLOG#<date>#<habitId>`) to calculate and maintain streaks without race conditions.
