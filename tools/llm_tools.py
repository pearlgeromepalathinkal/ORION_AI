"""
Centralized LLM interface for the ORION-AI LangGraph workflow.
Every LangGraph agent should interact with the language model only
through this class.
"""

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from ollama import Client

load_dotenv(
    dotenv_path=Path(__file__).resolve().parent.parent / ".env"
)


class LLMTool:
    """
    Centralized LLM client.

    All LangGraph agents communicate with the LLM
    through this class.
    """

    def __init__(self) -> None:
        """
        Initialize the Ollama client.
        """

        self.host = os.getenv(
            "OLLAMA_HOST",
            "http://localhost:11434"
        )

        self.model = os.getenv(
            "OLLAMA_MODEL",
            "qwen3:8b"
        )

        self.client = Client(
            host=self.host,
            timeout=60.0
        )
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.last_temperature = 0.0

    def get_usage(self) -> dict[str, int]:
        return {
            "prompt_tokens": self.total_prompt_tokens,
            "completion_tokens": self.total_completion_tokens,
            "total_tokens": self.total_prompt_tokens + self.total_completion_tokens,
        }

    def reset_usage(self) -> None:
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def invoke_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> str:
        """
        Generate a natural language response.
        """

        try:

            response = self.client.chat(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                options={
                    "temperature": temperature
                }
            )

            self.last_temperature = temperature
            self.total_prompt_tokens += getattr(response, "prompt_eval_count", 0) or 0
            self.total_completion_tokens += getattr(response, "eval_count", 0) or 0

            text = response.message.content.strip()

            if "</think>" in text:
                text = text.split("</think>", 1)[1].strip()

            return text

        except Exception as e:

            raise RuntimeError(
                f"Ollama text generation failed: {str(e)}"
            )

    def invoke_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        """
        Generate a structured JSON response.
        """

        try:

            response = self.client.chat(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"{system_prompt}\n\n"
                            "Return ONLY valid JSON.\n"
                            "Do not use markdown.\n"
                            "Do not explain anything."
                        ),
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                options={
                    "temperature": temperature
                }
            )

            self.last_temperature = temperature
            self.total_prompt_tokens += getattr(response, "prompt_eval_count", 0) or 0
            self.total_completion_tokens += getattr(response, "eval_count", 0) or 0

            text = response.message.content.strip()

            if "</think>" in text:
                text = text.split(
                    "</think>",
                    1
                )[1].strip()

            if text.startswith("```json"):
                text = (
                    text.replace(
                        "```json",
                        ""
                    )
                    .replace(
                        "```",
                        ""
                    )
                    .strip()
                )

            elif text.startswith("```"):
                text = (
                    text.replace(
                        "```",
                        ""
                    )
                    .strip()
                )

            try:

                return json.loads(text)

            except json.JSONDecodeError as e:

                raise RuntimeError(
                    f"\nInvalid JSON returned by {self.model}\n\n{text}"
                ) from e

        except Exception as e:

            raise RuntimeError(
                f"Ollama JSON generation failed: {str(e)}"
            )

    def health_check(
        self,
    ) -> tuple[bool, str]:
        """
        Verify Ollama connectivity.
        """

        try:

            response = self.client.chat(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": "Reply with exactly: OK"
                    }
                ]
            )

            return (
                True,
                response.message.content.strip()
            )

        except Exception as e:

            return (
                False,
                str(e)
            )

    def is_available(
        self,
    ) -> bool:
        """
        Check whether the configured model is available.
        """

        status, _ = self.health_check()

        return status

    def get_model(
        self,
    ) -> str:
        """
        Return the configured model.
        """

        return self.model

    def get_provider(
        self,
    ) -> str:
        """
        Return the active provider.
        """

        return "Ollama"

    def get_host(
        self,
    ) -> str:
        """
        Return the configured Ollama host.
        """

        return self.host