"""Text generation provider interface and adapters for StayOn AI.

Provides unified abstractions for Amazon Bedrock and Google Gemini models,
allowing planning generators (GoalGenerator, TaskGenerator, etc.) to remain
cleanly provider-neutral.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Protocol, Union

from ai.client import (
    BedrockClientProtocol,
    BedrockConverseClient,
    BedrockConverseError,
    DEFAULT_MODEL_ID as DEFAULT_BEDROCK_MODEL,
    extract_text_from_converse_response,
)
from ai.providers.gemini_client import (
    DEFAULT_GEMINI_MODEL,
    GeminiClient,
    GeminiClientProtocol,
    GeminiError,
)


class TextGenerationProtocol(Protocol):
    """Protocol for provider-neutral text and structured JSON generation."""

    def generate(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.0,
        model: Optional[str] = None,
    ) -> str:
        """Generate text/JSON output from model given prompt and optional schema."""
        ...


class BedrockTextProvider:
    """Text generation adapter using Amazon Bedrock Converse API."""

    def __init__(
        self,
        client: Optional[BedrockClientProtocol] = None,
        model_id: Optional[str] = None,
    ) -> None:
        self.client = client or BedrockConverseClient()
        self.model_id = model_id or DEFAULT_BEDROCK_MODEL

    def generate(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.0,
        model: Optional[str] = None,
    ) -> str:
        target_model = model or self.model_id
        messages = [
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ]
        inference_config = {
            "temperature": temperature,
            "maxTokens": max_tokens or 1024,
        }

        try:
            response = self.client.converse(
                messages=messages,
                inference_config=inference_config,
                model_id=target_model,
            )
            return extract_text_from_converse_response(response)
        except BedrockConverseError:
            raise
        except Exception as exc:
            raise BedrockConverseError(f"Bedrock converse failed: {exc}") from exc


class GeminiTextProvider:
    """Text generation adapter using Google Gemini SDK with structured output."""

    def __init__(
        self,
        client: Optional[GeminiClientProtocol] = None,
        model: Optional[str] = None,
    ) -> None:
        self.model = model or DEFAULT_GEMINI_MODEL
        self.client = client or GeminiClient(model=self.model)

    @staticmethod
    def _extract_text(response: Any) -> str:
        if hasattr(response, "text") and response.text is not None:
            return response.text
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            if "text" in response:
                return str(response["text"])
            return json.dumps(response)
        raise GeminiError(f"Unable to extract text from Gemini response: {response}")

    def generate(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.0,
        model: Optional[str] = None,
    ) -> str:
        from google.genai import types

        target_model = model or self.model

        config_kwargs: Dict[str, Any] = {
            "temperature": temperature,
        }
        if schema:
            config_kwargs["response_mime_type"] = "application/json"
            # Strip non-OpenAPI $schema while preserving additionalProperties
            config_kwargs["response_json_schema"] = {
                k: v for k, v in schema.items() if not k.startswith("$")
            }
        if max_tokens:
            config_kwargs["max_output_tokens"] = max_tokens

        config = types.GenerateContentConfig(**config_kwargs)

        try:
            response = self.client.generate_content(
                contents=prompt,
                config=config,
                model=target_model,
            )
            return self._extract_text(response)
        except GeminiError:
            raise
        except Exception as exc:
            raise GeminiError(f"Gemini generation failed: {exc}") from exc


def get_text_provider(
    provider: Optional[str] = None,
    client: Optional[Any] = None,
    model: Optional[str] = None,
) -> TextGenerationProtocol:
    """Factory to resolve and instantiate the configured text generation provider.

    Resolution:
    - If `client` is provided:
        - If client implements `generate(...)`, return client directly.
        - If client has `generate_content(...)`, wrap in GeminiTextProvider.
        - If client has `converse(...)`, wrap in BedrockTextProvider.
        - If provider == 'gemini', wrap in GeminiTextProvider.
        - Default to BedrockTextProvider.
    - If `client` is None:
        - Check `provider` or `AI_PROVIDER` env var (default: 'bedrock').
        - 'gemini' -> GeminiTextProvider(model=model)
        - 'bedrock' -> BedrockTextProvider(model_id=model)
        - Otherwise raise ValueError with supported providers.
    """
    if client is not None:
        if hasattr(client, "generate") and callable(client.generate):
            return client
        if hasattr(client, "generate_content") and callable(client.generate_content):
            return GeminiTextProvider(client=client, model=model)
        if hasattr(client, "converse") and callable(client.converse):
            return BedrockTextProvider(client=client, model_id=model)
        if provider and provider.strip().lower() == "gemini":
            return GeminiTextProvider(client=client, model=model)
        return BedrockTextProvider(client=client, model_id=model)

    chosen = (provider or os.getenv("AI_PROVIDER", "bedrock")).strip().lower()
    if chosen == "gemini":
        return GeminiTextProvider(model=model)
    elif chosen == "bedrock":
        return BedrockTextProvider(model_id=model)
    else:
        raise ValueError(
            f"Unsupported AI_PROVIDER '{chosen}'. Supported providers: 'bedrock', 'gemini'"
        )
