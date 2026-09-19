"""Bedrock Document Extractor for StayOn AI.

Extracts structured academic milestones, criteria, deadlines, and action items
from student documents (e.g. syllabi, project guidelines) using Amazon Bedrock Converse API.
Supports both raw document text and native PDF/document byte payloads.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional

import jsonschema

from ai.client import (
    BedrockClientProtocol,
    BedrockConverseClient,
    BedrockConverseError,
    clean_json_markdown,
    extract_text_from_converse_response,
)

# Paths relative to package root
AI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPT_PATH = AI_DIR / "prompts" / "document_extraction.txt"
DEFAULT_SCHEMA_PATH = AI_DIR / "schemas" / "document_extraction.json"

# Supported MIME types mapped to Amazon Bedrock Converse document format identifiers
SUPPORTED_DOCUMENT_TYPES: Dict[str, str] = {
    "application/pdf": "pdf",
}


class ExtractionError(Exception):
    """Base exception for document extraction failures."""
    pass


class ExtractionBedrockError(ExtractionError):
    """Raised when Amazon Bedrock Converse API fails during extraction."""
    pass


class ExtractionParseError(ExtractionError):
    """Raised when the model output cannot be parsed as JSON."""
    pass


class ExtractionSchemaError(ExtractionError):
    """Raised when the extracted data violates the expected JSON schema."""
    pass


@dataclass
class DocumentExtractionResult:
    """Structured extraction output from a student document."""
    title: str
    deadline: str
    eligibility: List[str]
    requirements: List[str]
    important_information: List[str]
    action_items: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert the result to a standard JSON-serializable dictionary."""
        return asdict(self)


class BedrockDocumentExtractor:
    """Extracts structured student academic information using Amazon Bedrock."""

    def __init__(
        self,
        client: Optional[BedrockClientProtocol] = None,
        prompt_template_path: Optional[Path] = None,
        schema_path: Optional[Path] = None,
        model_id: Optional[str] = None,
    ) -> None:
        self.client = client or BedrockConverseClient()
        self.model_id = model_id
        self.prompt_template_path = prompt_template_path or DEFAULT_PROMPT_PATH
        self.schema_path = schema_path or DEFAULT_SCHEMA_PATH

        self._prompt_template = self._load_prompt_template(self.prompt_template_path)
        self._schema = self._load_schema(self.schema_path)

    @staticmethod
    def _load_prompt_template(path: Path) -> str:
        if not path.exists():
            raise FileNotFoundError(f"Extraction prompt template not found at: {path}")
        return path.read_text(encoding="utf-8")

    @staticmethod
    def _load_schema(path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Extraction schema not found at: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def render_prompt(self, document_text: str) -> str:
        """Substitute document text into the extraction prompt template."""
        if not document_text or not document_text.strip():
            raise ValueError("document_text cannot be empty")
        return self._prompt_template.replace("{{document_text}}", document_text.strip())

    def get_document_prompt(self) -> str:
        """Get extraction instructions for native document content blocks."""
        return self._prompt_template.replace(
            "DOCUMENT CONTENT:\n{{document_text}}",
            "Please analyze the attached document.",
        ).strip()

    def _parse_and_validate_response(self, response: Dict[str, Any]) -> DocumentExtractionResult:
        """Parse raw Converse response, clean code fences, and validate against schema."""
        raw_text = extract_text_from_converse_response(response)
        cleaned_json = clean_json_markdown(raw_text)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as exc:
            raise ExtractionParseError(
                f"Model response is not valid JSON: {exc}. Raw response: {raw_text[:200]}"
            ) from exc

        try:
            jsonschema.validate(instance=data, schema=self._schema)
        except jsonschema.ValidationError as exc:
            raise ExtractionSchemaError(
                f"Extracted JSON does not match required schema: {exc.message}"
            ) from exc

        return DocumentExtractionResult(
            title=str(data["title"]),
            deadline=str(data["deadline"]),
            eligibility=list(data["eligibility"]),
            requirements=list(data["requirements"]),
            important_information=list(data["important_information"]),
            action_items=list(data["action_items"]),
        )

    def extract(self, document_text: str) -> DocumentExtractionResult:
        """Extract structured information from raw text.

        Args:
            document_text: Raw text of the student document.

        Returns:
            DocumentExtractionResult with structured fields.

        Raises:
            ValueError: If document text is empty.
            ExtractionBedrockError: If Bedrock Converse call fails.
            ExtractionParseError: If model output is not valid JSON.
            ExtractionSchemaError: If parsed JSON violates document_extraction schema.
        """
        prompt = self.render_prompt(document_text)

        messages = [
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ]

        inference_config = {
            "temperature": 0.0,
            "maxTokens": 2048,
        }

        try:
            response = self.client.converse(
                messages=messages,
                inference_config=inference_config,
                model_id=self.model_id,
            )
        except BedrockConverseError as exc:
            raise ExtractionBedrockError(f"Bedrock failed during extraction: {exc}") from exc
        except Exception as exc:
            raise ExtractionBedrockError(f"Unexpected error communicating with Bedrock: {exc}") from exc

        return self._parse_and_validate_response(response)

    def extract_document(
        self,
        document_bytes: bytes,
        file_name: str,
        file_type: str = "application/pdf",
    ) -> DocumentExtractionResult:
        """Extract structured information directly from a PDF or document byte payload.

        Sends the document as a native document content block to Amazon Bedrock Converse.

        Args:
            document_bytes: Raw bytes of the document/PDF.
            file_name: File name including extension (e.g. 'syllabus.pdf').
            file_type: MIME media type (defaults to 'application/pdf').

        Returns:
            DocumentExtractionResult with structured fields.

        Raises:
            TypeError: If document_bytes is not bytes.
            ValueError: If document_bytes is empty, file_name is empty, or media type is unsupported.
            ExtractionBedrockError: If Bedrock Converse call fails.
            ExtractionParseError: If model output is not valid JSON.
            ExtractionSchemaError: If parsed JSON violates document_extraction schema.
        """
        if not isinstance(document_bytes, (bytes, bytearray)):
            raise TypeError(f"document_bytes must be bytes or bytearray, got {type(document_bytes).__name__}")

        if len(document_bytes) == 0:
            raise ValueError("document_bytes cannot be empty")

        if not file_name or not str(file_name).strip():
            raise ValueError("file_name cannot be empty")

        clean_type = (file_type or "").strip().lower()
        if clean_type not in SUPPORTED_DOCUMENT_TYPES:
            raise ValueError(
                f"Unsupported media type '{file_type}'. Supported media types: {list(SUPPORTED_DOCUMENT_TYPES.keys())}"
            )

        doc_format = SUPPORTED_DOCUMENT_TYPES[clean_type]
        stem = Path(file_name).stem
        clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", stem).strip("_") or "document"
        clean_name = clean_name[:64]

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "document": {
                            "format": doc_format,
                            "name": clean_name,
                            "source": {
                                "bytes": bytes(document_bytes),
                            },
                        }
                    },
                    {
                        "text": self.get_document_prompt(),
                    },
                ],
            }
        ]

        inference_config = {
            "temperature": 0.0,
            "maxTokens": 2048,
        }

        try:
            response = self.client.converse(
                messages=messages,
                inference_config=inference_config,
                model_id=self.model_id,
            )
        except BedrockConverseError as exc:
            raise ExtractionBedrockError(f"Bedrock failed during document extraction: {exc}") from exc
        except Exception as exc:
            raise ExtractionBedrockError(f"Unexpected error communicating with Bedrock: {exc}") from exc

        return self._parse_and_validate_response(response)
