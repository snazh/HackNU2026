import logging
from contextlib import asynccontextmanager
from typing import Union

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import JSONResponse

from backend.src.config import settings
from backend.src.exceptions.base import BaseAppException

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    yield


app = FastAPI(title="KezdesuAI API", lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key=settings.auth.SECRET_KEY)
# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(BaseAppException)
async def base_app_exception_handler(
    request: Request, exc: BaseAppException
) -> Union[JSONResponse, Response]:
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "Failure", "msg": exc.detail},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "Failure", "msg": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> Union[JSONResponse, Response]:
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "Failure", "msg": f"Internal Server Error"},
    )
