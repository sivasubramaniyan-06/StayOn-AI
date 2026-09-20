"""Unit tests for Task Generator."""

import json
import pytest

from ai.client import BedrockConverseError, MockBedrockClient
from ai.planning.goal_generator import GeneratedGoal
from ai.planning.task_generator import (
    GeneratedTaskItem,
    GeneratedTaskList,
    TaskGenerationError,
    TaskGenerator,
    TaskParseError,
    TaskSchemaError,
)

SAMPLE_GOAL = GeneratedGoal(
    title="Complete CS 480 Distributed Cloud Term Project",
    description="Design and build a distributed microservice on AWS.",
    deadline="2026-11-15",
    documentId="doc-101"
)

VALID_TASKS_PAYLOAD = {
    "goalId": "goal-001",
    "tasks": [
        {
            "title": "Set up AWS CDK / SAM template for Lambda functions",
            "parentId": None,
            "estimatedMinutes": 45,
            "scheduledDate": "2026-10-01"
        },
        {
            "title": "Design DynamoDB single-table primary keys",
            "parentId": None,
            "estimatedMinutes": 30,
            "scheduledDate": "2026-10-03"
        },
        {
            "title": "Implement POST /documents Lambda handler",
            "parentId": "Set up AWS CDK / SAM template for Lambda functions",
            "estimatedMinutes": 60,
            "scheduledDate": "2026-10-05"
        },
        {
            "title": "Write 5-page PDF architecture report",
            "parentId": None,
            "estimatedMinutes": 90,
            "scheduledDate": "2026-11-10"
        }
    ]
}


def test_valid_task_generation():
    """Verify clean task generation with mock response."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_TASKS_PAYLOAD))
    generator = TaskGenerator(client=mock_client)

    result = generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")

    assert isinstance(result, GeneratedTaskList)
    assert result.goalId == "goal-001"
    assert len(result.tasks) == 4

    first_task = result.tasks[0]
    assert isinstance(first_task, GeneratedTaskItem)
    assert first_task.title == "Set up AWS CDK / SAM template for Lambda functions"
    assert first_task.estimatedMinutes == 45
    assert first_task.parentId is None
    assert first_task.scheduledDate == "2026-10-01"

    subtask = result.tasks[2]
    assert subtask.parentId == "Set up AWS CDK / SAM template for Lambda functions"

    # Test dict export
    d = result.to_dict()
    assert d["goalId"] == "goal-001"
    assert len(d["tasks"]) == 4


def test_task_generation_from_dict():
    """Verify task generator accepts raw dict as goal input."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_TASKS_PAYLOAD))
    generator = TaskGenerator(client=mock_client)

    raw_goal = {
        "id": "goal-001",
        "title": "Learn AWS",
        "deadline": "2026-11-15",
    }
    result = generator.generate_tasks(raw_goal)
    assert result.goalId == "goal-001"
    assert len(result.tasks) == 4


def test_task_generation_invalid_input_type():
    """Verify passing invalid input raises TypeError."""
    mock_client = MockBedrockClient()
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TypeError, match="Expected GeneratedGoal or dict"):
        generator.generate_tasks("Not a goal")


def test_task_generation_malformed_json():
    """Verify malformed JSON raises TaskParseError."""
    mock_client = MockBedrockClient(default_response_text="not json")
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskParseError):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_schema_violation():
    """Verify tasks missing required fields raises TaskSchemaError."""
    invalid_payload = {
        "goalId": "goal-001",
        "tasks": [
            {
                "title": "Incomplete task"
                # missing parentId, estimatedMinutes, scheduledDate
            }
        ]
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_payload))
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskSchemaError):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_bedrock_error():
    """Verify Bedrock exception is wrapped in TaskGenerationError."""
    mock_client = MockBedrockClient()
    mock_client.queue_response(BedrockConverseError("ValidationException"))
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskGenerationError, match="ValidationException"):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_empty_model_response_raises_parse_error():
    """Verify empty model response string raises TaskParseError."""
    mock_client = MockBedrockClient(default_response_text="")
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskParseError):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_invalid_minutes_bounds_raises_schema_error():
    """Verify estimatedMinutes less than 5 minutes raises TaskSchemaError."""
    invalid_payload = {
        "goalId": "goal-001",
        "tasks": [
            {
                "title": "Quick task",
                "parentId": None,
                "estimatedMinutes": 2,  # minimum is 5
                "scheduledDate": None
            }
        ]
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_payload))
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskSchemaError):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_empty_goal_id_raises_value_error():
    """Verify empty goal_id raises ValueError."""
    mock_client = MockBedrockClient()
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(ValueError, match="goalId cannot be empty"):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="   ")


