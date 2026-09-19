"""Isolated Live Amazon Bedrock Integration Test.

Skipped by default during offline unit test execution.
To execute when AWS Bedrock access is verified:
    RUN_LIVE_BEDROCK_TESTS=1 pytest -q ai/tests/test_live_bedrock.py
"""

import os
import pytest

from ai.live_test import run_live_test


@pytest.mark.skipif(
    not os.getenv("RUN_LIVE_BEDROCK_TESTS"),
    reason="Live Bedrock integration tests disabled by default. Set RUN_LIVE_BEDROCK_TESTS=1 to run."
)
def test_live_bedrock_integration():
    """Execute live Bedrock verification and ensure exit code 0."""
    exit_code = run_live_test()
    assert exit_code == 0, f"Live Bedrock diagnostic failed with code {exit_code}"
