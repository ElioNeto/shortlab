"""
Unified LLM client supporting Google Gemini and OpenRouter (OpenAI-compatible).

Features:
- Text-only calls: Gemini or OpenRouter (user chooses)
- Multimodal calls (video/image): Gemini only (OpenRouter doesn't support File API)
- Google Search grounding: Gemini only
- Image generation: Gemini only
- Model selection per provider
- Retry with exponential backoff on connection errors
- Fallback model on persistent failures
"""

import os
import re
import json
import time
from typing import Optional

from app_logger import logger

# Default models per provider
DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "openrouter": "google/gemini-2.0-flash-001",
}

# Fallback models for OpenRouter when primary fails
FALLBACK_MODELS = {
    "openrouter": [
        "google/gemma-4-31b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
    ],
    "gemini": [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ],
}

# Retry configuration
MAX_RETRIES = 5
RETRY_BASE_DELAY = 2  # seconds
RETRY_MAX_DELAY = 60  # seconds

# Models that support multimodal (video/image) input via File API
MULTIMODAL_MODELS = {
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-2.0-flash",
}

# Models that support image generation
IMAGE_GEN_MODELS = {
    "gemini-3.1-flash-image-preview",
}


def parse_json_response(text: str):
    """Clean and parse JSON from LLM response text."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Extract JSON object or array
    for open_char, close_char in [('{', '}'), ('[', ']')]:
        start = text.find(open_char)
        end = text.rfind(close_char)
        if start != -1 and end != -1 and end > start:
            text = text[start:end + 1]
            break

    return json.loads(text)


def retry_with_backoff(func, max_retries=MAX_RETRIES, base_delay=RETRY_BASE_DELAY, max_delay=RETRY_MAX_DELAY):
    """Decorator for retrying LLM calls with exponential backoff."""
    def wrapper(*args, **kwargs):
        last_exception = None
        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                error_msg = str(e).lower()
                # Only retry on connection/transient errors
                retryable = any(kw in error_msg for kw in [
                    'connection', 'timeout', 'rate limit', '429', '503',
                    '502', '500', 'overloaded', 'temporarily', 'try again',
                    'econnreset', 'econnrefused', 'network',
                ])
                if not retryable or attempt == max_retries:
                    raise
                
                # Try to extract Retry-After from error
                retry_after = None
                if 'retry_after_seconds' in str(e):
                    try:
                        import re
                        match = re.search(r"'retry_after_seconds':\s*(\d+\.?\d*)", str(e))
                        if match:
                            retry_after = float(match.group(1))
                    except Exception:
                        logger.debug("Failed to parse retry_after_seconds from error response")
                
                if retry_after:
                    delay = min(retry_after + 1, max_delay)
                else:
                    delay = min(base_delay * (2 ** attempt), max_delay)
                
                logger.warning(f"LLM call failed (attempt {attempt + 1}/{max_retries + 1}): {e}. Retrying in {delay:.0f}s...")
                print(f"⚠️ LLM error (attempt {attempt + 1}/{max_retries + 1}). Retrying in {delay:.0f}s...")
                time.sleep(delay)
        raise last_exception
    return wrapper


class LLMClient:
    """Unified LLM client that routes to Gemini or OpenRouter based on config."""

    def __init__(
        self,
        provider: str = "gemini",
        api_key: str = "",
        model: Optional[str] = None,
        openrouter_base_url: str = "https://openrouter.ai/api/v1",
    ):
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model or DEFAULT_MODELS.get(self.provider, DEFAULT_MODELS["openrouter"])
        self.openrouter_base_url = openrouter_base_url
        self._gemini_client = None
        self._openai_client = None

    @property
    def supports_multimodal(self) -> bool:
        """Whether the current provider/model supports video/image input."""
        if self.provider == "gemini":
            return True
        # OpenRouter supports some multimodal via base64, but not File API
        return False

    @property
    def supports_search_grounding(self) -> bool:
        """Whether the current provider supports Google Search grounding."""
        return self.provider == "gemini"

    @property
    def supports_image_generation(self) -> bool:
        """Whether the current provider/model can generate images."""
        return self.provider == "gemini" and self.model in IMAGE_GEN_MODELS

    def _get_gemini_client(self):
        if self._gemini_client is None:
            from google import genai
            self._gemini_client = genai.Client(api_key=self.api_key)
        return self._gemini_client

    def _get_openai_client(self):
        if self._openai_client is None:
            from openai import OpenAI
            self._openai_client = OpenAI(
                api_key=self.api_key,
                base_url=self.openrouter_base_url,
                timeout=60.0,
                max_retries=0,
            )
        return self._openai_client

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_mime_type: Optional[str] = None,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        """Generate text response with retry and fallback."""
        # Try primary model with retry
        try:
            @retry_with_backoff
            def _call():
                return self._generate_text_single(
                    prompt, system_instruction, response_mime_type, max_output_tokens
                )
            return _call()
        except Exception as primary_error:
            logger.warning(f"Primary model {self.model} failed after retries: {primary_error}")
            print(f"⚠️ Primary model failed: {primary_error}")
            
            # Try fallback models
            fallbacks = FALLBACK_MODELS.get(self.provider, [])
            for fallback_model in fallbacks:
                if fallback_model == self.model:
                    continue  # Skip the model that just failed
                logger.info(f"Trying fallback model: {fallback_model}")
                print(f"🔄 Trying fallback model: {fallback_model}")
                try:
                    original_model = self.model
                    self.model = fallback_model
                    
                    @retry_with_backoff
                    def _fallback_call():
                        return self._generate_text_single(
                            prompt, system_instruction, response_mime_type, max_output_tokens
                        )
                    result = _fallback_call()
                    return result
                except Exception as fallback_error:
                    logger.warning(f"Fallback model {fallback_model} also failed: {fallback_error}")
                    continue
                finally:
                    self.model = original_model
            
            # All models failed
            raise Exception(f"All LLM models failed. Last error: {primary_error}")

    def _generate_text_single(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_mime_type: Optional[str] = None,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        """Single attempt at generating text (no retry)."""
        if self.provider == "gemini":
            return self._gemini_text(prompt, system_instruction, response_mime_type, max_output_tokens)
        else:
            return self._openrouter_text(prompt, system_instruction, response_mime_type, max_output_tokens)

    def generate_text_with_video(
        self,
        video_file_obj,
        prompt: str,
        response_mime_type: Optional[str] = None,
    ) -> str:
        """Generate text with video context. Gemini only (File API)."""
        if self.provider != "gemini":
            raise NotImplementedError(
                "Video analysis requires Gemini provider. "
                "Switch to Gemini in Settings for video features."
            )
        return self._gemini_text_with_video(video_file_obj, prompt, response_mime_type)

    def generate_text_with_images(
        self,
        image_parts: list,
        prompt: str,
        response_mime_type: Optional[str] = None,
        response_modalities: Optional[list] = None,
        image_config=None,
    ) -> object:
        """Generate text/images with image context. Gemini only."""
        if self.provider != "gemini":
            raise NotImplementedError(
                "Image analysis requires Gemini provider. "
                "Switch to Gemini in Settings for image features."
            )
        return self._gemini_text_with_images(
            image_parts, prompt, response_mime_type, response_modalities, image_config
        )

    def generate_text_with_search(
        self,
        prompt: str,
        response_mime_type: Optional[str] = None,
    ) -> tuple:
        """Generate text with Google Search grounding. Gemini only.
        Returns (text, grounding_metadata)."""
        if self.provider != "gemini":
            raise NotImplementedError(
                "Web search requires Gemini provider. "
                "Switch to Gemini in Settings for search features."
            )
        return self._gemini_text_with_search(prompt, response_mime_type)

    def upload_video(self, video_path: str):
        """Upload video to Gemini File API. Gemini only."""
        if self.provider != "gemini":
            raise NotImplementedError("Video upload requires Gemini provider.")
        return self._gemini_upload_video(video_path)

    # ── Gemini implementation ──────────────────────────────────────────

    def _gemini_text(self, prompt, system_instruction, response_mime_type, max_output_tokens):
        from google.genai import types

        client = self._get_gemini_client()
        config_kwargs = {}
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type
        if max_output_tokens:
            config_kwargs["max_output_tokens"] = max_output_tokens
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        response = client.models.generate_content(
            model=self.model,
            contents=[prompt],
            config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
        )
        return response.text

    def _gemini_text_with_video(self, video_file_obj, prompt, response_mime_type):
        from google.genai import types

        client = self._get_gemini_client()
        config_kwargs = {}
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type

        response = client.models.generate_content(
            model=self.model,
            contents=[video_file_obj, prompt],
            config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
        )
        return response.text

    def _gemini_text_with_images(self, image_parts, prompt, response_mime_type, response_modalities, image_config):
        from google.genai import types

        client = self._get_gemini_client()
        config_kwargs = {}
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type
        if response_modalities:
            config_kwargs["response_modalities"] = response_modalities
        if image_config:
            config_kwargs["image_config"] = image_config

        response = client.models.generate_content(
            model=self.model,
            contents=image_parts + [prompt],
            config=types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
        )
        return response

    def _gemini_text_with_search(self, prompt, response_mime_type):
        from google.genai import types

        client = self._get_gemini_client()
        config_kwargs = {
            "tools": [types.Tool(google_search=types.GoogleSearch())],
        }
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type

        response = client.models.generate_content(
            model=self.model,
            contents=[prompt],
            config=types.GenerateContentConfig(**config_kwargs),
        )

        # Extract grounding sources
        sources = []
        try:
            metadata = response.candidates[0].grounding_metadata
            if metadata and metadata.grounding_chunks:
                for chunk in metadata.grounding_chunks:
                    if chunk.web:
                        sources.append({"title": chunk.web.title, "url": chunk.web.uri})
        except Exception:
            logger.debug("No grounding metadata available in Gemini response")

        return response.text, sources

    def _gemini_upload_video(self, video_path):
        import os
        import time

        client = self._get_gemini_client()
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        file_upload = client.files.upload(file=video_path)
        while True:
            file_info = client.files.get(name=file_upload.name)
            if file_info.state == "ACTIVE":
                return file_upload
            elif file_info.state == "FAILED":
                raise Exception("Video processing failed by Gemini.")
            time.sleep(2)

    def get_gemini_usage(self, response) -> Optional[dict]:
        """Extract token usage from a Gemini response. Returns None for OpenRouter."""
        if self.provider != "gemini":
            return None
        try:
            usage = response.usage_metadata
            if usage:
                return {
                    "input_tokens": usage.prompt_token_count,
                    "output_tokens": usage.candidates_token_count,
                }
        except Exception:
            logger.debug("Could not extract usage metadata from Gemini response")
        return None

    # ── OpenRouter (OpenAI-compatible) implementation ──────────────────

    def _openrouter_text(self, prompt, system_instruction, response_mime_type, max_output_tokens):
        client = self._get_openai_client()

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": self.model,
            "messages": messages,
            "timeout": 60.0,
        }
        if max_output_tokens:
            kwargs["max_tokens"] = max_output_tokens
        # For JSON mode, use response_format
        if response_mime_type == "application/json":
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = client.chat.completions.create(**kwargs)
            if not response.choices or not response.choices[0].message.content:
                raise Exception("Empty response from OpenRouter")
            return response.choices[0].message.content
        except Exception as e:
            error_msg = str(e).lower()
            if "connection" in error_msg or "timeout" in error_msg:
                logger.error(f"OpenRouter connection/timeout error: {e}")
                print(f"❌ OpenRouter connection error: {e}")
            raise
