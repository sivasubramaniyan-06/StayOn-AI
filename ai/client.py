"""Bedrock client abstraction for StayOn AI.

Supports Amazon Bedrock Converse API with amazon.nova-2-lite-v1:0.
Provides an injectable interface and a MockBedrockClient for offline testing.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Protocol, Union

DEFAULT_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-2-lite-v1:0")
DEFAULT_REGION = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "ap-south-1"))


class BedrockConverseError(Exception):
    """Raised when Amazon Bedrock Converse API encounters an error."""
    pass


class BedrockClientProtocol(Protocol):
    """Protocol for Bedrock Converse client to enable testing without AWS."""

    def converse(
        self,
        messages: List[Dict[str, Any]],
        system: Optional[List[Dict[str, str]]] = None,
        inference_config: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        ...


class BedrockConverseClient:
    """Production Bedrock Runtime client using boto3 and the Converse API."""

    def __init__(
        self,
        region_name: str = DEFAULT_REGION,
        profile_name: Optional[str] = None,
        model_id: str = DEFAULT_MODEL_ID,
        boto_client: Optional[Any] = None,
    ) -> None:
        self.region_name = region_name
        self.model_id = model_id

        if boto_client is not None:
            self._client = boto_client
        else:
            self._client = self._init_boto_client(region_name, profile_name)

    @staticmethod
    def _init_boto_client(region_name: str, profile_name: Optional[str] = None) -> Any:
        import boto3
        from botocore.exceptions import ProfileNotFound

        # Priority: explicit profile -> env var -> "stayon" profile -> default session
        target_profile = profile_name or os.getenv("AWS_PROFILE")
        if target_profile:
            try:
                session = boto3.Session(profile_name=target_profile, region_name=region_name)
                return session.client("bedrock-runtime", region_name=region_name)
            except ProfileNotFound:
                pass

        # Try 'stayon' profile if available, otherwise default credentials
        try:
            session = boto3.Session(profile_name="stayon", region_name=region_name)
            return session.client("bedrock-runtime", region_name=region_name)
        except ProfileNotFound:
            return boto3.client("bedrock-runtime", region_name=region_name)

    def converse(
        self,
        messages: List[Dict[str, Any]],
        system: Optional[List[Dict[str, str]]] = None,
        inference_config: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        target_model = model_id or self.model_id
        kwargs: Dict[str, Any] = {
            "modelId": target_model,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if inference_config:
            kwargs["inferenceConfig"] = inference_config

        try:
            response = self._client.converse(**kwargs)
            return response
        except Exception as exc:
            raise BedrockConverseError(f"Bedrock Converse API call failed: {exc}") from exc


class MockBedrockClient:
    """Mock Bedrock client for offline tests and local development."""

    def __init__(
        self,
        default_response_text: Optional[str] = None,
        responses: Optional[List[Union[str, Dict[str, Any], Exception]]] = None,
    ) -> None:
        self.default_response_text = "{}" if default_response_text is None else default_response_text
        self.responses: List[Union[str, Dict[str, Any], Exception]] = list(responses or [])
        self.call_history: List[Dict[str, Any]] = []

    def queue_response(self, response: Union[str, Dict[str, Any], Exception]) -> None:
        self.responses.append(response)

    def get_last_document_block(self) -> Optional[Dict[str, Any]]:
        """Retrieve the document content block from the most recent converse call."""
        if not self.call_history:
            return None
        last_call = self.call_history[-1]
        for msg in last_call.get("messages", []):
            for block in msg.get("content", []):
                if isinstance(block, dict) and "document" in block:
                    return block["document"]
        return None

    def get_last_text_block(self) -> Optional[str]:
        """Retrieve the text prompt block from the most recent converse call."""
        if not self.call_history:
            return None
        last_call = self.call_history[-1]
        for msg in last_call.get("messages", []):
            for block in msg.get("content", []):
                if isinstance(block, dict) and "text" in block:
                    return block["text"]
        return None

    def converse(
        self,
        messages: List[Dict[str, Any]],
        system: Optional[List[Dict[str, str]]] = None,
        inference_config: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        self.call_history.append({
            "model_id": model_id or DEFAULT_MODEL_ID,
            "messages": messages,
            "system": system,
            "inference_config": inference_config,
        })

        if self.responses:
            item = self.responses.pop(0)
            if isinstance(item, Exception):
                raise item
            if isinstance(item, dict):
                text_payload = json.dumps(item)
            else:
                text_payload = str(item)
        else:
            text_payload = self.default_response_text

        return {
            "output": {
                "message": {
                    "role": "assistant",
                    "content": [{"text": text_payload}],
                }
            },
            "stopReason": "end_turn",
            "usage": {"inputTokens": 50, "outputTokens": 50, "totalTokens": 100},
        }


def extract_text_from_converse_response(response: Dict[str, Any]) -> str:
    """Extract assistant message content text from Bedrock Converse response."""
    try:
        content_list = response["output"]["message"]["content"]
        for block in content_list:
            if "text" in block:
                return block["text"]
        raise KeyError("No text block in message content")
    except (KeyError, IndexError, TypeError) as exc:
        raise BedrockConverseError(f"Malformed Converse response structure: {exc}") from exc


def clean_json_markdown(text: str) -> str:
    """Strip markdown code fence wrappers (```json ... ```) from model output."""
    trimmed = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return trimmed
