# StayOn AI — DynamoDB Schema

## Table

The backend uses one DynamoDB table for StayOn AI application data.

The table name is provided through:

TABLE_NAME

## Primary Key

Partition Key:
PK

Sort Key:
SK

## Key Structure

| Entity | PK | SK |
|---|---|---|
| User Profile | USER#<userId> | PROFILE |
| Goal | USER#<userId> | GOAL#<goalId> |
| Task | USER#<userId> | TASK#<taskId> |
| Document | USER#<userId> | DOC#<documentId> |
| Habit | USER#<userId> | HABIT#<habitId> |
| Habit Log | USER#<userId> | HABITLOG#<habitId>#<date> |

## Access Patterns

### Get all goals for a user

PK = USER#<userId>

SK begins_with GOAL#

### Get all tasks for a user

PK = USER#<userId>

SK begins_with TASK#

### Get all documents for a user

PK = USER#<userId>

SK begins_with DOC#

### Get all habits for a user

PK = USER#<userId>

SK begins_with HABIT#

### Get all habit logs for a user

PK = USER#<userId>

SK begins_with HABITLOG#

### Get a specific entity

Use both PK and SK.

Example:

PK = USER#user123
SK = TASK#task456

## Ownership and Security

The authenticated Cognito user's `sub` is used as the user identity.

Backend services must derive:

USER#<authenticated-user-sub>

from the authenticated request.

The backend must not trust a client-provided `userId` for ownership.

A user must only be able to access records under their own partition key.

## Current Entities

- Profile
- Goal
- Task
- Document
- Habit
- Habit Log

## Notes

The actual DynamoDB table will be created through the team's agreed AWS infrastructure approach.

Do not create project resources using personal AWS credentials.