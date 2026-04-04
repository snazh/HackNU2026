# src/agent/agent.py
import json
import uuid

from groq import AsyncGroq
from src.agent.models import AgentRequest, AgentResponse, CanvasOperation
from src.agent.session import get_history, update_session_groq
from src.agent.tools import GROQ_TOOLS
from src.config import settings

client = AsyncGroq(api_key=settings.grok.KEY)
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are a spatial brainstorming collaborator living on a shared canvas.
1. Reason about layout — avoid overlapping shapes.
2. Call tools to act on the canvas.
3. IMPORTANT: When creating a new shape (sticky_note, text, etc.), you MUST provide a unique temporary ID (e.g., "new_1", "note_5").
4. If you add an arrow to a new shape, use the SAME ID you gave to that shape.
5. Keep your agent_text short (1 sentence).
""".strip()


def _build_user_message(prompt: str, canvas_state) -> str:
    shapes = [s.model_dump(exclude_none=True) for s in canvas_state.shapes]
    return (
        f"Canvas size: {canvas_state.width} x {canvas_state.height}\n"
        f"Current shapes: {json.dumps(shapes)}\n"
        f"Instruction: {prompt}"
    )


async def run_agent(request: AgentRequest) -> AgentResponse:
    history = get_history(request.session_id)
    user_message = _build_user_message(request.prompt, request.canvas_state)

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": user_message},
        ],
        tools=GROQ_TOOLS,
        tool_choice="auto",
        temperature=0.1,
    )

    message = response.choices[0].message
    operations = []

    if message.tool_calls:
        for tool_call in message.tool_calls:
            args = json.loads(tool_call.function.arguments)

            # ХАК: Если нейронка забыла ID для создания объекта, генерим его сами
            if "id" not in args and tool_call.function.name != "add_arrow":
                args["id"] = f"temp_{uuid.uuid4().hex[:6]}"

            operations.append(CanvasOperation(tool=tool_call.function.name, **args))

    agent_text = message.content or "Done! I've updated the canvas."

    # Сохраняем историю
    update_session_groq(
        session_id=request.session_id, user_text=user_message, bot_message=message
    )

    return AgentResponse(agent_text=agent_text, operations=operations)
