"""Live Amazon Bedrock Connectivity and Integration Tester.

Used by Person 1 to verify live Bedrock Runtime Converse API access
with model amazon.nova-2-lite-v1:0 in ap-south-1.

Runs isolated from standard unit tests. Never prints AWS credentials.
"""

from __future__ import annotations

import os
from pathlib import Path
import sys

# Ensure repository root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.client import (
    DEFAULT_MODEL_ID,
    DEFAULT_REGION,
    BedrockConverseClient,
    BedrockConverseError,
    extract_text_from_converse_response,
)
from ai.extraction.bedrock_extractor import BedrockDocumentExtractor


def run_live_test() -> int:
    """Execute live Bedrock converse invocation and document extraction."""
    region = os.getenv("AWS_REGION", DEFAULT_REGION)
    model_id = os.getenv("BEDROCK_MODEL_ID", DEFAULT_MODEL_ID)
    profile = os.getenv("AWS_PROFILE", "stayon")

    print("==================================================")
    print("StayOn AI — Live Bedrock Runtime Diagnostic")
    print("==================================================")
    print(f"Region:   {region}")
    print(f"Model ID: {model_id}")
    print(f"Profile:  {profile}")
    print("==================================================")

    # 1. Initialize client
    try:
        client = BedrockConverseClient(
            region_name=region,
            profile_name=profile,
            model_id=model_id,
        )
    except Exception as exc:
        print(f"[CLIENT INITIALIZATION ERROR] {type(exc).__name__}: {exc}")
        return 1

    # 2. Test Converse API with sanity ping
    print("\n[STEP 1] Testing Amazon Bedrock Converse API ping...")
    messages = [
        {
            "role": "user",
            "content": [{"text": "Reply with exactly: STAYON BEDROCK VERIFIED"}],
        }
    ]

    try:
        response = client.converse(
            messages=messages,
            inference_config={"temperature": 0.0, "maxTokens": 64},
        )
        reply = extract_text_from_converse_response(response)
        print(f"[SUCCESS] Converse Response: {reply.strip()}")
    except BedrockConverseError as exc:
        err_msg = str(exc)
        if "AccessDenied" in err_msg or "being verified" in err_msg:
            print("\n[ACCESS DENIED / ACCOUNT VERIFICATION PENDING]")
            print("Your AWS account is currently undergoing AWS verification.")
            print("Details: Verification normally takes up to 2 hours.")
            print(f"AWS Error: {err_msg}")
            return 2
        elif "Throttling" in err_msg:
            print(f"\n[THROTTLED] Bedrock request throttled: {err_msg}")
            return 3
        elif "ValidationException" in err_msg or "ResourceNotFound" in err_msg:
            print(f"\n[MODEL ERROR] Model ID or parameters invalid: {err_msg}")
            return 4
        else:
            print(f"\n[ERROR] Bedrock Converse call failed: {err_msg}")
            return 5
    except Exception as exc:
        print(f"\n[UNEXPECTED ERROR] {type(exc).__name__}: {exc}")
        return 6

    # 3. Test Document Extractor
    print("\n[STEP 2] Testing Bedrock Document Extractor...")
    try:
        extractor = BedrockDocumentExtractor(client=client)
        test_doc = "Course: CS 480 Distributed Cloud Systems. Project Due: 2026-11-15. Requirement: Build AWS Lambda service."
        result = extractor.extract(test_doc)
        print(f"[SUCCESS] Document Extraction Result:")
        print(f"  - Title:    {result.title}")
        print(f"  - Deadline: {result.deadline}")
        print(f"  - Action Items: {result.action_items}")
    except Exception as exc:
        print(f"[EXTRACTION ERROR] {type(exc).__name__}: {exc}")
        return 7

    print("\n==================================================")
    print("ALL LIVE BEDROCK CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")
    return 0


if __name__ == "__main__":
    sys.exit(run_live_test())
