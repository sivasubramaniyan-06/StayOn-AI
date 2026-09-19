# StayOn Team Git Rules

1. `main` is the stable branch.
2. Nobody directly pushes to `main`.
3. Every developer works on their own feature branch.
4. Pull latest `main` before starting work.
5. Make small logical commits.
6. Push work regularly.
7. Create a Pull Request before merging.
8. At least one teammate reviews the PR.
9. Do not silently change API contracts.
10. Do not silently change database schema.
11. If a change affects another developer, communicate it.
12. Keep `main` runnable.
13. Do not commit secrets.
14. Never commit AWS access keys, passwords, tokens, .env files, or credentials.
15. Use environment variables for secrets.
16. Use mock data when waiting for another developer's API.
17. Do not block another developer unnecessarily.
18. Keep commits focused and descriptive.

---

## Team Structure & Branch Responsibilities

| Developer | Branch | Core Responsibilities |
| :--- | :--- | :--- |
| **Person 1**<br>*(Tech Lead)* | `feature/person-1-aws-ai` | AWS architecture, Bedrock, Bedrock document extraction, AI prompts, Bedrock Agent, AI task generation, AI replanning, AWS integration, final integration/deployment. |
| **Person 4**<br>*(Backend)* | `feature/person-4-backend` | Cognito, API Gateway, Lambda, DynamoDB, S3 backend/storage, CRUD APIs, backend validation, authentication/backend security, API implementation. |
| **Person 2**<br>*(Frontend)* | `feature/person-2-knowledge` | Main frontend, Knowledge, PDF upload UI, Document UI, Goal UI, Dashboard. |
| **Person 3**<br>*(Frontend)* | `feature/person-3-execution` | Goal Tree, Tasks, Scheduling UI, Completion, Progress, Habits, Agent UI, Replanning UI. |

---

## Recommended Commit Format

Use conventional commit prefixes:
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes only
- `chore:` Changes to build process, auxiliary tools, or setup
- `refactor:` Code change that neither fixes a bug nor adds a feature

### Examples:
- `feat: add knowledge page`
- `feat: add document upload API`
- `fix: correct task status update`
- `docs: update API contract`
- `chore: initialize project structure`
