# StayOn AI — AI Layer (Person 1 / Tech Lead)

This directory contains the complete AI and reasoning subsystem for **StayOn AI**, powered by **Amazon Bedrock**.

---

## 1. AI Architecture & Core Principles

StayOn AI follows an AI-assisted, student-first workspace architecture:

```
PDF / Document Upload
        ↓
Document Understanding (Bedrock Converse document content block)
        ↓
Goal Generation (deterministic JSON schema validation)
        ↓
Task Generation (actionable student breakdown)
        ↓
Task Execution & Scheduling
        ↓
StayOn AI Agent (controlled reasoning & intent routing)
        ↓
Approved Action Tools (read vs mutation distinction)
        ↓
Adaptive Replanning (rescheduling proposals)
        ↓
User Confirmation (strict human-in-the-loop)
```

### Core Architecture Invariant
> **"Bedrock suggests. Backend validates. User confirms important changes."**

- **Zero Direct Database Access**: The AI layer **NEVER** interacts directly with DynamoDB, S3, Cognito, or internal AWS CRUD APIs.
- **Controlled Backend Tools**: All state mutations and reads pass through typed adapters (`ai/agent/tools.py`), adhering to `docs/API_CONTRACT.md`.
- **Human-in-the-Loop**: Any operation that mutates a student's plan or schedule strictly enforces `requiresUserConfirmation: true`.
- **Zero Fabrication**: Prompts and JSON schemas enforce that dates, prerequisites, and deadlines cannot be hallucinated. If a deadline is not present in the document, it defaults to `""` or `null`.

---

## 2. AI Provider & Environment Configuration

StayOn AI supports multiple AI providers for document extraction and reasoning. The default provider remains **Amazon Bedrock**, with **Google Gemini** available as a fully supported second provider via the modern `google-genai` SDK.

### Provider Selection (`AI_PROVIDER`)

| Provider Setting | Default | Description |
|---|---|---|
| `AI_PROVIDER=bedrock` | **Yes** | Uses Amazon Bedrock Converse API with `amazon.nova-2-lite-v1:0` in `ap-south-1`. |
| `AI_PROVIDER=gemini` | No | Uses Google Gemini API via official `google-genai` SDK with `gemini-3.8-flash`. |

### Environment Variables Matrix

| Variable | Default Value | Provider | Description |
|---|---|---|---|
| `AI_PROVIDER` | `bedrock` | Both | Selects active AI provider (`bedrock` or `gemini`) |
| `BEDROCK_MODEL_ID` | `amazon.nova-2-lite-v1:0` | Bedrock | Amazon Bedrock foundation model ID |
| `AWS_REGION` | `ap-south-1` | Bedrock | Primary AWS Region (Asia Pacific Mumbai) |
| `AWS_PROFILE` | `stayon` | Bedrock | AWS CLI / SSO credential profile |
| `RUN_LIVE_BEDROCK_TESTS` | `0` | Bedrock | Set to `1` to run live Bedrock tests via pytest |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini | Google Gemini model identifier |
| `GEMINI_API_KEY` | *(None)* | Gemini | Google Gemini API key (required only for live API calls) |

> [!WARNING]
> **SECURITY NOTICE: NEVER COMMIT API KEYS OR CREDENTIALS**
> - Never hardcode or commit `GEMINI_API_KEY`, AWS secrets, or credentials into repository files.
> - Store keys in local uncommitted environment files (see `.env.example`) or export them directly in your shell environment.
> - All standard unit tests run completely offline with mocked clients and require no API keys.

---

## 3. Directory Structure

