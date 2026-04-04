from fastapi import APIRouter
from src.api.schemas.prompt import UserPrompt
from src.api.services.higgsfield_service import generate_image

router = APIRouter()


@router.post("/generate-image")
async def generate(data: UserPrompt):
    image = await generate_image(
        prompt=data.prompt, aspect_ratio=data.aspect_ratio, resolution=data.resoultion
    )
    return image
