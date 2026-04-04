# src/agent/tools.py
GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_sticky_note",
            "description": "Place a new sticky note on the canvas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "text": {"type": "string"},
                    "width": {"type": "number", "default": 200},
                    "height": {"type": "number", "default": 200},
                    "color": {
                        "type": "string",
                        "enum": ["yellow", "pink", "blue", "green", "white"],
                    },
                },
                "required": ["x", "y", "text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_text",
            "description": "Add a standalone text label or heading.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "text": {"type": "string"},
                    "fontSize": {"type": "number", "default": 16},
                    "bold": {"type": "boolean"},
                },
                "required": ["x", "y", "text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_arrow",
            "description": "Connect two existing shapes by their IDs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_id": {"type": "string"},
                    "to_id": {"type": "string"},
                    "label": {"type": "string"},
                },
                "required": ["from_id", "to_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_shape",
            "description": "Move an existing shape to a new position.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                },
                "required": ["id", "x", "y"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_shape",
            "description": "Remove a shape from the canvas by its ID.",
            "parameters": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
            },
        },
    },
]
