"""Goal Generator for StayOn AI.

Converts extracted document information into a structured student goal
using either Amazon Bedrock or Google Gemini.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Dict, Optional, Union

import jsonschema

from ai.client import (
    BedrockConverseError,
    clean_json_markdown,
)
from ai.extraction.bedrock_extractor import DocumentExtractionResult
from ai.providers.gemini_client import GeminiError
from ai.providers.text_generation import TextGenerationProtocol, get_text_provider

AI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPT_PATH = AI_DIR / "prompts" / "goal_generation.txt"
DEFAULT_SCHEMA_PATH = AI_DIR / "schemas" / "goal.json"


class GoalGenerationError(Exception):
    """Base exception for goal generation failures."""
    pass


class GoalParseError(GoalGenerationError):
    """Raised when model response is not valid JSON."""
    pass


class GoalSchemaError(GoalGenerationError):
    """Raised when goal response violates JSON schema."""
    pass


@dataclass
class GeneratedGoal:
    """A synthesized student goal ready for backend persistence."""
    title: str
    description: str
    deadline: str
    documentId: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert goal to dictionary matching API_CONTRACT."""
        return asdict(self)


class GoalGenerator:
    """Generates concrete student goals from document extraction data."""

    def __init__(
        self,
        client: Optional[Any] = None,
        prompt_template_path: Optional[Path] = None,
        schema_path: Optional[Path] = None,
        model_id: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> None:
        self.model_id = model_id
        self.provider: TextGenerationProtocol = get_text_provider(
            provider=provider,
            client=client,
            model=model_id,
        )
        self.client = client or getattr(self.provider, "client", None)
        self.prompt_template_path = prompt_template_path or DEFAULT_PROMPT_PATH
        self.schema_path = schema_path or DEFAULT_SCHEMA_PATH

        self._prompt_template = self._load_prompt_template(self.prompt_template_path)
        self._schema = self._load_schema(self.schema_path)

    @staticmethod
    def _load_prompt_template(path: Path) -> str:
        if not path.exists():
            raise FileNotFoundError(f"Goal prompt template not found at: {path}")
        return path.read_text(encoding="utf-8")

    @staticmethod
    def _load_schema(path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Goal schema not found at: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def render_prompt(self, extraction_data: Dict[str, Any], document_id: str) -> str:
        """Render prompt with extraction JSON and documentId."""
        return (
            self._prompt_template
            .replace("{{extracted_document_json}}", json.dumps(extraction_data, indent=2))
            .replace("{{document_id}}", document_id)
        )

    def generate_goal(
        self,
        extraction_input: Union[DocumentExtractionResult, Dict[str, Any]],
        document_id: str,
    ) -> GeneratedGoal:
        """Generate a structured student goal from extraction output.

        Args:
            extraction_input: DocumentExtractionResult or dictionary of extracted info.
            document_id: S3/DynamoDB document identifier (e.g. 'doc-101').

        Returns:
            GeneratedGoal with title, description, deadline, documentId.

        Raises:
            ValueError: If document_id is missing or extraction data is empty.
            GoalGenerationError: If Bedrock or Gemini API call fails.
            GoalParseError: If model output is not valid JSON.
            GoalSchemaError: If JSON schema validation fails.
        """
        if not document_id or not document_id.strip():
            raise ValueError("document_id must not be empty")

        if isinstance(extraction_input, DocumentExtractionResult):
            extraction_dict = extraction_input.to_dict()
        elif isinstance(extraction_input, dict):
            extraction_dict = extraction_input
        else:
            raise TypeError(f"Expected DocumentExtractionResult or dict, got {type(extraction_input)}")

        prompt = self.render_prompt(extraction_dict, document_id.strip())

        try:
            raw_text = self.provider.generate(
                prompt=prompt,
                schema=self._schema,
                max_tokens=1024,
                temperature=0.0,
                model=self.model_id,
            )
        except BedrockConverseError as exc:
            raise GoalGenerationError(f"Bedrock call failed during goal generation: {exc}") from exc
        except GeminiError as exc:
            raise GoalGenerationError(f"Gemini call failed during goal generation: {exc}") from exc
        except Exception as exc:
            raise GoalGenerationError(f"Unexpected error during goal generation: {exc}") from exc

        cleaned_json = clean_json_markdown(raw_text)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as exc:
            raise GoalParseError(
                f"Model response is not valid JSON: {exc}. Raw: {raw_text[:200]}"
            ) from exc

        try:
            jsonschema.validate(instance=data, schema=self._schema)
        except jsonschema.ValidationError as exc:
            raise GoalSchemaError(
                f"Generated goal does not match required schema: {exc.message}"
            ) from exc

        return GeneratedGoal(
            title=str(data["title"]),
            description=str(data["description"]),
            deadline=str(data["deadline"]),
            documentId=document_id,
        )
