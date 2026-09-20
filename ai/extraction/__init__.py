"""Document extraction module for StayOn AI supporting Amazon Bedrock and Google Gemini."""

from __future__ import annotations

import os
from typing import Any, Optional, Union

from ai.extraction.bedrock_extractor import (
    BedrockDocumentExtractor,
    DocumentExtractionResult,
    ExtractionBedrockError,
    ExtractionError,
    ExtractionParseError,
    ExtractionSchemaError,
    SUPPORTED_DOCUMENT_TYPES,
)
from ai.extraction.gemini_extractor import (
    GeminiDocumentExtractor,
    GeminiExtractionError,
    GeminiExtractionParseError,
    GeminiExtractionSchemaError,
)
from ai.providers.gemini_client import GeminiError


def get_document_extractor(
    provider: Optional[str] = None,
    **kwargs: Any,
) -> Union[BedrockDocumentExtractor, GeminiDocumentExtractor]:
    """Factory to get the configured document extractor.

    Checks the `provider` argument or `AI_PROVIDER` environment variable.
    Default: 'bedrock' (maintaining existing default behavior).
    Options: 'bedrock', 'gemini'.

    Args:
        provider: Explicit provider override ('bedrock' or 'gemini').
        **kwargs: Arguments passed directly to the extractor constructor.

    Returns:
        An instance of BedrockDocumentExtractor or GeminiDocumentExtractor.
    """
    chosen = (provider or os.getenv("AI_PROVIDER", "bedrock")).strip().lower()
    if chosen == "gemini":
        return GeminiDocumentExtractor(**kwargs)
    elif chosen == "bedrock":
        return BedrockDocumentExtractor(**kwargs)
    else:
        raise ValueError(
            f"Unsupported AI_PROVIDER '{chosen}'. Supported providers: 'bedrock', 'gemini'"
        )


__all__ = [
    # Bedrock
    "BedrockDocumentExtractor",
    "DocumentExtractionResult",
    "ExtractionError",
    "ExtractionSchemaError",
    "ExtractionParseError",
    "ExtractionBedrockError",
    "SUPPORTED_DOCUMENT_TYPES",
    # Gemini
    "GeminiDocumentExtractor",
    "GeminiError",
    "GeminiExtractionError",
    "GeminiExtractionParseError",
    "GeminiExtractionSchemaError",
    # Factory
    "get_document_extractor",
]