def test_valid_task_generation_gemini():
    """Verify clean task generation with mock Gemini client."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_TASKS_PAYLOAD))
    generator = TaskGenerator(client=mock_client)

    result = generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")

    assert isinstance(result, GeneratedTaskList)
    assert result.goalId == "goal-001"
    assert len(result.tasks) == 4
    assert isinstance(result.tasks[0], GeneratedTaskItem)
    assert result.tasks[0].title == "Set up AWS CDK / SAM template for Lambda functions"
    assert result.tasks[0].estimatedMinutes == 45
    assert len(mock_client.call_history) == 1


def test_task_generation_gemini_config_uses_response_json_schema():
    """Verify Gemini task generation config uses response_json_schema and avoids response_schema."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_TASKS_PAYLOAD))
    generator = TaskGenerator(provider="gemini", client=mock_client)

    generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")

    assert len(mock_client.call_history) == 1
    config = mock_client.call_history[0]["config"]
    assert config.response_schema is None, "response_schema must be None to prevent 400 additional_properties error"
    assert config.response_json_schema is not None, "response_json_schema must be used"
    assert config.response_mime_type == "application/json"
    assert config.response_json_schema["additionalProperties"] is False
    assert "$schema" not in config.response_json_schema


def test_task_generation_gemini_schema_validation():
    """Verify tasks violating schema constraints raise TaskSchemaError via application validation."""
    from ai.providers.gemini_client import MockGeminiClient

    invalid_payload = {
        "goalId": "goal-001",
        "tasks": [
            {
                "title": "Too fast",
                "parentId": None,
                "estimatedMinutes": 1,  # minimum is 5
                "scheduledDate": None
            }
        ]
    }
    mock_client = MockGeminiClient(default_response_text=json.dumps(invalid_payload))
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskSchemaError, match="less than the minimum of 5"):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_gemini_malformed_json():
    """Verify malformed JSON from Gemini raises TaskParseError."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text="invalid json content")
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskParseError):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generation_gemini_api_error():
    """Verify Gemini API error is wrapped in TaskGenerationError."""
    from ai.providers.gemini_client import GeminiError, MockGeminiClient

    mock_client = MockGeminiClient()
    mock_client.queue_response(GeminiError("Gemini unavailable"))
    generator = TaskGenerator(client=mock_client)

    with pytest.raises(TaskGenerationError, match="Gemini unavailable"):
        generator.generate_tasks(SAMPLE_GOAL, goal_id="goal-001")


def test_task_generator_provider_selection(monkeypatch):
    """Verify provider selection between Bedrock and Gemini for TaskGenerator."""
    from ai.planning import get_task_generator
    from ai.providers.gemini_client import MockGeminiClient
    from ai.providers.text_generation import BedrockTextProvider, GeminiTextProvider

    # 1. Default without env is Bedrock
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    gen_default = TaskGenerator(client=MockBedrockClient())
    assert isinstance(gen_default.provider, BedrockTextProvider)

    # 2. AI_PROVIDER=gemini uses GeminiTextProvider
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    mock_gemini = MockGeminiClient()
    gen_gemini = TaskGenerator(client=mock_gemini)
    assert isinstance(gen_gemini.provider, GeminiTextProvider)

    # 3. Explicit provider override
    gen_explicit = get_task_generator(provider="gemini", client=mock_gemini)
    assert isinstance(gen_explicit.provider, GeminiTextProvider)

    # 4. Unsupported provider raises ValueError
    with pytest.raises(ValueError, match="Unsupported AI_PROVIDER 'invalid_provider'"):
        TaskGenerator(provider="invalid_provider")

