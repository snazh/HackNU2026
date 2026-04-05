# src/agent/session.py

_sessions: dict[str, dict] = {}


def get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {"history": [], "canvas_state": None}
    return _sessions[session_id]


def update_session_groq(session_id: str, user_text: str, bot_message):
    session = get_session(session_id)

    # Добавляем сообщение пользователя
    session["history"].append({"role": "user", "content": user_text})

    # Готовим сообщение ассистента
    msg_dict = {"role": "assistant", "content": bot_message.content}

    # Если были вызовы инструментов, сохраняем их (важно для работы модели)
    if bot_message.tool_calls:
        msg_dict["tool_calls"] = [
            {
                "id": t.id,
                "type": "function",
                "function": {
                    "name": t.function.name,
                    "arguments": t.function.arguments,
                },
            }
            for t in bot_message.tool_calls
        ]

    session["history"].append(msg_dict)

    # Ограничиваем историю, чтобы не превышать лимиты токенов
    if len(session["history"]) > 8:
        session["history"] = session["history"][-8:]


def get_history(session_id: str) -> list:
    return get_session(session_id)["history"]


def clear_session(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]
