import json
import asyncio
from google import genai
from google.genai import types
from google.api_core.exceptions import ResourceExhausted

from src.config import settings
from src.agent.models import AgentRequest, AgentResponse, CanvasOperation
from src.agent.tools import CANVAS_TOOLS
from src.agent.session import get_history, update_session

client = genai.Client(api_key=settings.gemini)
MODEL = "gemini-2.0-flash"

# ── System prompt ────────────────────────────────────────────────────────────
# Your teammate owns the content of this string.
# You own the surrounding infrastructure.
SYSTEM_PROMPT = """
You are a spatial brainstorming collaborator living on a shared canvas.
You have full awareness of the canvas: every shape's ID, position, size, and label is given to you.

When the user gives you an instruction:
1. Reason about the existing layout — avoid overlapping shapes.
2. Call one or more canvas tools to act spatially on the canvas.
3. Always call at least one tool. Never respond with text only.
4. Keep your agent_text short (1-2 sentences max).
5. Use exact shape IDs from the canvas state when referencing existing shapes.
6. Coordinates are in canvas units. Canvas dimensions are provided in the context.
""".strip()


def _build_user_message(prompt: str, canvas_state) -> str:
    """Combine the user prompt with a structured canvas context."""
    shapes_json = json.dumps(
        [s.model_dump(exclude_none=True) for s in canvas_state.shapes],
        indent=2
    )
    return (
        f"Canvas size: {canvas_state.width} x {canvas_state.height}\n"
        f"Current shapes:\n{shapes_json}\n\n"
        f"Instruction: {prompt}"
    )


def _parse_operations(response: types.GenerateContentResponse) -> list[CanvasOperation]:
    """Extract all function_call parts from the Gemini response."""
    operations = []

    if not response.candidates:
        return operations

    for part in response.candidates[0].content.parts:
        if part.function_call:
            fc = part.function_call
            args = dict(fc.args) if fc.args else {}
            operations.append(
                CanvasOperation(tool=fc.name, **args)
            )

    return operations


def _parse_text(response: types.GenerateContentResponse) -> str:
    """Extract plain text parts from the Gemini response."""
    if not response.candidates:
        return ""
    texts = [
        part.text
        for part in response.candidates[0].content.parts
        if hasattr(part, "text") and part.text
    ]
    return " ".join(texts).strip()


async def run_agent(request: AgentRequest) -> AgentResponse:
    """
    Main entry point. Your teammate calls this from the WebSocket handler:

        from src.agent.agent import run_agent
        result = await run_agent(request)
    """
    history = get_history(request.session_id)
    user_message = _build_user_message(request.prompt, request.canvas_state)

    contents = [
        *history,
        types.Content(role="user", parts=[types.Part(text=user_message)])
    ]
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[CANVAS_TOOLS],
        temperature=0.4,
    )

    # Retry up to 4 times on 429 with exponential backoff: 5s, 10s, 20s, 40s
    max_retries = 4
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=contents,
                config=config,
            )
            break  # success — exit retry loop
        except ResourceExhausted as e:
            if attempt == max_retries - 1:
                raise RuntimeError(
                    "Gemini API rate limit reached after retries. "
                    "Wait a moment and try again."
                ) from e
            wait = 5 * (2 ** attempt)  # 5, 10, 20, 40 seconds
            print(f"[agent] 429 rate limit — retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
            await asyncio.sleep(wait)

    operations = _parse_operations(response)
    agent_text = _parse_text(response)

    if not agent_text:
        agent_text = "Done."

    update_session(
        session_id=request.session_id,
        user_message=user_message,
        model_response=response,
        canvas_state=request.canvas_state,
    )

    return AgentResponse(agent_text=agent_text, operations=operations)