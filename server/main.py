"""
FastAPI Server for Privacy Vision Agent
"""

import sys
import os
import time
import base64
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from server.redaction_parser import RedactionParser
    from server.vlm_handler import VLMHandler, AgentResponse
except ModuleNotFoundError:
    from redaction_parser import RedactionParser
    from vlm_handler import VLMHandler, AgentResponse

app = FastAPI(
    title="Privacy Vision Agent Server",
    version="2.0.0",
    description="Zero-Raw-PII Server Backend with Redaction Protocol & Qwen2-VL / Groq VLM Reasoning"
)

# CORS middleware for WebExtension cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate handler
vlm_handler = VLMHandler()

@app.get("/health")
async def health_check():
    """Health check endpoint for service health verification"""
    return {
        "status": "ok",
        "model": vlm_handler.model_name,
        "system": "PlutoAI Vision Agent Gateway",
        "zero_raw_pii": True
    }

@app.post("/agent/context", response_model=AgentResponse)
async def handle_agent_context(
    image: UploadFile = File(..., description="Sanitized screenshot (PNG)"),
    metadata: str = Form(..., description="Redaction protocol JSON string")
):
    """
    Primary endpoint for processing sanitized context from the browser extension.
    1. Parses metadata JSON.
    2. Builds natural language VLM prompt using RedactionParser.
    3. Executes VLM reasoning via Qwen2-VL / Groq.
    4. Returns validated ActionCommand array.
    """
    start_time = time.time()

    try:
        meta_dict = json.loads(metadata)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {str(e)}")

    # 1. Read and base64 encode sanitized image
    image_bytes = await image.read()
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')

    # 2. Build VLM context prompt from Redaction Protocol JSON
    context_prompt = RedactionParser.build_context(meta_dict)

    # 3. Request ActionCommands from VLM
    actions = await vlm_handler.get_actions(image_b64, context_prompt)

    latency_ms = int((time.time() - start_time) * 1000)
    reasoning = actions[0].thought if actions and actions[0].thought else "Sanitized context processed. Executing next action."

    return AgentResponse(
        actions=actions,
        reasoning=reasoning,
        latency_ms=latency_ms
    )

if __name__ == "__main__":
    print("🚀 Starting Privacy Vision Agent Server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
