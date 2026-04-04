from google.genai import types
from src.agent.models import CanvasState


# In-memory store: session_id -> session data
_sessions: dict[str, dict] = {}


def get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "history": [],        # list of google.genai types.Content
            "canvas_state": None  # last known CanvasState
        }
    return _sessions[session_id]


def update_session(
    session_id: str,
    user_message: str,
    model_response: types.GenerateContentResponse,
    canvas_state: CanvasState,
):
    session = get_session(session_id)

    # Append user turn
    session["history"].append(
        types.Content(role="user", parts=[types.Part(text=user_message)])
    )

    # Append model turn (preserve all parts — text + function calls)
    if model_response.candidates:
        session["history"].append(model_response.candidates[0].content)

    # Update last known canvas state
    session["canvas_state"] = canvas_state


def get_history(session_id: str) -> list[types.Content]:
    return get_session(session_id)["history"]


def get_last_canvas(session_id: str) -> CanvasState | None:
    return get_session(session_id)["canvas_state"]


def clear_session(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]   