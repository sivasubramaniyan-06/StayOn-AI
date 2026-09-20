"""Optional Live Google Gemini API Integration Test.

Skipped automatically when GEMINI_API_KEY is not set in the environment.
To execute with a valid Gemini API key:
    GEMINI_API_KEY=your_key pytest -q ai/tests/test_live_gemini.py

Security notice:
Never hardcode or log API keys in source code or test output.
"""

from __future__ import annotations

import os
import pytest

from ai.extraction.bedrock_extractor import DocumentExtractionResult
from ai.extraction.gemini_extractor import GeminiDocumentExtractor
from ai.providers.gemini_client import GeminiClient

HAS_GEMINI_KEY = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY", "").strip())

SAMPLE_SYLLABUS = """
Course: CS 101 - Introduction to Computer Science
Term: Fall 2026
Final Project Due: 2026-12-15
Eligibility: None, open to all undergraduate students.
Requirements:
1. Complete all 5 weekly programming problem sets.
2. Submit a final Python web application project.
Important Information:
Late submissions will lose 5% per day. Office hours on Tuesdays.
Action Items:
- Install Python and VS Code.
- Complete Problem Set 1 by September 15.
- Submit project proposal by October 20.
"""


@pytest.mark.skipif(
    not HAS_GEMINI_KEY,
    reason="GEMINI_API_KEY environment variable is not set. Live Gemini test skipped.",
)
def test_live_gemini_extraction():
    """Execute live extraction against Gemini API when GEMINI_API_KEY is configured."""
    client = GeminiClient()
    extractor = GeminiDocumentExtractor(client=client)

    result = extractor.extract(SAMPLE_SYLLABUS)

    assert isinstance(result, DocumentExtractionResult)
    assert result.title
    assert "CS 101" in result.title or "Computer Science" in result.title
    assert result.deadline == "2026-12-15"
    assert len(result.requirements) > 0
    assert len(result.action_items) > 0


@pytest.mark.skipif(
    not HAS_GEMINI_KEY,
    reason="GEMINI_API_KEY environment variable is not set. Live Gemini test skipped.",
)
def test_live_gemini_goal_generation():
    """Execute live goal generation against Gemini API when GEMINI_API_KEY is configured."""
    from ai.planning.goal_generator import GeneratedGoal, GoalGenerator

    client = GeminiClient()
    generator = GoalGenerator(provider="gemini", client=client)

    sample_extraction = DocumentExtractionResult(
        title="CS 101 Introduction to Computer Science",
        deadline="2026-12-15",
        eligibility=[],
        requirements=["Complete problem sets", "Submit web app project"],
        important_information=["Office hours Tuesdays"],
        action_items=["Install Python", "Complete Problem Set 1", "Submit proposal"],
    )

    goal = generator.generate_goal(sample_extraction, document_id="doc-live-101")

    assert isinstance(goal, GeneratedGoal)
    assert goal.title
    assert goal.documentId == "doc-live-101"
    assert goal.deadline == "2026-12-15"
    assert goal.description


@pytest.mark.skipif(
    not HAS_GEMINI_KEY,
    reason="GEMINI_API_KEY environment variable is not set. Live Gemini test skipped.",
)
def test_live_gemini_task_generation():
    """Execute live task generation against Gemini API when GEMINI_API_KEY is configured."""
    from ai.planning.goal_generator import GeneratedGoal
    from ai.planning.task_generator import GeneratedTaskList, TaskGenerator

    client = GeminiClient()
    generator = TaskGenerator(provider="gemini", client=client)

    sample_goal = GeneratedGoal(
        title="Complete CS 101 Final Web App",
        description="Build and deploy a full-stack Python web application with tests.",
        deadline="2026-12-15",
        documentId="doc-live-101",
    )

    task_list = generator.generate_tasks(sample_goal, goal_id="goal-live-101")

    assert isinstance(task_list, GeneratedTaskList)
    assert task_list.goalId == "goal-live-101"
    assert len(task_list.tasks) >= 1
    for task in task_list.tasks:
        assert task.title
        assert 5 <= task.estimatedMinutes <= 480

