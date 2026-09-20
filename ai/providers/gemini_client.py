"""Gemini client abstraction for StayOn AI using the modern google-genai SDK.

Supports Google Gemini models (defaulting to gemini-3.6-flash).
Provides an injectable interface and MockGeminiClient for offline testing.
"""

from __future__ import annotations

import json
import os
from typing import Any, List, Optional, Protocol, Union

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


class GeminiError(Exception):
    """Base exception for Gemini API and provider failures."""
    pass


class GeminiClientProtocol(Protocol):
    """Protocol for Gemini client to enable dependency injection and offline testing."""

    def generate_content(
        self,
        contents: Union[str, List[Any]],
        config: Optional[Any] = None,
        model: Optional[str] = None,
    ) -> Any:
        """Generate content from Gemini model."""
        ...


class GeminiClient:
    """Production Gemini client using the modern google.genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[Any] = None,
    ) -> None:
        self._explicit_model = model
        self._api_key = api_key
        self._client = client

    @property
    def model(self) -> str:
        """Current target Gemini model ID."""
        return self._explicit_model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        api_key = self._api_key or os.getenv("GEMINI_API_KEY")
        if not api_key or not str(api_key).strip():
            raise GeminiError(
                "GEMINI_API_KEY environment variable is not set. "
                "Please configure GEMINI_API_KEY or provide an injectable mock client for offline tests."
            )

        try:
            from google import genai
            self._client = genai.Client(api_key=api_key.strip())
            return self._client
        except Exception as exc:
            raise GeminiError(f"Failed to initialize Google GenAI client: {exc}") from exc

    def generate_content(
        self,
        contents: Union[str, List[Any]],
        config: Optional[Any] = None,
        model: Optional[str] = None,
    ) -> Any:
        """Invoke Gemini generate_content using modern google.genai SDK."""
        target_model = model or self.model
        client = self._get_client()

        kwargs: dict[str, Any] = {
            "model": target_model,
            "contents": contents,
        }
        if config is not None:
            kwargs["config"] = config

        try:
            response = client.models.generate_content(**kwargs)
            return response
        except Exception as exc:
            raise GeminiError(f"Gemini generate_content API call failed: {exc}") from exc


class MockGeminiResponse:
    """Mock response object mimicking google.genai response."""

    def __init__(self, text: str = "") -> None:
        self.text = text


class MockGeminiClient:
    """Mock Gemini client for offline tests and local development."""

    def __init__(
        self,
        responses: Optional[List[Any]] = None,
        default_response_text: str = "{}",
    ) -> None:
        self.responses: List[Any] = list(responses) if responses is not None else []
        self.default_response_text = default_response_text
        self.call_history: List[dict[str, Any]] = []

    def queue_response(self, response: Any) -> None:
        """Queue a mock response or exception for subsequent calls."""
        self.responses.append(response)

    def generate_content(
        self,
        contents: Union[str, List[Any]],
        config: Optional[Any] = None,
        model: Optional[str] = None,
    ) -> Any:
        """Record the call and return a queued or default mock response."""
        self.call_history.append({
            "model": model or DEFAULT_GEMINI_MODEL,
            "contents": contents,
            "config": config,
        })

        if self.responses:
            item = self.responses.pop(0)
            if isinstance(item, Exception):
                raise item
            if isinstance(item, str):
                return MockGeminiResponse(text=item)
            if isinstance(item, dict):
                return MockGeminiResponse(text=json.dumps(item))
            return item

        return MockGeminiResponse(text=self.default_response_text)

    def get_last_contents(self) -> Optional[Union[str, List[Any]]]:
        """Convenience helper to retrieve the contents passed to the last call."""
        if not self.call_history:
            return None
        return self.call_history[-1].get("contents")

    def get_last_config(self) -> Optional[Any]:
        """Convenience helper to retrieve the config passed to the last call."""
        if not self.call_history:
            return None
        return self.call_history[-1].get("config")
