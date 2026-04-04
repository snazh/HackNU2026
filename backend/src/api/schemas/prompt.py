from pydantic import BaseModel


class UserPrompt(BaseModel):
    prompt: str
    aspect_ratio: str
    resoultion: str
