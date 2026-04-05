import os
import asyncio
import json
import httpx
from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
# init
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434/api/generate")

class DocumentContext(BaseModel):
    text: str

class AIProcessRequest(BaseModel):
    task: str # 'autocomplete', 'refine', 'rephrase', 'hindi', 'custom'
    context: str
    customPrompt: str = ""

async def fake_llm_stream(context_text: str):
    """Fallback generator just in case Ollama crashes"""
    fake_completion = f"\n\n[MOCK AUTO-COMPLETE] This reads great! Expanding on your thoughts: {context_text[:20]}..."
    for char in fake_completion:
        await asyncio.sleep(0.04)
        yield char
    yield "[DONE]"

# Advanced streaming processor for universal AI actions
@app.post("/ai/process")
async def ai_process(request: Request, body: AIProcessRequest):
    """
    Context-Aware LLM endpoint supporting explicit tasks like refinement & translation.
    """
    
    prompt_instruction = ""
    ctx = body.context.strip()
    
    if body.task == 'autocomplete':
        prompt_instruction = f"You are a professional co-writer. Continue the following text naturally and concisely. Do not repeat the existing text. Respond ONLY with the continuation.\n\nContext:\n{ctx}"
    elif body.task == 'refine':
        prompt_instruction = f"Fix all grammar and spelling errors in the following text, and improve the professional tone. Respond ONLY with the corrected text and nothing else.\n\nText:\n{ctx}"
    elif body.task == 'rephrase':
        prompt_instruction = f"Rewrite the following text for better clarity and impact. Respond ONLY with the rewritten text seamlessly.\n\nText:\n{ctx}"
    elif body.task == 'hindi':
        prompt_instruction = f"Translate the following text accurately into Hindi script (Devanagari). Ensure the translation holds cultural and contextual integrity. Respond ONLY with the Hindi text, without any english explanations.\n\nText:\n{ctx}"
    elif body.task == 'custom':
        prompt_instruction = f"Context:\n{ctx}\n\nUser Request: {body.customPrompt}\n\nRespond ONLY to the user request based on the context. Provide output that can be directly inserted into a document."
    else:
        prompt_instruction = f"Help me with this text:\n{ctx}"

    async def event_generator():
        payload = {
            "model": "llama3.2",
            "prompt": prompt_instruction,
            "stream": True
        }
    
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", OLLAMA_URL, json=payload, timeout=60.0) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    # EventSourceResponse auto-wraps: yield raw token string
                                    yield json.dumps(data["response"])
                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            print(f"[OLLAMA EXT ERROR]: {e}")
            # Fallback mock runs using the captured context perfectly
            async for char in fake_llm_stream(body.context):
                yield json.dumps(char)

        # EventSourceResponse wraps this as: data: [DONE]\n\n
        yield "[DONE]"

    # Crucial for SSE compatibility with the React Fetch Stream
    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
