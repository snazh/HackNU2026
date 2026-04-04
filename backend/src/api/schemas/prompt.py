from typing import Optional

from pydantic import BaseModel, Field


class UserPrompt(BaseModel):
    prompt: str
    aspect_ratio: str
    resoultion: str


class StickyNoteCreate(BaseModel):
    x: float = Field(..., description="Left position in canvas units")
    y: float = Field(..., description="Top position in canvas units")
    text: str = Field(..., description="Content of the sticky note")
    width: Optional[float] = 200
    height: Optional[float] = 200
    color: Optional[str] = Field(
        "yellow", description="yellow, pink, blue, green, white"
    )
