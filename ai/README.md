# StayOn AI — AI Layer (Person 1 / Tech Lead)

This directory contains the core reasoning, extraction, goal generation, task generation, and adaptive replanning layer for **StayOn AI**, powered by **Amazon Bedrock**.

---

## Architecture & Principles

1. **"Bedrock suggests, backend validates, student confirms."**
   - The AI layer NEVER writes directly to Amazon DynamoDB or S3.
   - All mutations pass through typed tool interfaces (`ai/agent/tools.py`) designed to interface with Person 4's backend / API Gateway / Lambda services.
   - High-impact changes (such as rescheduling tasks or applying a replan) strictly enforce `requiresUserConfirmation: true`.
2. **Zero Fabrication**:
   - The extraction and planning models are prompted and schema-validated to never fabricate missing dates, deadlines, or prerequisites.
   - If a deadline is not in the source syllabus, it defaults to an empty string `""` or `null`.

---

## Directory Structure

```
ai/
├── prompts/                    # Carefully engineered prompt templates
│   ├── document_extraction.txt # Extraction instructions for syllabi & rubrics
│   ├── goal_generation.txt     # Synthesizing goals from extracted documents
│   ├── task_generation.txt     # Decomposing goals into actionable tasks
│   └── replanning.txt          # Adaptive rescheduling with mandatory confirmation
│
├── schemas/                    # JSON Schemas enforcing strict structured output
│   ├── document_extraction.json
│   ├── goal.json
│   ├── task_generation.json
│   └── replan.json
│
├── extraction/                 # Document understanding pipeline
│   ├── __init__.py
│   └── bedrock_extractor.py    # Calls Bedrock Converse API & validates against schema
│
├── planning/                   # Academic breakdown & scheduling
│   ├── __init__.py
│   ├── goal_generator.py       # Converts extraction to student goal
│   ├── task_generator.py       # Converts goal to task hierarchy
│   └── replan_generator.py     # Generates rescheduling proposals
│
├── agent/                      # Student companion reasoning layer
│   ├── __init__.py
│   ├── agent.py                # Handles student conversational queries & intent routing
│   └── tools.py                # Controlled action tools connecting to backend
│
├── tests/                      # Comprehensive test suite (44 tests, 100% offline-ready)
│   ├── __init__.py
│   ├── test_extraction.py
│   ├── test_goal_generation.py
│   ├── test_task_generation.py
│   └── test_replanning.py
│
├── client.py                   # Bedrock Converse API client & MockBedrockClient adapter
├── requirements.txt            # Python dependencies
└── README.md                   # This documentation
```

---

## Amazon Bedrock Model Configuration

- **Foundation Model**: `amazon.nova-2-lite-v1:0`
- **Region**: `ap-south-1` (AWS Asia Pacific Mumbai)
- **API**: Bedrock Runtime **Converse API** (`converse`)
- **AWS Profile**: `stayon` (or standard environment variables / IAM roles)

---

## Offline Testing & Mock Mode

Because account verification can take time or developers may work locally without active AWS credentials, the entire AI layer includes built-in dependency injection:

```python
from ai.client import MockBedrockClient
from ai.extraction import BedrockDocumentExtractor

# 1. Instantiate with mock client
mock_client = MockBedrockClient(default_response_text='{"title": "CS 101", ...}')
extractor = BedrockDocumentExtractor(client=mock_client)

# 2. Extract without making live network calls
result = extractor.extract("Course syllabus text...")
```

### Running Tests Locally

```bash
# Run the complete test suite
pytest -q
```

All 44 tests run completely offline with 0 network calls in < 0.1s.

---

## Pipeline & Data Flow

### PDF / Document Ingestion Flow

