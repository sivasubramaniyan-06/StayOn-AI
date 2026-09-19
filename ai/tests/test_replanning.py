"""Unit tests for Replanning Generator, Agent Tools, and StayOnAgent."""

import json
import pytest

from ai.agent.agent import AgentResponse, StayOnAgent
from ai.agent.tools import AgentTools, InMemoryTaskBackend
from ai.client import BedrockConverseError, MockBedrockClient
from ai.planning.replan_generator import (
    GeneratedReplan,
    ReplanError,
    ReplanGenerator,
    ReplanParseError,
    ReplanSchemaError,
)

SAMPLE_REPLAN_PAYLOAD = {
    "planId": "replan-901",
    "summary": "Shifted 2 overdue tasks to upcoming available study slots on Saturday and Sunday.",
    "changes": [
        {
            "taskId": "task-501",
            "currentDate": "2026-09-18",
            "proposedDate": "2026-09-20",
            "reason": "Overdue by 2 days"
        },
        {
            "taskId": "task-502",
            "currentDate": "2026-09-19",
            "proposedDate": "2026-09-21",
            "reason": "Balance weekend workload"
        }
    ],
    "requiresUserConfirmation": True
}


# ==========================================
# 1. REPLANNING GENERATOR TESTS
# ==========================================

def test_valid_replan_generation():
    """Verify clean replan generation adhering to schema."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(SAMPLE_REPLAN_PAYLOAD))
    generator = ReplanGenerator(client=mock_client)

    result = generator.generate_replan(
        current_tasks=[{"id": "task-501"}],
        pending_tasks=[{"id": "task-501"}, {"id": "task-502"}],
        missed_tasks=[{"id": "task-501"}],
        deadline="2026-09-30",
        reason="Fell behind due to midterms",
        plan_id="replan-901",
    )

    assert isinstance(result, GeneratedReplan)
    assert result.planId == "replan-901"
    assert len(result.changes) == 2
    assert result.changes[0].taskId == "task-501"
    assert result.changes[0].proposedDate == "2026-09-20"
    # Non-negotiable architectural invariant:
    assert result.requiresUserConfirmation is True

    # Test dictionary serialization matches API_CONTRACT
    d = result.to_dict()
    assert d["requiresUserConfirmation"] is True
    assert d["planId"] == "replan-901"


def test_replan_enforces_user_confirmation():
    """Verify that even if model returns false, requiresUserConfirmation is forced to True."""
    tampered_payload = dict(SAMPLE_REPLAN_PAYLOAD)
    tampered_payload["requiresUserConfirmation"] = False  # Try to bypass confirmation

    mock_client = MockBedrockClient(default_response_text=json.dumps(tampered_payload))
    generator = ReplanGenerator(client=mock_client)

    result = generator.generate_replan(
        current_tasks=[],
        pending_tasks=[],
        missed_tasks=[],
        plan_id="replan-901"
    )
    assert result.requiresUserConfirmation is True
    assert result.to_dict()["requiresUserConfirmation"] is True


def test_replan_malformed_json():
    """Verify malformed JSON raises ReplanParseError."""
    mock_client = MockBedrockClient(default_response_text="invalid json")
    generator = ReplanGenerator(client=mock_client)

    with pytest.raises(ReplanParseError):
        generator.generate_replan([], [], [])


def test_replan_schema_violation():
    """Verify missing required fields raises ReplanSchemaError."""
    invalid_payload = {
        "planId": "replan-901",
        # missing summary, changes
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_payload))
    generator = ReplanGenerator(client=mock_client)

    with pytest.raises(ReplanSchemaError):
        generator.generate_replan([], [], [])


def test_replan_bedrock_error():
    """Verify Bedrock exception is wrapped in ReplanError."""
    mock_client = MockBedrockClient()
    mock_client.queue_response(BedrockConverseError("ResourceNotFoundException"))
    generator = ReplanGenerator(client=mock_client)

    with pytest.raises(ReplanError, match="ResourceNotFoundException"):
        generator.generate_replan([], [], [])


# ==========================================
# 2. AGENT TOOLS TESTS
# ==========================================

def test_agent_tools_get_today_tasks():
    """Verify get_today_tasks returns only scheduled pending tasks."""
    backend = InMemoryTaskBackend()
    tools = AgentTools(backend=backend)

    today_tasks = tools.get_today_tasks()
    assert len(today_tasks) >= 1
    for t in today_tasks:
        assert t["status"] != "completed"


def test_agent_tools_get_pending_tasks():
    """Verify get_pending_tasks returns uncompleted tasks."""
    backend = InMemoryTaskBackend()
    tools = AgentTools(backend=backend)

    pending = tools.get_pending_tasks()
    assert all(t["status"] == "pending" for t in pending)


def test_agent_tools_create_tasks():
    """Verify create_tasks adds tasks via backend."""
    backend = InMemoryTaskBackend()
    tools = AgentTools(backend=backend)

    new_tasks = tools.create_tasks([{"title": "Test Task 1"}, {"title": "Test Task 2"}])
    assert len(new_tasks) == 2
    assert new_tasks[0]["id"].startswith("task-")


def test_agent_tools_replan_requires_confirmation():
    """Verify replan_tasks refuses to mutate schedule without confirmed=True."""
    backend = InMemoryTaskBackend()
    tools = AgentTools(backend=backend)

    replan_payload = {
        "planId": "replan-001",
        "changes": [
            {"taskId": "task-501", "proposedDate": "2026-09-25"}
        ]
    }

    # Attempt to apply without confirmation
    res_unconfirmed = tools.replan_tasks(replan_payload, confirmed=False)
    assert res_unconfirmed["status"] == "requires_user_confirmation"

    # Task 501 date should NOT have changed
    t501 = next(t for t in backend.tasks if t["id"] == "task-501")
    assert t501["scheduledDate"] != "2026-09-25"

    # Now apply with confirmed=True
    res_confirmed = tools.replan_tasks(replan_payload, confirmed=True)
    assert res_confirmed["status"] == "applied"
    assert t501["scheduledDate"] == "2026-09-25"


# ==========================================
# 3. STAYON AGENT REASONING TESTS
# ==========================================

def test_agent_handles_today_query():
    """Verify Agent answers 'What should I do today?' with scheduled tasks and action."""
    mock_client = MockBedrockClient()
    agent = StayOnAgent(client=mock_client)

    response = agent.handle_message("What should I do today?")
    assert isinstance(response, AgentResponse)
    assert "task(s) scheduled for today" in response.reply
    assert len(response.suggestedActions) > 0
    assert response.suggestedActions[0]["type"] == "start_task"


def test_agent_handles_pending_query():
    """Verify Agent answers 'What tasks are pending?' with summary and actions."""
    mock_client = MockBedrockClient()
    agent = StayOnAgent(client=mock_client)

    response = agent.handle_message("What tasks are pending?")
    assert isinstance(response, AgentResponse)
    assert "pending task(s)" in response.reply
    assert any(a["type"] == "start_task" for a in response.suggestedActions)


def test_agent_handles_missed_and_replan_query():
    """Verify Agent detects missed work, prepares a replan, and sets confirmation required."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(SAMPLE_REPLAN_PAYLOAD))
    generator = ReplanGenerator(client=mock_client)
    agent = StayOnAgent(client=mock_client, replan_generator=generator)

    response = agent.handle_message("I missed yesterday's tasks, can you help me replan?")
    assert isinstance(response, AgentResponse)
    assert response.requiresConfirmation is True
    assert response.pendingPlan is not None
    assert response.pendingPlan["planId"] == "replan-901"
    assert any(a["type"] == "confirm_replan" for a in response.suggestedActions)


