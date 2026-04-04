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


class CanvasOperation(BaseModel):
    model_config = ConfigDict(extra="ignore")

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


class AgentResponse(BaseModel):
    agent_text: str
    operations: list[CanvasOperation]