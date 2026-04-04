from typing import List, Optional

from pydantic import BaseModel


class DiagramNode(BaseModel):
    id: str
    label: str
    shape: str
    x: float
    y: float


class DiagramEdge(BaseModel):
    from_node: str
    to_node: str
    label: Optional[str] = None


class DiagramResponse(BaseModel):
    type: str
    nodes: List[DiagramNode]
    edges: List[DiagramEdge]


class UserRequest(BaseModel):
    transcript: str
