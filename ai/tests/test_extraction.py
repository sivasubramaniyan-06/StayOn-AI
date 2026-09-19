"""Unit tests for Bedrock Document Extractor."""

import json
import pytest

from ai.client import BedrockConverseError, MockBedrockClient
from ai.extraction.bedrock_extractor import (
    BedrockDocumentExtractor,
    DocumentExtractionResult,
    ExtractionBedrockError,
    ExtractionParseError,
    ExtractionSchemaError,
)

SAMPLE_DOCUMENT = """
Course: CS 480 - Cloud Computing
Semester: Fall 2026
Term Project Due Date: 2026-11-15
Eligibility: Open to CS juniors and seniors with CS 201 prerequisite.
Requirements:
1. Build a distributed microservice using AWS Lambda and DynamoDB.
2. Submit a 5-page PDF report with architecture diagrams.
3. Code repository must have at least 80% test coverage.
Important Information:
Late submissions will receive a 10% penalty per day. Teams of up to 3 permitted.
Action Items:
- Form a team of 3 by September 25.
- Submit project proposal by October 5.
- Deploy prototype to AWS by October 25.
- Submit final code and report by November 15.
"""

VALID_EXTRACTION_DICT = {
    "title": "CS 480 - Cloud Computing Term Project",
    "deadline": "2026-11-15",
    "eligibility": ["CS juniors and seniors with CS 201 prerequisite"],
    "requirements": [
        "Build a distributed microservice using AWS Lambda and DynamoDB",
        "Submit a 5-page PDF report with architecture diagrams",
        "Code repository must have at least 80% test coverage"
    ],
    "important_information": [
        "Late submissions will receive a 10% penalty per day",
        "Teams of up to 3 permitted"
    ],
    "action_items": [
        "Form a team of 3 by September 25",
        "Submit project proposal by October 5",
        "Deploy prototype to AWS by October 25",
        "Submit final code and report by November 15"
    ]
}


def test_valid_extraction():
    """Verify clean extraction when model returns valid JSON."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = BedrockDocumentExtractor(client=mock_client)

    result = extractor.extract(SAMPLE_DOCUMENT)

    assert isinstance(result, DocumentExtractionResult)
    assert result.title == "CS 480 - Cloud Computing Term Project"
    assert result.deadline == "2026-11-15"
    assert len(result.requirements) == 3
    assert len(result.action_items) == 4
    assert len(mock_client.call_history) == 1
    # Verify the model used
    assert mock_client.call_history[0]["inference_config"]["temperature"] == 0.0


def test_extraction_with_markdown_fences():
    """Verify extraction handles model output wrapped in ```json ... ``` code fences."""
    fenced_output = f"```json\n{json.dumps(VALID_EXTRACTION_DICT)}\n```"
    mock_client = MockBedrockClient(default_response_text=fenced_output)
    extractor = BedrockDocumentExtractor(client=mock_client)

    result = extractor.extract(SAMPLE_DOCUMENT)
    assert result.title == "CS 480 - Cloud Computing Term Project"
    assert result.deadline == "2026-11-15"


def test_extraction_empty_document_raises_value_error():
    """Verify empty document text raises ValueError before invoking model."""
    mock_client = MockBedrockClient()
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="document_text cannot be empty"):
        extractor.extract("   ")
    assert len(mock_client.call_history) == 0


def test_extraction_malformed_json_raises_parse_error():
    """Verify invalid JSON text raises ExtractionParseError."""
    mock_client = MockBedrockClient(default_response_text="This is not valid JSON at all")
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionParseError):
        extractor.extract(SAMPLE_DOCUMENT)


def test_extraction_missing_required_field_raises_schema_error():
    """Verify JSON missing a required field (e.g. deadline) is rejected."""
    incomplete_dict = dict(VALID_EXTRACTION_DICT)
    del incomplete_dict["deadline"]

    mock_client = MockBedrockClient(default_response_text=json.dumps(incomplete_dict))
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionSchemaError, match="'deadline' is a required property"):
        extractor.extract(SAMPLE_DOCUMENT)


def test_extraction_invalid_type_raises_schema_error():
    """Verify JSON with invalid field type (e.g. action_items is string instead of array) is rejected."""
    invalid_type_dict = dict(VALID_EXTRACTION_DICT)
    invalid_type_dict["action_items"] = "submit by tomorrow"  # should be list

    mock_client = MockBedrockClient(default_response_text=json.dumps(invalid_type_dict))
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionSchemaError):
        extractor.extract(SAMPLE_DOCUMENT)


def test_extraction_bedrock_error_handling():
    """Verify BedrockConverseError is caught and raised as ExtractionBedrockError."""
    mock_client = MockBedrockClient()
    mock_client.queue_response(BedrockConverseError("ThrottlingException: rate limit exceeded"))
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionBedrockError, match="ThrottlingException"):
        extractor.extract(SAMPLE_DOCUMENT)


def test_extraction_empty_fields_when_absent():
    """Verify when document has no deadline or eligibility, empty strings/lists are accepted."""
    minimal_valid = {
        "title": "General Reading List",
        "deadline": "",
        "eligibility": [],
        "requirements": [],
        "important_information": ["Read chapters 1 through 3"],
        "action_items": []
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(minimal_valid))
    extractor = BedrockDocumentExtractor(client=mock_client)

    result = extractor.extract("General Reading List: Read chapters 1-3.")
    assert result.title == "General Reading List"
    assert result.deadline == ""
    assert result.eligibility == []
    assert result.action_items == []


# ==============================================================================
# PDF / DOCUMENT CONTENT BLOCK TESTS
# ==============================================================================

FAKE_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Title (CS 480 Syllabus) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"


def test_valid_pdf_document_extraction():
    """Verify clean extraction directly from PDF byte payload using mock Converse response."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = BedrockDocumentExtractor(client=mock_client)

    result = extractor.extract_document(
        document_bytes=FAKE_PDF_BYTES,
        file_name="cs480_syllabus.pdf",
        file_type="application/pdf",
    )

    assert isinstance(result, DocumentExtractionResult)
    assert result.title == "CS 480 - Cloud Computing Term Project"
    assert result.deadline == "2026-11-15"
    assert len(result.requirements) == 3
    assert len(result.action_items) == 4


