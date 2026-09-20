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


def test_valid_goal_generation_gemini():
    """Verify clean goal generation using mock Gemini client."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_GOAL_PAYLOAD))
    generator = GoalGenerator(client=mock_client)

    goal = generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")

    assert isinstance(goal, GeneratedGoal)
    assert goal.title == "Complete CS 480 Cloud Computing Project"
    assert goal.deadline == "2026-11-15"
    assert goal.documentId == "doc-101"
    assert len(mock_client.call_history) == 1


def test_goal_generation_gemini_config_uses_response_json_schema():
    """Verify Gemini goal generation uses response_json_schema and avoids response_schema."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_GOAL_PAYLOAD))
    generator = GoalGenerator(provider="gemini", client=mock_client)

    generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")

    assert len(mock_client.call_history) == 1
    config = mock_client.call_history[0]["config"]
    assert config.response_schema is None, "response_schema must be None to prevent 400 additional_properties error"
    assert config.response_json_schema is not None, "response_json_schema must be used"
    assert config.response_mime_type == "application/json"
    assert config.response_json_schema["additionalProperties"] is False
    assert "$schema" not in config.response_json_schema


def test_goal_generation_gemini_schema_validation():
    """Verify Gemini goal schema violation raises GoalSchemaError via application validation."""
    from ai.providers.gemini_client import MockGeminiClient

    invalid_payload = {
        "title": "Incomplete Goal",
        # missing description, deadline, documentId
    }
    mock_client = MockGeminiClient(default_response_text=json.dumps(invalid_payload))
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalSchemaError, match="'description' is a required property"):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_gemini_malformed_json():
    """Verify malformed JSON from Gemini raises GoalParseError."""
    from ai.providers.gemini_client import MockGeminiClient

    mock_client = MockGeminiClient(default_response_text="not a valid json string")
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalParseError):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generation_gemini_api_error():
    """Verify Gemini API error is wrapped in GoalGenerationError."""
    from ai.providers.gemini_client import GeminiError, MockGeminiClient

    mock_client = MockGeminiClient()
    mock_client.queue_response(GeminiError("Gemini quota exceeded"))
    generator = GoalGenerator(client=mock_client)

    with pytest.raises(GoalGenerationError, match="Gemini quota exceeded"):
        generator.generate_goal(SAMPLE_EXTRACTION, document_id="doc-101")


def test_goal_generator_provider_selection(monkeypatch):
    """Verify provider selection between Bedrock and Gemini."""
    from ai.planning import get_goal_generator
    from ai.providers.gemini_client import MockGeminiClient
    from ai.providers.text_generation import BedrockTextProvider, GeminiTextProvider

    # 1. Default without env is Bedrock
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    gen_default = GoalGenerator(client=MockBedrockClient())
    assert isinstance(gen_default.provider, BedrockTextProvider)

    # 2. AI_PROVIDER=gemini uses GeminiTextProvider
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    mock_gemini = MockGeminiClient()
    gen_gemini = GoalGenerator(client=mock_gemini)
    assert isinstance(gen_gemini.provider, GeminiTextProvider)

    # 3. Explicit provider override
    gen_explicit = get_goal_generator(provider="gemini", client=mock_gemini)
    assert isinstance(gen_explicit.provider, GeminiTextProvider)

    # 4. Unsupported provider raises ValueError
    with pytest.raises(ValueError, match="Unsupported AI_PROVIDER 'unknown'"):
        GoalGenerator(provider="unknown")

