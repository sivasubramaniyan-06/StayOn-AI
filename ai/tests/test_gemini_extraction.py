"""Unit tests for Gemini Document Extractor.

All tests in this module run strictly offline without requiring network access
or GEMINI_API_KEY.
"""

from __future__ import annotations

import json
import os
import pytest

from ai.extraction import (
    BedrockDocumentExtractor,
    DocumentExtractionResult,
    GeminiDocumentExtractor,
    GeminiError,
    GeminiExtractionError,
    GeminiExtractionParseError,
    GeminiExtractionSchemaError,
    get_document_extractor,
)
from ai.providers.gemini_client import (
    DEFAULT_GEMINI_MODEL,
    GeminiClient,
    MockGeminiClient,
    MockGeminiResponse,
)

SAMPLE_DOCUMENT_TEXT = """
Course: CS 590 - Advanced Machine Learning
Semester: Spring 2027
Term Project Due Date: 2027-04-30
Eligibility: Open to CS graduate students with CS 480 prerequisite.
Requirements:
1. Implement a transformer model from scratch.
2. Submit a 10-page research paper.
3. Deliver code repository with complete test suite.
Important Information:
Late submissions receive a 20% deduction per day.
Action Items:
- Form research team by February 1.
- Submit proposal by February 15.
- Submit draft paper by March 30.
- Submit final code and paper by April 30.
"""

VALID_EXTRACTION_DICT = {
    "title": "CS 590 - Advanced Machine Learning Term Project",
    "deadline": "2027-04-30",
    "eligibility": ["Open to CS graduate students with CS 480 prerequisite"],
    "requirements": [
        "Implement a transformer model from scratch",
        "Submit a 10-page research paper",
        "Deliver code repository with complete test suite",
    ],
    "important_information": [
        "Late submissions receive a 20% deduction per day",
    ],
    "action_items": [
        "Form research team by February 1",
        "Submit proposal by February 15",
        "Submit draft paper by March 30",
        "Submit final code and paper by April 30",
    ],
}

FAKE_PDF_BYTES = b"%PDF-1.5 fake pdf content for stayon ai gemini tests"


def test_gemini_successful_extraction_and_result_conversion():
    """Verify successful DocumentExtractionResult conversion from valid mocked response."""
    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = GeminiDocumentExtractor(client=mock_client)

    result = extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")

    assert isinstance(result, DocumentExtractionResult)
    assert result.title == "CS 590 - Advanced Machine Learning Term Project"
    assert result.deadline == "2027-04-30"
    assert len(result.eligibility) == 1
    assert len(result.requirements) == 3
    assert len(result.important_information) == 1
    assert len(result.action_items) == 4

    as_dict = result.to_dict()
    assert as_dict["title"] == "CS 590 - Advanced Machine Learning Term Project"
    assert as_dict["deadline"] == "2027-04-30"


def test_gemini_mocked_response_parsing():
    """Verify mocked Gemini response parsing with contents and config inspection."""
    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = GeminiDocumentExtractor(client=mock_client)

    result = extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")

    assert len(mock_client.call_history) == 1
    last_call = mock_client.call_history[0]

    # Verify model
    assert last_call["model"] == DEFAULT_GEMINI_MODEL

    # Verify contents structure (PDF part + prompt string)
    contents = last_call["contents"]
    assert isinstance(contents, list)
    assert len(contents) == 2

    pdf_part = contents[0]
    prompt_text = contents[1]

    # Native PDF part validation
    assert pdf_part.inline_data.mime_type == "application/pdf"
    assert pdf_part.inline_data.data == FAKE_PDF_BYTES
    assert "Please analyze the attached document." in prompt_text

    # Verify config uses response_json_schema rather than response_schema
    config = last_call["config"]
    assert config.response_mime_type == "application/json"
    assert config.temperature == 0.0
    assert config.response_schema is None
    assert config.response_json_schema is not None
    assert "$schema" not in config.response_json_schema
    assert config.response_json_schema["additionalProperties"] is False


def test_gemini_config_uses_response_json_schema_rather_than_response_schema():
    """Verify GenerateContentConfig sets response_json_schema and leaves response_schema as None."""
    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = GeminiDocumentExtractor(client=mock_client)

    # 1. Test native PDF extraction
    extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")
    pdf_cfg = mock_client.call_history[-1]["config"]
    assert pdf_cfg.response_schema is None, "response_schema must be None to avoid SDK 400 additional_properties error"
    assert pdf_cfg.response_json_schema is not None, "response_json_schema must be populated"
    assert pdf_cfg.response_mime_type == "application/json"
    assert pdf_cfg.response_json_schema["additionalProperties"] is False

    # 2. Test text extraction
    extractor.extract(SAMPLE_DOCUMENT_TEXT)
    text_cfg = mock_client.call_history[-1]["config"]
    assert text_cfg.response_schema is None, "response_schema must be None to avoid SDK 400 additional_properties error"
    assert text_cfg.response_json_schema is not None, "response_json_schema must be populated"
    assert text_cfg.response_mime_type == "application/json"
    assert text_cfg.response_json_schema["additionalProperties"] is False