def test_agent_empty_message_raises_value_error():
    """Verify empty message from student raises ValueError."""
    agent = StayOnAgent(client=MockBedrockClient())
    with pytest.raises(ValueError, match="cannot be empty"):
        agent.handle_message("   ")


def test_agent_conversational_fallback():
    """Verify general questions receive a polite guidance answer."""
    mock_client = MockBedrockClient(default_response_text="Sure! I can help you structure your week.")
    agent = StayOnAgent(client=mock_client)

    response = agent.handle_message("Can you give me study advice?")
    assert isinstance(response, AgentResponse)
    assert "Sure!" in response.reply
    assert len(response.suggestedActions) > 0


def test_agent_handles_early_completion_read_only():
    """Verify Agent handles 'I finished my assignment early' as a read-only query without confirmation."""
    mock_client = MockBedrockClient()
    agent = StayOnAgent(client=mock_client)

    response = agent.handle_message("I finished my assignment early.")
    assert isinstance(response, AgentResponse)
    assert "finishing early" in response.reply.lower()
    assert response.requiresConfirmation is False
    assert all(a.get("requiresUserConfirmation") is False for a in response.suggestedActions)


def test_agent_handles_create_task_mutation_requires_confirmation():
    """Verify Agent handles 'Can you add revision for chapter 3?' as mutation requiring confirmation."""
    mock_client = MockBedrockClient()
    agent = StayOnAgent(client=mock_client)

    response = agent.handle_message("Can you add revision for chapter 3?")
    assert isinstance(response, AgentResponse)
    assert response.requiresConfirmation is True
    assert len(response.suggestedActions) == 1
    action = response.suggestedActions[0]
    assert action["type"] == "create_tasks"
    assert action["requiresUserConfirmation"] is True
    assert "Revision for chapter 3" in action["tasks"][0]["title"]


def test_agent_mutation_move_tasks_requires_confirmation():
    """Verify Agent handles 'Move all my tasks to tomorrow' as replan mutation requiring confirmation."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(SAMPLE_REPLAN_PAYLOAD))
    generator = ReplanGenerator(client=mock_client)
    agent = StayOnAgent(client=mock_client, replan_generator=generator)

    response = agent.handle_message("Move all my tasks to tomorrow.")
    assert isinstance(response, AgentResponse)
    assert response.requiresConfirmation is True
    assert any(a["type"] == "replan" and a["requiresUserConfirmation"] is True for a in response.suggestedActions)


def test_replan_empty_model_response_raises_error():
    """Verify empty model response string raises ReplanParseError."""
    mock_client = MockBedrockClient(default_response_text="")
    generator = ReplanGenerator(client=mock_client)

    with pytest.raises(ReplanParseError):
        generator.generate_replan([], [], [])
