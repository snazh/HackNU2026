# src/agent/tools.py

# Matches tldraw geo kinds (TLGeoShapeGeoStyle)
_GEO_KINDS = [
    "rectangle",
    "ellipse",
    "triangle",
    "diamond",
    "cloud",
    "hexagon",
    "pentagon",
    "octagon",
    "star",
    "trapezoid",
    "oval",
    "heart",
    "rhombus",
    "rhombus-2",
    "arrow-up",
    "arrow-down",
    "arrow-left",
    "arrow-right",
    "check-box",
    "x-box",
]

_FILL_STYLES = ["none", "solid", "semi", "pattern", "fill", "lined-fill"]

_FRAME_COLORS = [
    "black",
    "blue",
    "green",
    "grey",
    "light-blue",
    "light-green",
    "light-red",
    "light-violet",
    "orange",
    "red",
    "violet",
    "yellow",
    "white",
]

GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_sticky_note",
            "description": "Place a new sticky note on the canvas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
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
            "name": "add_geo_shape",
            "description": (
                "Add a geometric shape (rectangle, circle/ellipse, triangle, diamond, "
                "cloud, hexagon, star, arrows, etc.) with optional label text. "
                "Use diamond for decisions, ellipse for start/end in flowcharts."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "geo": {
                        "type": "string",
                        "enum": _GEO_KINDS,
                        "description": "Shape kind; ellipse reads as circle/oval.",
                    },
                    "width": {"type": "number", "default": 160},
                    "height": {"type": "number", "default": 120},
                    "text": {"type": "string"},
                    "color": {"type": "string", "enum": _FRAME_COLORS},
                    "fill": {"type": "string", "enum": _FILL_STYLES},
                },
                "required": ["x", "y", "geo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_frame",
            "description": (
                "Add a titled frame (section / swimlane) to group content on the canvas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "width": {"type": "number"},
                    "height": {"type": "number"},
                    "name": {"type": "string"},
                    "color": {"type": "string", "enum": _FRAME_COLORS},
                },
                "required": ["x", "y", "width", "height"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_line",
            "description": (
                "Draw a straight line segment between two page coordinates "
                "(connectors, separators, simple links)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x1": {"type": "number"},
                    "y1": {"type": "number"},
                    "x2": {"type": "number"},
                    "y2": {"type": "number"},
                    "color": {"type": "string", "enum": _FRAME_COLORS},
                },
                "required": ["x1", "y1", "x2", "y2"],
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
                    "id": {"type": "string"},
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
