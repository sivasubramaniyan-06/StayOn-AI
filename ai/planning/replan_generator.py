"""Adaptive Replanning Generator for StayOn AI.

Reschedules missed or pending tasks dynamically based on student progress and deadlines.
Guarantees: "requiresUserConfirmation" is ALWAYS True.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

import jsonschema

from ai.client import (
    BedrockClientProtocol,
    BedrockConverseClient,
    BedrockConverseError,
    clean_json_markdown,
    extract_text_from_converse_response,
)

AI_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPT_PATH = AI_DIR / "prompts" / "replanning.txt"
DEFAULT_SCHEMA_PATH = AI_DIR / "schemas" / "replan.json"


class ReplanError(Exception):
    """Base exception for replanning errors."""
    pass


class ReplanParseError(ReplanError):
    """Raised when model replan output cannot be parsed as JSON."""
    pass


class ReplanSchemaError(ReplanError):
    """Raised when replan output violates schema."""
    pass


@dataclass
class ReplanChangeItem:
    """A proposed change to a task's schedule."""
    taskId: str
    proposedDate: str
    currentDate: Optional[str] = None
    changeType: str = "reschedule"
    fromDate: Optional[str] = None
    toDate: Optional[str] = None
    taskTitle: Optional[str] = None
    reason: Optional[str] = None

    def __post_init__(self) -> None:
        if self.fromDate is None and self.currentDate is not None:
            self.fromDate = self.currentDate
        if self.toDate is None and self.proposedDate is not None:
            self.toDate = self.proposedDate

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "taskId": self.taskId,
            "proposedDate": self.proposedDate,
            "changeType": self.changeType,
        }
        if self.currentDate is not None:
            d["currentDate"] = self.currentDate
        if self.fromDate is not None:
            d["fromDate"] = self.fromDate
        if self.toDate is not None:
            d["toDate"] = self.toDate
        if self.taskTitle is not None:
            d["taskTitle"] = self.taskTitle
        if self.reason is not None:
            d["reason"] = self.reason
        return d


@dataclass
class GeneratedReplan:
    """A full proposed replanning schedule requiring student confirmation."""
    planId: str
    summary: str
    changes: List[ReplanChangeItem]
    requiresUserConfirmation: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "planId": self.planId,
            "summary": self.summary,
            "changes": [c.to_dict() for c in self.changes],
            "requiresUserConfirmation": True,  # Non-negotiable architectural invariant
        }


class ReplanGenerator:
    """Generates adaptive replanning proposals with Bedrock."""

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
            raise FileNotFoundError(f"Replan prompt template not found at: {path}")
        return path.read_text(encoding="utf-8")

    @staticmethod
    def _load_schema(path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Replan schema not found at: {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def render_prompt(
        self,
        current_tasks: List[Dict[str, Any]],
        pending_tasks: List[Dict[str, Any]],
        missed_tasks: List[Dict[str, Any]],
        deadline: str,
        reason: str,
        plan_id: str,
    ) -> str:
        return (
            self._prompt_template
            .replace("{{current_tasks_json}}", json.dumps(current_tasks, indent=2))
            .replace("{{pending_tasks_json}}", json.dumps(pending_tasks, indent=2))
            .replace("{{missed_tasks_json}}", json.dumps(missed_tasks, indent=2))
            .replace("{{deadline}}", deadline or "None specified")
            .replace("{{reason}}", reason)
            .replace("{{plan_id}}", plan_id)
        )

    def generate_replan(
        self,
        current_tasks: List[Dict[str, Any]],
        pending_tasks: List[Dict[str, Any]],
        missed_tasks: List[Dict[str, Any]],
        deadline: str = "",
        reason: str = "Student fell behind on scheduled tasks",
        plan_id: Optional[str] = None,
    ) -> GeneratedReplan:
        """Generate a validated replanning schedule with mandatory user confirmation."""
        assigned_plan_id = plan_id or f"replan-{uuid.uuid4().hex[:6]}"

        prompt = self.render_prompt(
            current_tasks=current_tasks,
            pending_tasks=pending_tasks,
            missed_tasks=missed_tasks,
            deadline=deadline,
            reason=reason,
            plan_id=assigned_plan_id,
        )

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
            raise ReplanError(f"Bedrock call failed during replanning: {exc}") from exc
        except Exception as exc:
            raise ReplanError(f"Unexpected error during replanning: {exc}") from exc

        raw_text = extract_text_from_converse_response(response)
        cleaned_json = clean_json_markdown(raw_text)

        try:
            data = json.loads(cleaned_json)
        except json.JSONDecodeError as exc:
            raise ReplanParseError(
                f"Model response is not valid JSON: {exc}. Raw: {raw_text[:200]}"
            ) from exc

        # Architectural safety guarantee: user confirmation is ALWAYS required
        data["requiresUserConfirmation"] = True

        try:
            jsonschema.validate(instance=data, schema=self._schema)
        except jsonschema.ValidationError as exc:
            raise ReplanSchemaError(
                f"Generated replan does not match required schema: {exc.message}"
            ) from exc

        final_plan_id = plan_id or data.get("planId") or assigned_plan_id

        changes = [
            ReplanChangeItem(
                taskId=str(c["taskId"]),
                proposedDate=str(c.get("proposedDate") or c.get("toDate")),
                currentDate=c.get("currentDate") or c.get("fromDate"),
                changeType=str(c.get("changeType", "reschedule")),
                fromDate=c.get("fromDate") or c.get("currentDate"),
                toDate=c.get("toDate") or c.get("proposedDate"),
                taskTitle=c.get("taskTitle"),
                reason=c.get("reason"),
            )
            for c in data["changes"]
        ]

        return GeneratedReplan(
            planId=final_plan_id,
            summary=str(data["summary"]),
            changes=changes,
            requiresUserConfirmation=True,
        )
