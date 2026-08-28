from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AIResponse:
    content: str
    model: str
    used_fallback: bool = False


class AIInterface(ABC):
    @abstractmethod
    def complete(self, user_prompt: str, system_prompt: str = "") -> AIResponse:
        """Synchronous completion — FastAPI runs sync routes in threadpool."""
        pass