```
PDF bytes / file (e.g. from S3)
             │
             ▼
[BedrockDocumentExtractor.extract_document]
             │
             ▼  Converse Message with Document Content Block:
             │  {"document": {"format": "pdf", "name": "syllabus", "source": {"bytes": b"..."}}}
             │
             ▼
Amazon Bedrock Converse API (amazon.nova-2-lite-v1:0)
             │
             ▼  Raw JSON output
             │
             ▼
JSON Schema Validation (schemas/document_extraction.json)
             │
             ▼
DocumentExtractionResult (title, deadline, requirements, action_items)
             │
             ▼
[GoalGenerator.generate_goal]
             │
             ▼
[TaskGenerator.generate_tasks]
             │
             ▼
[StayOnAgent & ReplanGenerator] (requiresUserConfirmation = True)
```

---

## Python Extraction APIs

`BedrockDocumentExtractor` provides two input methods:

### 1. Native PDF / Document Bytes (`extract_document`) — *Primary*
Directly submits PDF bytes to Amazon Bedrock Converse using native document content blocks:

```python
from ai.extraction import BedrockDocumentExtractor

extractor = BedrockDocumentExtractor()

# Read PDF bytes (e.g., downloaded from S3)
with open("syllabus.pdf", "rb") as f:
    pdf_bytes = f.read()

# Direct Bedrock Converse document extraction
result = extractor.extract_document(
    document_bytes=pdf_bytes,
    file_name="syllabus.pdf",
    file_type="application/pdf",
)

print(result.title)
print(result.deadline)
print(result.requirements)
print(result.action_items)
```

### 2. Raw Text Extraction (`extract`) — *Fallback / Text-based*
Extracts structured information from pre-extracted text strings:

```python
result = extractor.extract(document_text="Course: CS 480...")
```

---

## Live Bedrock Readiness
- The Bedrock client uses the standard `boto3` Bedrock Runtime Converse API (`amazon.nova-2-lite-v1:0` in `ap-south-1`).
- Document content blocks use the exact AWS format:
  `{"document": {"format": "pdf", "name": clean_name, "source": {"bytes": document_bytes}}}`
- **Zero code changes** will be required once AWS account verification completes. Live calls will automatically succeed using the developer's AWS profile (`stayon`).

---

## Integration Points

### With Person 4 (Backend Teammate)
- **Lambda Handlers**:
  - `POST /documents`:
    When Person 4's Lambda processes an S3 upload, Lambda reads document bytes from S3 and calls:
    ```python
    from ai.extraction import BedrockDocumentExtractor

    extractor = BedrockDocumentExtractor()
    extraction = extractor.extract_document(
        document_bytes=s3_object_bytes,
        file_name=event["fileName"],
        file_type="application/pdf",
    )
    # Store extraction.to_dict() in DynamoDB DOC#<id> record
    ```
  - `POST /goals`: When auto-generating a goal from a document, invoke `GoalGenerator.generate_goal(extraction, document_id)`.
  - `POST /tasks`: When breaking down a goal into tasks, invoke `TaskGenerator.generate_tasks(goal, extraction)`.
  - `POST /agent`: Direct route to `StayOnAgent.handle_message(body["message"])`.
  - `POST /replan`: Invoke `ReplanGenerator.generate_replan(...)`.
- **Action Tools Protocol**:
  - `ai/agent/tools.py` provides `TaskBackendProtocol`.
  - Person 4 connects this protocol to real DynamoDB CRUD operations and API Gateway Lambda handlers.

### With Person 2 & 3 (Frontend Teammates)
- **Document Extraction Display (Person 2)**:
  - Consumes `DocumentExtractionResult` fields: `title`, `deadline`, `requirements`, `action_items`.
- **Goal Tree & Scheduling UI (Person 3)**:
  - Consumes `GeneratedTaskList` fields (`tasks[].title`, `tasks[].estimatedMinutes`, `tasks[].scheduledDate`).
- **Agent Chat & Confirmation Modal (Person 3)**:
  - Consumes `AgentResponse` (`reply`, `suggestedActions`).
  - When `requiresConfirmation: true`, displays a confirmation modal with proposed schedule adjustments (`pendingPlan.changes`).
