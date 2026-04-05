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
You are a teammate on a shared brainstorming canvas — not a sidebar chatbot. You SEE the canvas state in each message.
1. Ground every action in the current layout: avoid overlapping, align with existing frames and notes when extending ideas.
2. Use tools to CREATE, MOVE, or CONNECT elements directly on the canvas.
3. IMPORTANT: When creating a new shape, you MUST provide a unique temporary ID (e.g., "new_1", "node_a").
4. If you add an arrow between new shapes, use the SAME IDs you gave those shapes.
5. Diagrams & flowcharts: add_flow_sequence (auto-links steps vertically or horizontally), add_geo_shape,
   add_point_arrow (arrow between coordinates), add_arrow (between shapes by id), add_line / add_polyline (dashed ok),
   add_frame for swimlanes/sections, add_sticky_note (note_size s–xl) and add_text for labels.
6. Tables & matrices: add_table with rows, cols, and cells[] row-major.
7. Editing: update_shape_text, resize_shape, move_shape, delete_shape, group_shapes to bundle items.
8. If the user provides a public image URL, add_image_from_url near related content.
9. Keep agent_text to one short sentence (what you did for the group).
""".strip()


def _contribution_hint(mode: str | None) -> str:
    if not mode:
        return ""
    m = mode.strip().lower()
    if m == "light":
        return "\nContribution level: use at most 2–3 small edits (fewer shapes).\n"
    if m == "bold":
        return "\nContribution level: you may add several frames, notes, or connectors.\n"
    return "\nContribution level: balanced — a few purposeful edits.\n"


def _build_user_message(
    prompt: str, canvas_state, agent_focus: str | None, contribution_mode: str | None
) -> str:
    shapes = [s.model_dump(exclude_none=True) for s in canvas_state.shapes]
    focus = (
        f"\nUser session focus (honor if relevant): {agent_focus.strip()}\n"
        if agent_focus and agent_focus.strip()
        else ""
    )
    contrib = _contribution_hint(contribution_mode)
    return (
        f"Canvas size: {canvas_state.width} x {canvas_state.height}\n"
        f"Current shapes: {json.dumps(shapes)}\n"
        f"Instruction: {prompt}"
        f"{focus}"
        f"{contrib}"
    )


async def run_agent(request: AgentRequest) -> AgentResponse:
    history = get_history(request.session_id)
    user_message = _build_user_message(
        request.prompt,
        request.canvas_state,
        request.agent_focus,
        request.contribution_mode,
    )

    temp = 0.1
    if (request.contribution_mode or "").strip().lower() == "bold":
        temp = 0.35

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": user_message},
        ],
        tools=GROQ_TOOLS,
        tool_choice="auto",
        temperature=temp,
    )

    message = response.choices[0].message
    operations = []

    if message.tool_calls:
        for tool_call in message.tool_calls:
            args = json.loads(tool_call.function.arguments)

            # If the model omitted an id for a created shape, assign one (not for tools that don't use id).
            _no_id = frozenset(
                {"add_arrow", "group_shapes", "update_shape_text", "resize_shape", "delete_shape"}
            )
            if "id" not in args and tool_call.function.name not in _no_id:
                args["id"] = f"temp_{uuid.uuid4().hex[:6]}"

            operations.append(CanvasOperation(tool=tool_call.function.name, **args))

    agent_text = message.content or "Done! I've updated the canvas."

    # Сохраняем историю
    update_session_groq(
        session_id=request.session_id, user_text=user_message, bot_message=message
    )

    return AgentResponse(agent_text=agent_text, operations=operations)
