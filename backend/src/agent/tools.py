from google.genai import types

CANVAS_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="add_sticky_note",
            description="Place a new sticky note on the canvas with a text idea or insight.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "x":      types.Schema(type=types.Type.NUMBER, description="Left position in canvas units"),
                    "y":      types.Schema(type=types.Type.NUMBER, description="Top position in canvas units"),
                    "width":  types.Schema(type=types.Type.NUMBER, description="Width, default 200"),
                    "height": types.Schema(type=types.Type.NUMBER, description="Height, default 200"),
                    "text":   types.Schema(type=types.Type.STRING, description="Content of the sticky note"),
                    "color":  types.Schema(type=types.Type.STRING, description="One of: yellow, pink, blue, green, white"),
                },
                required=["x", "y", "text"],
            ),
        ),
        types.FunctionDeclaration(
            name="add_text",
            description="Add a standalone text label or heading on the canvas.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "x":        types.Schema(type=types.Type.NUMBER),
                    "y":        types.Schema(type=types.Type.NUMBER),
                    "text":     types.Schema(type=types.Type.STRING),
                    "fontSize": types.Schema(type=types.Type.NUMBER, description="Font size in px, default 16"),
                    "bold":     types.Schema(type=types.Type.BOOLEAN),
                },
                required=["x", "y", "text"],
            ),
        ),
        types.FunctionDeclaration(
            name="add_image",
            description="Place an image on the canvas found by a search query.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "x":      types.Schema(type=types.Type.NUMBER),
                    "y":      types.Schema(type=types.Type.NUMBER),
                    "width":  types.Schema(type=types.Type.NUMBER, description="Default 200"),
                    "height": types.Schema(type=types.Type.NUMBER, description="Default 200"),
                    "query":  types.Schema(type=types.Type.STRING, description="Image search query, be specific"),
                },
                required=["x", "y", "query"],
            ),
        ),
        types.FunctionDeclaration(
            name="add_arrow",
            description="Draw a labeled arrow connecting two existing shapes by their IDs.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "from_id": types.Schema(type=types.Type.STRING, description="ID of the source shape"),
                    "to_id":   types.Schema(type=types.Type.STRING, description="ID of the target shape"),
                    "label":   types.Schema(type=types.Type.STRING, description="Optional label on the arrow"),
                },
                required=["from_id", "to_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="add_frame",
            description="Create a labeled rectangular section or grouping area on the canvas.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "x":      types.Schema(type=types.Type.NUMBER),
                    "y":      types.Schema(type=types.Type.NUMBER),
                    "width":  types.Schema(type=types.Type.NUMBER),
                    "height": types.Schema(type=types.Type.NUMBER),
                    "label":  types.Schema(type=types.Type.STRING),
                    "color":  types.Schema(type=types.Type.STRING),
                },
                required=["x", "y", "width", "height", "label"],
            ),
        ),
        types.FunctionDeclaration(
            name="move_shape",
            description="Move an existing shape to a new x/y position.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "id": types.Schema(type=types.Type.STRING, description="ID of the shape to move"),
                    "x":  types.Schema(type=types.Type.NUMBER),
                    "y":  types.Schema(type=types.Type.NUMBER),
                },
                required=["id", "x", "y"],
            ),
        ),
        types.FunctionDeclaration(
            name="delete_shape",
            description="Remove an existing shape from the canvas by its ID.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "id": types.Schema(type=types.Type.STRING, description="ID of the shape to delete"),
                },
                required=["id"],
            ),
        ),
    ]
)