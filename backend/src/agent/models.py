from pydantic import BaseModel, ConfigDict
from typing import Optional


class Shape(BaseModel):
    id: str
    type: str           # "frame", "sticky_note", "text", "image", "arrow"
    label: Optional[str] = None
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    color: Optional[str] = None


class CanvasState(BaseModel):
    width: float = 1920
    height: float = 1080
    shapes: list[Shape] = []


class AgentRequest(BaseModel):
    session_id: str
    prompt: str
    canvas_state: CanvasState
    # User control: optional focus for this turn/session (canvas-aware prompting).
    agent_focus: Optional[str] = None
    # light | normal | bold — how much the agent should change the canvas.
    contribution_mode: Optional[str] = None


class CanvasOperation(BaseModel):
    # LLM tool args may include arrays (tables, flows, polylines) — keep unknown keys.
    model_config = ConfigDict(extra="allow")

    tool: str
    # All possible fields — frontend reads only what's relevant per tool
    id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    x1: Optional[float] = None
    y1: Optional[float] = None
    x2: Optional[float] = None
    y2: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    text: Optional[str] = None
    label: Optional[str] = None
    color: Optional[str] = None
    fontSize: Optional[float] = None
    bold: Optional[bool] = None
    query: Optional[str] = None
    from_id: Optional[str] = None
    to_id: Optional[str] = None
    # add_geo_shape
    geo: Optional[str] = None
    fill: Optional[str] = None
    # add_frame
    name: Optional[str] = None
    # add_image_from_url
    url: Optional[str] = None
    # add_table / add_flow_sequence / add_polyline / group_shapes / add_point_arrow
    rows: Optional[int] = None
    cols: Optional[int] = None
    cell_width: Optional[float] = None
    cell_height: Optional[float] = None
    cells: Optional[list] = None
    header_row: Optional[bool] = None
    steps: Optional[list] = None
    direction: Optional[str] = None
    gap: Optional[float] = None
    shape_ids: Optional[list] = None
    points: Optional[list] = None
    dash: Optional[str] = None
    note_size: Optional[str] = None
    bend: Optional[float] = None


class AgentResponse(BaseModel):
    agent_text: str
    operations: list[CanvasOperation]