```
ai/
├── prompts/                      # Version-controlled prompt templates
│   ├── document_extraction.txt   # Extraction instructions for syllabi & rubrics
│   ├── goal_generation.txt       # Goal synthesis from extraction
│   ├── task_generation.txt       # Decomposing goals into actionable tasks
│   └── replanning.txt            # Adaptive rescheduling with mandatory confirmation
│
├── schemas/                      # Strict JSON Schemas enforcing output formats
│   ├── document_extraction.json  # Validates extracted syllabus metadata
│   ├── goal.json                 # Validates student goal structures
│   ├── task_generation.json      # Validates task lists and minute estimates
│   └── replan.json               # Validates proposed plan changes
│
├── providers/                    # AI Provider client abstractions
│   ├── __init__.py
│   └── gemini_client.py          # Modern google-genai client & MockGeminiClient
│
├── extraction/                   # Document understanding pipeline
│   ├── __init__.py               # Provider factory get_document_extractor()
│   ├── bedrock_extractor.py      # Bedrock Converse PDF/text extractor
│   └── gemini_extractor.py       # Google Gemini native PDF/text extractor
│
├── planning/                     # Academic planning & breakdown
│   ├── __init__.py
│   ├── goal_generator.py         # Document -> Goal generator
│   ├── task_generator.py         # Goal -> Task list generator
│   └── replan_generator.py       # Context -> Rescheduling proposal generator
│
├── agent/                        # Conversational companion & reasoning
│   ├── __init__.py
│   ├── agent.py                  # Intent classification & action coordinator
│   └── tools.py                  # Approved tools & backend adapter protocol
│
├── tests/                        # Comprehensive test suite (70 passed, 2 skipped)
│   ├── __init__.py
│   ├── test_extraction.py        # Bedrock PDF bytes, text, & schema failure tests
│   ├── test_gemini_extraction.py # Gemini PDF bytes, text, schema, & mock tests
│   ├── test_goal_generation.py   # Goal creation & validation tests
│   ├── test_task_generation.py   # Task generation, hierarchy, & bounds tests
│   ├── test_replanning.py        # Replan, agent intents, & safety tests
│   ├── test_live_bedrock.py      # Opt-in live Bedrock integration test
│   └── test_live_gemini.py       # Opt-in live Gemini integration test
│
├── client.py                     # Bedrock Converse wrapper & MockBedrockClient
├── live_test.py                  # Standalone CLI for live Bedrock verification
├── requirements.txt              # Dependencies: boto3, google-genai, jsonschema, pytest
└── README.md                     # Comprehensive documentation
```

---

## 4. Subsystems Breakdown

### A. Document Understanding (`ai/extraction/`)
Extracts academic metadata from PDFs or text using Amazon Bedrock or Google Gemini.

1. **Bedrock Converse Extractor (`BedrockDocumentExtractor`)**:
   - Native PDF support via Converse document content blocks.
   - Zero hallucination prompt engineering.
   - Validation against `ai/schemas/document_extraction.json`.

2. **Google Gemini Extractor (`GeminiDocumentExtractor`)**:
   - Native PDF support via `types.Part.from_bytes(data=..., mime_type="application/pdf")`.
   - Structured JSON output via `GenerateContentConfig(response_mime_type="application/json", response_schema=...)`.
   - Reuses existing prompt template and `document_extraction.json` schema.
   - Raises provider-specific exceptions: `GeminiError`, `GeminiExtractionError`, `GeminiExtractionParseError`, `GeminiExtractionSchemaError`.

3. **Provider Factory (`get_document_extractor`)**:
   - Automatically instantiates the configured extractor based on `AI_PROVIDER` (defaults to Bedrock).
   ```python
   from ai.extraction import get_document_extractor

   # Uses Bedrock by default, or Gemini if AI_PROVIDER=gemini
   extractor = get_document_extractor()
   result = extractor.extract_document(pdf_bytes, "syllabus.pdf")
   ```

- **Text Support (`extract`)**: Accepts pre-extracted text strings.
- **Output Schema**: Conforms to `schemas/document_extraction.json` (`title`, `deadline`, `requirements`, `action_items`).

### B. Goal Generation (`ai/planning/goal_generator.py`)
Synthesizes high-level student goals from extracted document metadata.
- **Input**: `DocumentExtractionResult`, `documentId`.
- **Output Schema**: Conforms to `schemas/goal.json`:
  ```json
  {
    "title": "...",
    "description": "...",
    "deadline": "...",
    "documentId": "..."
  }
  ```
