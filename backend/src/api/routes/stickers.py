from fastapi import APIRouter
from src.api.schemas.user_request import UserRequest
from src.api.services.gemini_service import generate_diagram_from_gemini

router = APIRouter()


@router.post("/diagram")
async def generate_diagram(data: UserRequest):
    result = await generate_diagram_from_gemini(data.transcript)
    return result
