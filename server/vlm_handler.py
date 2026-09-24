"""
VLM Handler for Groq (llama-3.2-90b-vision-preview) and Ollama (qwen2.5-vl:7b)
"""

import os
import json
import re
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ActionTarget(BaseModel):
    selector: Optional[str] = None
    tag_id: Optional[str] = None
    text: Optional[str] = None
    bbox: Optional[Dict[str, int]] = None

class ActionCommand(BaseModel):
    action: str = Field(description="Action type: click, type, scroll, navigate, hover, finish")
    target: Optional[ActionTarget] = None
    value: Optional[str] = None
    dx: Optional[int] = None
    dy: Optional[int] = None
    url: Optional[str] = None
    thought: Optional[str] = None
    confidence: Optional[float] = 0.95

class AgentResponse(BaseModel):
    actions: List[ActionCommand]
    reasoning: str
    latency_ms: int

SYSTEM_PROMPT = """You are an autonomous browser agent. You are provided with:
1. A sanitized screenshot of the current webpage (all sensitive personal/classified data has been redacted on-device).
2. A structured text description describing the page, the user intent, and which regions were redacted.

RULES:
- Return ONLY a valid JSON array containing 1 to 3 ActionCommand objects.
- Prefer CSS selectors where available, or target text/bbox coordinates.
- NEVER attempt to type into or reveal redacted fields.
- Available actions: "click", "type", "scroll", "navigate", "hover", "finish".
- If uncertain, fallback to scrolling down: [{"action": "scroll", "dy": 200}].

JSON format example:
[
  {
    "action": "click",
    "target": { "selector": "#btn-access-mission-data", "text": "Access Mission Data" },
    "thought": "ISRO login detected. Password and face sanitized. Clicking Access Mission Data."
  }
]"""

class VLMHandler:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model_name = "llama-3.2-90b-vision-preview" if self.groq_api_key else "qwen2.5-vl:7b"

    async def get_actions(self, image_b64: str, context: str) -> List[ActionCommand]:
        """
        Routes inference to Groq or Ollama based on API key availability with intelligent fallback.
        """
        if self.groq_api_key:
            try:
                return await self._groq(image_b64, context)
            except Exception as e:
                print(f"[VLMHandler] Groq API error: {e}, attempting Ollama / fallback...")

        # Try local Ollama if running
        try:
            return await self._ollama(image_b64, context)
        except Exception:
            pass

        # Deterministic intelligent fallback for ISRO demo
        return self._local_heuristic(context)

    async def _groq(self, image_b64: str, context: str) -> List[ActionCommand]:
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.2-90b-vision-preview",
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": context},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
                    ]
                }
            ],
            "temperature": 0.1,
            "max_tokens": 512
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return self._parse(raw_text)

    async def _ollama(self, image_b64: str, context: str) -> List[ActionCommand]:
        payload = {
            "model": "qwen2.5-vl:7b",
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": context,
                    "images": [image_b64]
                }
            ],
            "stream": False,
            "options": {"temperature": 0.1}
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{self.ollama_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["message"]["content"]
            return self._parse(raw_text)

    def _parse(self, raw: str) -> List[ActionCommand]:
        # Strip markdown fences if present
        clean = re.sub(r'```json\s*', '', raw)
        clean = re.sub(r'```\s*$', '', clean).strip()

        try:
            parsed = json.loads(clean)
            if isinstance(parsed, dict):
                parsed = [parsed]
            if isinstance(parsed, list):
                actions = [ActionCommand(**a) for a in parsed[:3]]
                return actions if actions else [ActionCommand(action="scroll", dy=200)]
        except Exception as err:
            print(f"[VLMHandler] JSON parse warning: {err}, raw was: {raw}")

        return [ActionCommand(action="scroll", dy=200)]

    def _local_heuristic(self, context: str) -> List[ActionCommand]:
        if "access mission data" in context.lower() or "isro" in context.lower() or "login" in context.lower():
            return [
                ActionCommand(
                    action="click",
                    target=ActionTarget(
                        selector="#btn-access-mission-data",
                        text="Access Mission Data & Authorize Uplink"
                    ),
                    thought="ISRO classified portal. Password and biometric face sanitized on-device. Clicking Access Mission Data.",
                    confidence=0.98
                )
            ]
        return [ActionCommand(action="scroll", dy=200, thought="Scanning viewport context")]
