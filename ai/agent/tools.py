"""Controlled Action Tools for StayOn AI Agent.

Architecture Rule: "Bedrock suggests, backend validates, user confirms."
The AI Agent NEVER directly modifies the database.
All actions flow through these typed tool interfaces that connect to Person 4's backend APIs.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import datetime
from typing import Any, Dict, List, Optional, Protocol


class TaskBackendProtocol(Protocol):
    """Interface to Person 4's backend / API Gateway / DynamoDB service."""

    def get_today_tasks(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        ...

    def get_pending_tasks(self, goal_id: Optional[str] = None) -> List[Dict[str, Any]]:
        ...

    def create_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        ...

    def replan_tasks(self, replan_data: Dict[str, Any], confirmed: bool = False) -> Dict[str, Any]:
        ...


APPROVED_TOOLS: List[str] = [
    "get_today_tasks",
    "get_pending_tasks",
    "create_tasks",
    "replan_tasks",
]

TOOL_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "get_today_tasks": {
        "description": "Returns today's tasks from a backend-provided context/interface.",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Optional ISO date YYYY-MM-DD"}
            },
        },
    },
    "get_pending_tasks": {
        "description": "Returns pending tasks from backend-provided context/interface.",
        "parameters": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string", "description": "Optional goal ID to filter by"}
            },
        },
    },
    "create_tasks": {
        "description": "Creates proposed tasks through the controlled backend interface.",
        "parameters": {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of task objects to create"
                }
            },
            "required": ["tasks"],
        },
    },
    "replan_tasks": {
        "description": "Creates or applies a proposed revised plan through the controlled backend interface.",
        "parameters": {
            "type": "object",
            "properties": {
                "replan_data": {"type": "object", "description": "Plan proposal with changes"},
                "confirmed": {"type": "boolean", "description": "Must be True to apply mutations"}
            },
            "required": ["replan_data"],
        },
    },
}


class InMemoryTaskBackend:
    """In-memory mock backend for offline agent testing and local development."""

    def __init__(self, initial_tasks: Optional[List[Dict[str, Any]]] = None) -> None:
        self.tasks: List[Dict[str, Any]] = list(initial_tasks or [
            {
                "id": "task-501",
                "goalId": "goal-001",
                "goalTitle": "Master AWS Cloud Solutions",
                "title": "Read S3 Storage Classes Whitepaper",
                "estimatedMinutes": 45,
                "status": "pending",
                "scheduledDate": datetime.date.today().isoformat(),
            },
            {
                "id": "task-502",
                "goalId": "goal-001",
                "goalTitle": "Master AWS Cloud Solutions",
                "title": "Build DynamoDB Single-Table Schema",
                "estimatedMinutes": 60,
                "status": "pending",
                "scheduledDate": datetime.date.today().isoformat(),
            },
            {
                "id": "task-499",
                "goalId": "goal-001",
                "goalTitle": "Master AWS Cloud Solutions",
                "title": "Set up AWS CLI and SSO",
                "estimatedMinutes": 30,
                "status": "completed",
                "scheduledDate": (datetime.date.today() - datetime.timedelta(days=1)).isoformat(),
            },
        ])
        self.applied_replans: List[Dict[str, Any]] = []

    def get_today_tasks(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        target_date = date or datetime.date.today().isoformat()
        return [
            t for t in self.tasks
            if t.get("scheduledDate") == target_date and t.get("status") != "completed"
        ]

    def get_pending_tasks(self, goal_id: Optional[str] = None) -> List[Dict[str, Any]]:
        return [
            t for t in self.tasks
            if t.get("status") == "pending" and (goal_id is None or t.get("goalId") == goal_id)
        ]

    def create_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        created = []
        for i, t in enumerate(tasks):
            new_task = dict(t)
            new_task["id"] = f"task-{len(self.tasks) + 1 + i}"
            new_task.setdefault("status", "pending")
            self.tasks.append(new_task)
            created.append(new_task)
        return created

    def replan_tasks(self, replan_data: Dict[str, Any], confirmed: bool = False) -> Dict[str, Any]:
        """Apply replanning changes ONLY if user confirmed."""
        if not confirmed:
            return {
                "status": "requires_user_confirmation",
                "message": "Replanning proposal generated but not applied. Student confirmation required.",
                "plan": replan_data,
            }

        # Apply changes
        changes = replan_data.get("changes", [])
        updated_count = 0
        for change in changes:
            task_id = change.get("taskId")
            new_date = change.get("proposedDate")
            for t in self.tasks:
                if t["id"] == task_id:
                    t["scheduledDate"] = new_date
                    updated_count += 1

        self.applied_replans.append(replan_data)
        return {
            "status": "applied",
            "updatedCount": updated_count,
            "planId": replan_data.get("planId"),
        }


class AgentTools:
    """Exposes controlled action tools to the StayOn AI reasoning agent."""

    def __init__(self, backend: Optional[TaskBackendProtocol] = None) -> None:
        self.backend = backend or InMemoryTaskBackend()

    def get_today_tasks(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch today's scheduled tasks for the student."""
        return self.backend.get_today_tasks(date=date)

    def get_pending_tasks(self, goal_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch all uncompleted tasks, optionally filtered by goal."""
        return self.backend.get_pending_tasks(goal_id=goal_id)

    def create_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Safely create new tasks via backend validation."""
        if not isinstance(tasks, list):
            raise TypeError("tasks must be a list of task objects")
        return self.backend.create_tasks(tasks)

    def replan_tasks(self, replan_data: Dict[str, Any], confirmed: bool = False) -> Dict[str, Any]:
        """Submit replanning proposals. Enforces user confirmation before mutation."""
        return self.backend.replan_tasks(replan_data, confirmed=confirmed)
