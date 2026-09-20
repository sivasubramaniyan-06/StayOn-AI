"""Task Generator for StayOn AI.

Decomposes student goals and document context into actionable, sized tasks
using either Amazon Bedrock or Google Gemini.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import jsonschema

from ai.client import (
    BedrockConverseError,
    clean_json_markdown,
)
from ai.extraction.bedrock_extractor import DocumentExtractionResult
from ai.planning.goal_generator import GeneratedGoal
from ai.providers.gemini_client import GeminiError
from ai.providers.text_generation import TextGenerationProtocol, get_text_provider

AI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPT_PATH = AI_DIR / "prompts" / "task_generation.txt"
DEFAULT_SCHEMA_PATH = AI_DIR / "schemas" / "task_generation.json"


class TaskGenerationError(Exception):
    """Base exception for task generation errors."""
    pass


class TaskParseError(TaskGenerationError):
    """Raised when model response is not valid JSON."""
    pass


class TaskSchemaError(TaskGenerationError):
    """Raised when tasks response violates JSON schema."""
    pass


@dataclass
class GeneratedTaskItem:
    """A single actionable task item."""
    title: str
    parentId: Optional[str] = None
    estimatedMinutes: int = 30
    scheduledDate: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GeneratedTaskList:
    """A list of generated tasks for a specific goal."""
    goalId: str
    tasks: List[GeneratedTaskItem]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goalId": self.goalId,
            "tasks": [t.to_dict() for t in self.tasks],
        }


class TaskGenerator:
    """Generates structured student tasks from goals and document context."""

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
            raise FileNotFoundError(f"Task prompt template not found at: {path}")
        return path.read_text(encoding="utf-8")

    @staticmethod
    def _load_schema(path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Task schema not found at: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def render_prompt(
        self,
        goal_data: Dict[str, Any],
        extraction_data: Dict[str, Any],
        goal_id: str,
    ) -> str:
        """Render prompt with goal JSON, extraction JSON, and goalId."""
        return (
            self._prompt_template
            .replace("{{goal_json}}", json.dumps(goal_data, indent=2))
            .replace("{{extracted_document_json}}", json.dumps(extraction_data, indent=2))
            .replace("{{goal_id}}", goal_id)
        )

    def generate_tasks(
        self,
        goal_input: Union[GeneratedGoal, Dict[str, Any]],
        extraction_input: Optional[Union[DocumentExtractionResult, Dict[str, Any]]] = None,
        goal_id: Optional[str] = None,
        deadline: Optional[str] = None,
    ) -> GeneratedTaskList:
        """Generate structured tasks for a student goal.

        Args:
            goal_input: GeneratedGoal or dict containing goal details.
            extraction_input: Optional DocumentExtractionResult or dict with source document context.
            goal_id: Optional goal ID (defaults to goal_input's id or 'goal-001').
            deadline: Optional deadline constraint string.

        Returns:
            GeneratedTaskList containing typed GeneratedTaskItems.
        """
        if isinstance(goal_input, GeneratedGoal):
            goal_dict = goal_input.to_dict()
            target_goal_id = goal_id or goal_dict.get("id") or goal_dict.get("goalId") or "goal-001"
        elif isinstance(goal_input, dict):
            goal_dict = dict(goal_input)
            target_goal_id = goal_id or goal_dict.get("id") or goal_dict.get("goalId") or "goal-001"
        else:
            raise TypeError(f"Expected GeneratedGoal or dict for goal_input, got {type(goal_input)}")

        if not str(target_goal_id).strip():
            raise ValueError("goalId cannot be empty")

        if deadline and str(deadline).strip():
            goal_dict["deadline"] = str(deadline).strip()

        if extraction_input is None:
            extraction_dict: Dict[str, Any] = {}
        elif isinstance(extraction_input, DocumentExtractionResult):
            extraction_dict = extraction_input.to_dict()
        elif isinstance(extraction_input, dict):
            extraction_dict = extraction_input
        else:
            raise TypeError(f"Expected DocumentExtractionResult or dict for extraction_input, got {type(extraction_input)}")

        prompt = self.render_prompt(goal_dict, extraction_dict, str(target_goal_id))

        try:
            raw_text = self.provider.generate(
                prompt=prompt,
                schema=self._schema,
                max_tokens=2048,
                temperature=0.0,
                model=self.model_id,
            )
        except BedrockConverseError as exc:
            raise TaskGenerationError(f"Bedrock call failed during task generation: {exc}") from exc
        except GeminiError as exc:
            raise TaskGenerationError(f"Gemini call failed during task generation: {exc}") from exc
        except Exception as exc:
            raise TaskGenerationError(f"Unexpected error during task generation: {exc}") from exc

        cleaned_json = clean_json_markdown(raw_text)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as exc:
            raise TaskParseError(
                f"Model response is not valid JSON: {exc}. Raw: {raw_text[:200]}"
            ) from exc

        try:
            jsonschema.validate(instance=data, schema=self._schema)
        except jsonschema.ValidationError as exc:
            raise TaskSchemaError(
                f"Generated tasks do not match required schema: {exc.message}"
            ) from exc

        tasks = [
            GeneratedTaskItem(
                title=str(t["title"]),
                parentId=t.get("parentId"),
                estimatedMinutes=int(t.get("estimatedMinutes", 30)),
                scheduledDate=t.get("scheduledDate"),
            )
            for t in data["tasks"]
        ]

        return GeneratedTaskList(
            goalId=str(target_goal_id),
            tasks=tasks,
        )
