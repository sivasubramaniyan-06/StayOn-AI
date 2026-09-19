"""Unit tests for Goal Generator."""

import json
import pytest

from ai.client import BedrockConverseError, MockBedrockClient
from ai.extraction.bedrock_extractor import DocumentExtractionResult
from ai.planning.goal_generator import (
    GeneratedGoal,
    GoalGenerationError,
    GoalGenerator,
    GoalParseError,
    GoalSchemaError,
)

SAMPLE_EXTRACTION = DocumentExtractionResult(
    title="CS 480 Cloud Computing Project",
    deadline="2026-11-15",
    eligibility=["CS juniors and seniors"],
    requirements=["Build microservice", "Write 5-page report"],
    important_information=["Late penalty 10%"],
    action_items=["Form team", "Submit proposal", "Deploy", "Submit final"]
)

VALID_GOAL_PAYLOAD = {
    "title": "Complete CS 480 Cloud Computing Project",
    "description": "Design and build a distributed microservice on AWS, prepare the 5-page architecture report, and submit code with 80% test coverage.",
    "deadline": "2026-11-15",
    "documentId": "doc-101"
}


def test_valid_goal_generation():
    """Verify clean goal generation using mock Bedrock response."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_GOAL_PAYLOAD))
    generator = GoalGenerator(client=mock_client)

    goal = generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")

    assert isinstance(goal, GeneratedGoal)
    assert goal.title == "Complete CS 480 Cloud Computing Project"
    assert goal.deadline == "2026-11-15"
    assert goal.documentId == "doc-101"
    assert "distributed microservice" in goal.description

    # Test dictionary export
    d = goal.to_dict()
    assert d["documentId"] == "doc-101"
    assert d["title"] == goal.title


def test_goal_generation_from_dict():
    """Verify generator accepts standard dictionary input."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_GOAL_PAYLOAD))
    generator = GoalGenerator(client=mock_client)

    goal = generator.generate_goal(SAMPLE_EXTRACTION.to_dict(), document_id="doc-101")
    assert goal.documentId == "doc-101"


def test_goal_generation_empty_deadline():
    """Verify that when extraction has no deadline, goal has empty string deadline."""
    payload_no_deadline = dict(VALID_GOAL_PAYLOAD)
    payload_no_deadline["deadline"] = ""

    mock_client = MockBedrockClient(default_response_text=json.dumps(payload_no_deadline))
    generator = GoalGenerator(client=mock_client)

    no_deadline_extraction = DocumentExtractionResult(
        title="General Reading List",
        deadline="",
        eligibility=[],
        requirements=[],
        important_information=[],
        action_items=["Read chapters 1-3"]
    )
    goal = generator.generate_goal(no_deadline_extraction, document_id="doc-202")
    assert goal.deadline == ""
    assert goal.documentId == "doc-202"


def test_goal_generation_empty_document_id():
    """Verify empty document_id raises ValueError."""
    mock_client = MockBedrockClient()
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(ValueError, match="document_id must not be empty"):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="   ")


def test_goal_generation_malformed_json():
    """Verify malformed model response raises GoalParseError."""
    mock_client = MockBedrockClient(default_response_text="Not valid json")
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalParseError):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_schema_violation():
    """Verify missing required fields raises GoalSchemaError."""
    invalid_payload = {
        "title": "Some Goal",
        # missing description, deadline, documentId
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_payload))
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalSchemaError):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_bedrock_error():
    """Verify Bedrock exception is wrapped in GoalGenerationError."""
    mock_client = MockBedrockClient()
    mock_client.queue_response(BedrockConverseError("AccessDeniedException"))
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalGenerationError, match="AccessDeniedException"):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_empty_model_response_raises_parse_error():
    """Verify empty model response string raises GoalParseError."""
    mock_client = MockBedrockClient(default_response_text="")
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalParseError):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_empty_title_raises_schema_error():
    """Verify empty string title violates minLength schema requirement."""
    invalid_payload = {
        "title": "",
        "description": "Valid description",
        "deadline": "",
        "documentId": "doc-101"
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_payload))
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalSchemaError):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")
