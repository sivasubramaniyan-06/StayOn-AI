"""Gemini Document Extractor for StayOn AI.

Extracts structured academic milestones, criteria, deadlines, and action items
from student documents (e.g. syllabi, project guidelines) using Google Gemini.
Supports native PDF document payloads via the modern google-genai SDK.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from google.genai import types
import jsonschema

from ai.client import clean_json_markdown
from ai.extraction.bedrock_extractor import DocumentExtractionResult, SUPPORTED_DOCUMENT_TYPES
from ai.providers.gemini_client import (
    DEFAULT_GEMINI_MODEL,
    GeminiClient,
    GeminiClientProtocol,
    GeminiError,
)

# Reuse existing shared paths
AI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPT_PATH = AI_DIR / "prompts" / "document_extraction.txt"
DEFAULT_SCHEMA_PATH = AI_DIR / "schemas" / "document_extraction.json"


class GeminiExtractionError(GeminiError):
    """Base exception for Gemini document extraction failures."""
    pass


class GeminiExtractionParseError(GeminiExtractionError):
    """Raised when Gemini output cannot be parsed as valid JSON."""
    pass


class GeminiExtractionSchemaError(GeminiExtractionError):
    """Raised when extracted JSON violates the document extraction schema."""
    pass


class GeminiDocumentExtractor:
    """Extracts structured student academic information using Google Gemini."""

    def __init__(
        self,
        client: Optional[GeminiClientProtocol] = None,
        prompt_template_path: Optional[Path] = None,
        schema_path: Optional[Path] = None,
        model: Optional[str] = None,
    ) -> None:
        self.model = model or DEFAULT_GEMINI_MODEL
        self.client = client or GeminiClient(model=self.model)
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
        """Get extraction instructions for native document analysis."""
        return self._prompt_template.replace(
            "DOCUMENT CONTENT:\n{{document_text}}",
            "Please analyze the attached document.",
        ).strip()

    def _get_gemini_schema(self) -> Dict[str, Any]:
        """Prepare schema for Gemini API structured output (stripping non-OpenAPI keywords)."""
        return {k: v for k, v in self._schema.items() if not k.startswith("$")}

    @staticmethod
    def _extract_text(response: Any) -> str:
        """Extract text string from Gemini response object or dict."""
        if hasattr(response, "text") and response.text is not None:
            return response.text
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            if "text" in response:
                return str(response["text"])
            return json.dumps(response)
        raise GeminiExtractionParseError(
            f"Unable to extract text from response of type: {type(response).__name__}"
        )

    def _parse_and_validate_response(self, response: Any) -> DocumentExtractionResult:
        """Parse raw response text, clean markdown fences, and validate against JSON schema."""
        raw_text = self._extract_text(response)
        cleaned_json = clean_json_markdown(raw_text)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as exc:
            raise GeminiExtractionParseError(
                f"Model response is not valid JSON: {exc}. Raw response: {raw_text[:200]}"
            ) from exc

        try:
            jsonschema.validate(instance=data, schema=self._schema)
        except jsonschema.ValidationError as exc:
            raise GeminiExtractionSchemaError(
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
        """Extract structured information from raw text using Gemini."""
        prompt = self.render_prompt(document_text)

        config = types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            response_json_schema=self._get_gemini_schema(),
        )

        try:
            response = self.client.generate_content(
                contents=prompt,
                config=config,
                model=self.model,
            )
        except GeminiError as exc:
            raise GeminiExtractionError(f"Gemini failed during extraction: {exc}") from exc
        except Exception as exc:
            raise GeminiExtractionError(f"Unexpected error communicating with Gemini: {exc}") from exc

        return self._parse_and_validate_response(response)

    def extract_document(
        self,
        document_bytes: bytes,
        file_name: str,
        file_type: str = "application/pdf",
    ) -> DocumentExtractionResult:
        """Extract structured information directly from a PDF payload using Gemini.

        Sends the PDF natively to Gemini alongside the structured extraction prompt.

        Args:
            document_bytes: Raw bytes of the document/PDF.
            file_name: File name including extension (e.g. 'syllabus.pdf').
            file_type: MIME media type (defaults to 'application/pdf').

        Returns:
            DocumentExtractionResult with structured fields.

        Raises:
            TypeError: If document_bytes is not bytes or bytearray.
            ValueError: If document_bytes is empty, file_name is empty, or media type is unsupported.
            GeminiExtractionError: If Gemini API encounters an error.
            GeminiExtractionParseError: If response cannot be parsed as valid JSON.
            GeminiExtractionSchemaError: If response violates the schema.
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

        pdf_part = types.Part.from_bytes(
            data=bytes(document_bytes),
            mime_type=clean_type,
        )
        prompt_text = self.get_document_prompt()

        config = types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            response_json_schema=self._get_gemini_schema(),
        )

        try:
            response = self.client.generate_content(
                contents=[pdf_part, prompt_text],
                config=config,
                model=self.model,
            )
        except GeminiError as exc:
            raise GeminiExtractionError(f"Gemini failed during document extraction: {exc}") from exc
        except Exception as exc:
            raise GeminiExtractionError(f"Unexpected error communicating with Gemini: {exc}") from exc

        return self._parse_and_validate_response(response)