def test_pdf_content_blocks_structure():
    """Verify that Converse is invoked with correct document and text content blocks."""
    mock_client = MockBedrockClient(default_response_text=json.dumps(VALID_EXTRACTION_DICT))
    extractor = BedrockDocumentExtractor(client=mock_client)

    extractor.extract_document(
        document_bytes=FAKE_PDF_BYTES,
        file_name="CS 480 Syllabus (Fall 2026).pdf",
        file_type="application/pdf",
    )

    # Inspect call structure
    doc_block = mock_client.get_last_document_block()
    assert doc_block is not None
    assert doc_block["format"] == "pdf"
    # Name should be sanitized (alphanumeric, underscores, no trailing underscore)
    assert doc_block["name"] == "CS_480_Syllabus__Fall_2026"
    assert doc_block["source"]["bytes"] == FAKE_PDF_BYTES

    text_block = mock_client.get_last_text_block()
    assert text_block is not None
    assert "Please analyze the attached document." in text_block
    assert "Expected JSON Structure" in text_block


def test_pdf_extraction_empty_bytes_raises_error():
    """Verify empty document bytes raises ValueError."""
    mock_client = MockBedrockClient()
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="document_bytes cannot be empty"):
        extractor.extract_document(b"", "syllabus.pdf")
    assert len(mock_client.call_history) == 0


def test_pdf_extraction_non_bytes_raises_error():
    """Verify passing string or invalid type to document_bytes raises TypeError."""
    mock_client = MockBedrockClient()
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(TypeError, match="document_bytes must be bytes or bytearray"):
        extractor.extract_document("string is not bytes", "syllabus.pdf")


def test_pdf_extraction_empty_filename_raises_error():
    """Verify missing or whitespace filename raises ValueError."""
    mock_client = MockBedrockClient()
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="file_name cannot be empty"):
        extractor.extract_document(FAKE_PDF_BYTES, "   ")


def test_pdf_extraction_unsupported_media_type_raises_error():
    """Verify unsupported MIME type raises ValueError with clear message."""
    mock_client = MockBedrockClient()
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ValueError, match="Unsupported media type 'image/png'"):
        extractor.extract_document(FAKE_PDF_BYTES, "image.png", file_type="image/png")


def test_pdf_extraction_malformed_json_raises_parse_error():
    """Verify malformed JSON from model raises ExtractionParseError."""
    mock_client = MockBedrockClient(default_response_text="Not valid json output")
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionParseError):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")


def test_pdf_extraction_schema_violation_raises_schema_error():
    """Verify incomplete JSON missing required fields raises ExtractionSchemaError."""
    incomplete = {
        "title": "CS 480",
        # missing deadline, eligibility, requirements, etc.
    }
    mock_client = MockBedrockClient(default_response_text=json.dumps(incomplete))
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionSchemaError):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")


def test_pdf_extraction_bedrock_error_handling():
    """Verify Bedrock exceptions during document extraction are caught as ExtractionBedrockError."""
    mock_client = MockBedrockClient()
    mock_client.queue_response(BedrockConverseError("ModelTimeoutException"))
    extractor = BedrockDocumentExtractor(client=mock_client)

    with pytest.raises(ExtractionBedrockError, match="ModelTimeoutException"):
        extractor.extract_document(FAKE_PDF_BYTES, "syllabus.pdf")