- Rejects empty strings, validates `documentId` preservation, and runs at low temperature (`0.1`) for determinism.

### C. Task Generation (`ai/planning/task_generator.py`)
Breaks a goal down into actionable student-sized tasks (30–120 min default range, 5–480 min bounded).
- **Input**: `goal` (dict or object), `goalId`, optional `documentInfo`, optional `deadline`.
- **Output Schema**: Conforms to `schemas/task_generation.json`:
  ```json
  {
    "goalId": "...",
    "tasks": [
      {
        "title": "...",
        "parentId": null,
        "estimatedMinutes": 45,
        "scheduledDate": null
      }
    ]
  }
  ```
- Supports hierarchical/nested subtasks via `parentId`.

### D. StayOn AI Agent (`ai/agent/agent.py`)
Processes conversational student requests, classifies intent, queries context, and generates structured responses.
- **Intent Handling**:
  - *"What should I work on today?"* -> Calls `get_today_tasks` (read-only, no confirmation needed).
  - *"What pending tasks do I have?"* -> Calls `get_pending_tasks` (read-only, no confirmation needed).
  - *"I finished early today"* -> Suggests optional early work or rest (read-only).
  - *"Can you add revision for chapter 3?"* -> Proposes `create_tasks` (requires confirmation).
  - *"I missed yesterday's study session / Move tasks to tomorrow"* -> Proposes `replan` (requires confirmation).

### E. Approved Agent Tools (`ai/agent/tools.py`)
Only 4 approved tools are exposed to the AI agent:
1. `get_today_tasks()`: Retrieves tasks scheduled for today.
2. `get_pending_tasks()`: Retrieves all uncompleted tasks across active goals.
3. `create_tasks(tasks)`: Generates proposed new tasks.
4. `replan_tasks(reason, affected_task_ids, shift_days)`: Proposes a schedule adjustment.

Each tool defines a strict JSON parameter schema in `TOOL_SCHEMAS`.

### F. Action Safety & User Confirmation
The agent strictly categorizes operations into:
- **READ Operations**: Directly handled without confirmation (`requiresUserConfirmation = False`).
- **MUTATING Operations**: Replan proposals or new task batches always return `requiresUserConfirmation = True` and populate `suggestedActions`:
  ```json
  {
    "reply": "I can reschedule your remaining tasks...",
    "suggestedActions": [
      {
        "type": "replan",
        "action": "replan",
        "requiresUserConfirmation": true,
        "requiresConfirmation": true,
        "parameters": { ... }
      }
    ]
  }
  ```

### G. Adaptive Replanning Engine (`ai/planning/replan_generator.py`)
Generates structured change proposals when schedules slip or life events occur.
- **Output Schema**: Conforms to `schemas/replan.json`:
  ```json
  {
    "planId": "replan-...",
    "summary": "...",
    "changes": [
      {
        "taskId": "...",
        "changeType": "reschedule",
        "fromDate": "2026-09-19",
        "toDate": "2026-09-20",
        "reason": "..."
      }
    ],
    "requiresUserConfirmation": true
  }
  ```

---

## 5. Offline Testing & Verification

The primary test suite requires **no AWS credentials**, **no Gemini API key**, and **no network access**.

```bash
# Run all tests offline (both Bedrock and Gemini test suites)
.venv/bin/pytest -q

# Run only Gemini extraction tests offline
.venv/bin/pytest -q ai/tests/test_gemini_extraction.py

# Run only Bedrock extraction tests offline
.venv/bin/pytest -q ai/tests/test_extraction.py
```

**Results**:
- **70 unit tests passing** across Bedrock extraction, Gemini extraction, goal generation, task breakdown, replanning, and agent safety.
- **2 tests cleanly skipped** (`test_live_bedrock.py` and `test_live_gemini.py`) when live credentials are not set.

