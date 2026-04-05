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
                    "note_size": {
                        "type": "string",
                        "enum": ["s", "m", "l", "xl"],
                        "description": "Sticky size preset.",
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
                    "dash": {
                        "type": "string",
                        "enum": ["solid", "dashed", "dotted", "draw"],
                        "description": "Line style (connectors, separators).",
                    },
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
    {
        "type": "function",
        "function": {
            "name": "add_image_from_url",
            "description": (
                "Place a raster image on the canvas from a public HTTPS URL "
                "(e.g. user pasted a link, or a generated image URL). "
                "Pick x,y away from existing shapes when possible."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "url": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "width": {"type": "number"},
                    "height": {"type": "number"},
                },
                "required": ["url", "x", "y"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_point_arrow",
            "description": (
                "Draw an arrow between two page coordinates (no existing shapes required). "
                "Use for flowchart links, annotations, or labels along the arrow."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x1": {"type": "number"},
                    "y1": {"type": "number"},
                    "x2": {"type": "number"},
                    "y2": {"type": "number"},
                    "label": {"type": "string"},
                    "color": {"type": "string", "enum": _FRAME_COLORS},
                    "bend": {
                        "type": "number",
                        "description": "Curvature hint; 0 is straight.",
                    },
                },
                "required": ["x1", "y1", "x2", "y2"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_polyline",
            "description": (
                "Chain of straight segments through waypoints (same style as line tool). "
                "Use for L-shaped connectors or multi-segment guides."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "points": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "x": {"type": "number"},
                                "y": {"type": "number"},
                            },
                            "required": ["x", "y"],
                        },
                        "description": "At least two {x,y} points in order.",
                    },
                    "color": {"type": "string", "enum": _FRAME_COLORS},
                    "dash": {
                        "type": "string",
                        "enum": ["solid", "dashed", "dotted", "draw"],
                    },
                },
                "required": ["points"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_table",
            "description": (
                "Create a titled grid of labeled cells (comparison matrix, RACI, simple data). "
                "Provide rows, cols, top-left x,y, cell size, and cells as row-major strings."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "rows": {"type": "integer", "minimum": 1, "maximum": 12},
                    "cols": {"type": "integer", "minimum": 1, "maximum": 12},
                    "cell_width": {"type": "number", "default": 120},
                    "cell_height": {"type": "number", "default": 48},
                    "name": {"type": "string"},
                    "header_row": {
                        "type": "boolean",
                        "description": "If true, first row is styled as headers (still in cells array first).",
                    },
                    "cells": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Row-major values, length rows * cols (use empty strings for blanks).",
                    },
                },
                "required": ["x", "y", "rows", "cols", "cells"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_flow_sequence",
            "description": (
                "Build a row or column of flowchart nodes with arrows between consecutive steps. "
                "kind per step: rectangle (process), diamond (decision), ellipse (start/end)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "direction": {
                        "type": "string",
                        "enum": ["vertical", "horizontal"],
                    },
                    "gap": {
                        "type": "number",
                        "description": "Center-to-center spacing between steps.",
                    },
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "kind": {
                                    "type": "string",
                                    "enum": ["rectangle", "diamond", "ellipse"],
                                },
                            },
                            "required": ["text"],
                        },
                    },
                },
                "required": ["x", "y", "direction", "steps"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resize_shape",
            "description": "Change width/height of a geo, frame, text, or note shape by id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "width": {"type": "number"},
                    "height": {"type": "number"},
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_shape_text",
            "description": (
                "Replace visible text on a sticky note, geo shape, or text shape. "
                "Use canvas shape id from the snapshot."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["id", "text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "group_shapes",
            "description": (
                "Wrap several existing shapes in a group for moving together. "
                "Pass shape ids from the current canvas snapshot."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "shape_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                    },
                },
                "required": ["shape_ids"],
            },
        },
    },
]
