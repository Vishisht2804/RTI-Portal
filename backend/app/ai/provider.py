"""
OpenAI provider — primary AI engine.
Hackathon brief requirement: powered by an OpenAI model.
"""
import logging
from openai import OpenAI
from app.ai.interface import AIInterface, AIResponse
from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIProvider(AIInterface):
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.LLM_MODEL

    def complete(self, user_prompt: str, system_prompt: str = "") -> AIResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1500,
            )
            return AIResponse(
                content=response.choices[0].message.content,
                model=self.model,
            )
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise


def get_ai_provider() -> AIInterface:
    """Dependency — returns the configured provider, or raises clearly if key missing."""
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set — AI calls will use fallbacks only")
    return OpenAIProvider()