### Key Test Scenarios Covered
1. Valid and malformed PDF/document extraction for both Bedrock and Gemini.
2. Gemini native PDF bytes handling, empty bytes rejection, and MIME validation.
3. Gemini response parsing, markdown code-fence stripping, and schema validation.
4. Provider factory switching between `bedrock` and `gemini`.
5. Valid and malformed goal generation (rejection of empty fields).
6. Valid and malformed task generation (minute bounds, parent-child links).
7. Read-only conversational agent queries (no confirmation required).
8. Mutating conversational requests (mandatory confirmation flag).
9. Replanning proposals with structured `changeType`, `fromDate`, and `toDate`.
10. Empty model responses, malformed JSON, and client exception wrapping.

---

## 6. Live Provider Diagnostics & Integration Tests

### Live Bedrock Diagnostic
To verify AWS Bedrock once AWS finishes account verification, run the standalone diagnostic tool:
```bash
python3 ai/live_test.py
```
To run the Bedrock live pytest:
```bash
RUN_LIVE_BEDROCK_TESTS=1 .venv/bin/pytest ai/tests/test_live_bedrock.py
```

### Live Gemini Integration Test
To run the live Gemini test against Google's API:
```bash
GEMINI_API_KEY="your-api-key-here" .venv/bin/pytest -q ai/tests/test_live_gemini.py
```
*Note: If `GEMINI_API_KEY` is not present, this test skips automatically without failing.*

---

## 7. Integration Points for Person 4 (Backend Teammate)

Person 4 implements the API Gateway and AWS Lambda CRUD handlers. The AI layer is designed as a drop-in dependency for these handlers:

### 1. Document Extraction Handler (`POST /documents`)
```python
from ai.extraction import get_document_extractor

def lambda_handler(event, context):
    s3_bytes = download_from_s3(event["s3Key"])
    # get_document_extractor respects AI_PROVIDER env var (bedrock or gemini)
    extractor = get_document_extractor()
    result = extractor.extract_document(
        document_bytes=s3_bytes,
        file_name=event["fileName"],
        file_type=event.get("fileType", "application/pdf")
    )
    # Save result.to_dict() into DynamoDB DOC#<id>
```

### 2. Goal Generation Handler (`POST /goals`)
```python
from ai.planning import GoalGenerator
from ai.extraction import DocumentExtractionResult

def lambda_handler(event, context):
    extraction = DocumentExtractionResult.from_dict(event["documentExtraction"])
    generator = GoalGenerator()
    goal = generator.generate_goal(extraction, document_id=event["documentId"])
    # Return goal.to_dict() conforming to POST /goals schema
```

### 3. Task Generation Handler (`POST /tasks`)
```python
from ai.planning import TaskGenerator

def lambda_handler(event, context):
    generator = TaskGenerator()
    task_list = generator.generate_tasks(
        goal=event["goal"],
        goal_id=event["goalId"],
        deadline=event.get("deadline")
    )
    # Persist tasks to DynamoDB TASK#<id> records
```

### 4. Agent Endpoint (`POST /agent`)
```python
from ai.agent import StayOnAgent
from ai.agent.tools import TaskBackendAdapter

def lambda_handler(event, context):
    # Person 4 connects TaskBackendAdapter to DynamoDB query functions
    adapter = TaskBackendAdapter(
        today_tasks_provider=fetch_today_tasks_from_dynamo,
        pending_tasks_provider=fetch_pending_tasks_from_dynamo,
    )
    agent = StayOnAgent(backend=adapter)
    response = agent.handle_message(event["message"])
    # Return response.to_dict() containing reply & suggestedActions
```

### 5. Replanning Endpoint (`POST /replan`)
```python
from ai.planning import ReplanGenerator

def lambda_handler(event, context):
    generator = ReplanGenerator()
    replan = generator.generate_replan(
        reason=event["reason"],
        current_tasks=event.get("currentTasks", []),
        goals=event.get("goals", [])
    )
    # Returns plan with requiresUserConfirmation = True
```
