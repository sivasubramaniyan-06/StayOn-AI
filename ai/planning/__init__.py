"""Planning and generation module for StayOn AI goals and tasks."""

from __future__ import annotations

import os
from typing import Any, Optional

from ai.planning.goal_generator import (
    GeneratedGoal,
    GoalGenerationError,
    GoalGenerator,
    GoalParseError,
    GoalSchemaError,
)
from ai.planning.task_generator import (
    GeneratedTaskItem,
    GeneratedTaskList,
    TaskGenerationError,
    TaskGenerator,
    TaskParseError,
    TaskSchemaError,
)


def get_goal_generator(provider: Optional[str] = None, **kwargs: Any) -> GoalGenerator:
    """Factory to get the configured GoalGenerator (respects provider/AI_PROVIDER)."""
    return GoalGenerator(provider=provider, **kwargs)


def get_task_generator(provider: Optional[str] = None, **kwargs: Any) -> TaskGenerator:
    """Factory to get the configured TaskGenerator (respects provider/AI_PROVIDER)."""
    return TaskGenerator(provider=provider, **kwargs)


__all__ = [
    "GoalGenerator",
    "GeneratedGoal",
    "GoalGenerationError",
    "GoalSchemaError",
    "GoalParseError",
    "get_goal_generator",
    "TaskGenerator",
    "GeneratedTaskItem",
    "GeneratedTaskList",
    "TaskGenerationError",
    "TaskParseError",
    "TaskSchemaError",
    "get_task_generator",
]
