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
