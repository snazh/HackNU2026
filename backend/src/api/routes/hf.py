from fastapi import APIRouter, HTTPException, status
from src.agent.agent import run_agent
from src.agent.models import AgentRequest, AgentResponse
from src.api.schemas.prompt import UserPrompt
from src.api.services.higgsfield_service import generate_image
from src.config import settings

router = APIRouter()


@router.post("/generate-image")
async def generate(data: UserPrompt):
    url = await generate_image(
        prompt=data.prompt,
        aspect_ratio=data.aspect_ratio,
        resolution=data.resolution,
    )
    return {"url": url}


@router.post("/chat", response_model=AgentResponse)
async def geneate_shapes(request: AgentRequest):
    """
    Принимает текст от юзера и текущее состояние канваса.
    Возвращает текст ответа и список операций (что отрисовать).
    """
    try:
        # Вызываем твоего агента
        result = await run_agent(request)
        return result
    except Exception as e:
        # Если Gemini упадет или в коде ошибка — отдаем 500
        print(settings.grok.KEY)
        raise HTTPException(status_code=500, detail=str(e))