def test_gemini_markdown_json_cleanup():
    """Verify markdown code fence wrappers (```json ... ```) are cleaned and parsed."""
    wrapped_json = f"```json\n{json.dumps(VALID_EXTRACTION_DICT, indent=2)}\n```"
    mock_client = MockGeminiClient(default_response_text=wrapped_json)
    extractor = GeminiDocumentExtractor(client=mock_client)

    result = extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")
    assert result.title == "CS 590 - Advanced Machine Learning Term Project"
    assert result.deadline == "2027-04-30"


def test_gemini_empty_pdf_bytes_rejected():
    """Verify empty document bytes raises ValueError."""
    mock_client = MockGeminiClient()
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="document_bytes cannot be empty"):
        extractor.extract_document(b"", "syllabus.pdf")

    assert len(mock_client.call_history) == 0


def test_gemini_non_bytes_rejected():
    """Verify passing string instead of bytes raises TypeError."""
    mock_client = MockGeminiClient()
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(TypeError, match="document_bytes must be bytes or bytearray"):
        extractor.extract_document("not bytes", "syllabus.pdf")  # type: ignore


def test_gemini_empty_filename_rejected():
    """Verify missing or whitespace filename raises ValueError."""
    mock_client = MockGeminiClient()
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="file_name cannot be empty"):
        extractor.extract_document(FAKE_PDF_BYTES, "   ")

    with pytest.raises(ValueError, match="file_name cannot be empty"):
        extractor.extract_document(FAKE_PDF_BYTES, "")


def test_gemini_invalid_file_type_rejected():
    """Verify unsupported MIME type raises ValueError with clear message."""
    mock_client = MockGeminiClient()
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="Unsupported media type 'image/png'"):
        extractor.extract_document(FAKE_PDF_BYTES, "image.png", file_type="image/png")

    assert len(mock_client.call_history) == 0


def test_gemini_malformed_json_handling():
    """Verify malformed JSON from model raises GeminiExtractionParseError."""
    mock_client = MockGeminiClient(default_response_text="This is plain text, not JSON.")
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(GeminiExtractionParseError, match="not valid JSON"):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")


def test_gemini_schema_validation():
    """Verify schema violation (missing required fields) raises GeminiExtractionSchemaError."""
    incomplete_payload = {
        "title": "CS 590",
        # Missing deadline, eligibility, requirements, important_information, action_items
    }
    mock_client = MockGeminiClient(default_response_text=json.dumps(incomplete_payload))
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(GeminiExtractionSchemaError, match="'deadline' is a required property"):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")


def test_gemini_api_error_handling():
    """Verify GeminiError or API exceptions during extraction raise GeminiExtractionError."""
    mock_client = MockGeminiClient()
    mock_client.queue_response(GeminiError("ResourceExhausted: quota exceeded"))
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(GeminiExtractionError, match="quota exceeded"):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")


def test_gemini_text_extraction():
    """Verify text-based extraction also works seamlessly with Gemini."""
    mock_client = MockGeminiClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = GeminiDocumentExtractor(client=mock_client)

    result = extractor.extract(SAMPLE_DOCUMENT_TEXT)
    assert result.title == "CS 590 - Advanced Machine Learning Term Project"
    assert len(mock_client.call_history) == 1


def test_gemini_text_extraction_empty_rejected():
    """Verify empty document text raises ValueError."""
    mock_client = MockGeminiClient()
    extractor = GeminiDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="document_text cannot be empty"):
        extractor.extract("   ")


def test_gemini_client_missing_api_key_raises_error():
    """Verify GeminiClient raises GeminiError when API key is missing and no client is injected."""
    # Ensure GEMINI_API_KEY is not in env
    orig_key = os.environ.pop("GEMINI_API_KEY", None)
    try:
        client = GeminiClient(api_key=None)
        with pytest.raises(GeminiError, match="GEMINI_API_KEY environment variable is not set"):
            client.generate_content("Hello")
    finally:
        if orig_key is not None:
            os.environ["GEMINI_API_KEY"] = orig_key


def test_get_document_extractor_factory_default_is_bedrock():
    """Verify default provider is bedrock preserving existing behavior."""
    orig_provider = os.environ.pop("AI_PROVIDER", None)
    try:
        extractor = get_document_extractor()
        assert isinstance(extractor, BedrockDocumentExtractor)
    finally:
        if orig_provider is not None:
            os.environ["AI_PROVIDER"] = orig_provider


def test_get_document_extractor_factory_gemini(monkeypatch):
    """Verify factory returns GeminiDocumentExtractor when AI_PROVIDER=gemini."""
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    mock_client = MockGeminiClient()
    extractor = get_document_extractor(client=mock_client)
    assert isinstance(extractor, GeminiDocumentExtractor)
    assert extractor.client is mock_client


def test_get_document_extractor_factory_explicit_override():
    """Verify explicit provider parameter overrides environment."""
    mock_client = MockGeminiClient()
    extractor = get_document_extractor(provider="gemini", client=mock_client)
    assert isinstance(extractor, GeminiDocumentExtractor)


def test_get_document_extractor_factory_unsupported_provider():
    """Verify unsupported provider name raises ValueError."""
    with pytest.raises(ValueError, match="Unsupported AI_PROVIDER 'openai'"):
        get_document_extractor(provider="openai")
