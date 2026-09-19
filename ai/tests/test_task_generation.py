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
