"""Gemini and unified provider package for StayOn AI."""

from ai.providers.gemini_client import (
    DEFAULT_GEMINI_MODEL,
    GeminiClient,
    GeminiClientProtocol,
    GeminiError,
    MockGeminiClient,
    MockGeminiResponse,
)
from ai.providers.text_generation import (
    BedrockTextProvider,
    GeminiTextProvider,
    TextGenerationProtocol,
    get_text_provider,
)

__all__ = [
    # Gemini client
    "DEFAULT_GEMINI_MODEL",
    "GeminiClient",
    "GeminiClientProtocol",
    "GeminiError",
    "MockGeminiClient",
    "MockGeminiResponse",
    # Unified text generation
    "TextGenerationProtocol",
    "BedrockTextProvider",
    "GeminiTextProvider",
    "get_text_provider",
]
