import asyncio
import os
from typing import Any, Dict, Optional

import aiohttp
from src.config import settings

BASE_URL = "https://platform.higgsfield.ai"
MODEL_ID = "higgsfield-ai/soul/standard"


class HiggsfieldError(Exception):
    pass


def build_auth_header() -> str:
    """
    Docs mention auth format:
    Authorization: Key {api_key}:{api_secret}

    You can either:
    1) set HF_KEY="api_key:api_secret"
    2) or set HF_API_KEY and HF_API_SECRET
    """

    api_key = settings.higgsfield.KEY
    api_secret = settings.higgsfield.SECRET
    if api_key and api_secret:
        return f"Key {api_key}:{api_secret}"

    raise HiggsfieldError(
        "Set HF_KEY='api_key:api_secret' or both HF_API_KEY and HF_API_SECRET"
    )


async def submit_generation(
    session: aiohttp.ClientSession,
    prompt: str,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
    model_id: str = MODEL_ID,
) -> Dict[str, Any]:
    url = f"{BASE_URL}/{model_id}"
    payload = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
    }

    async with session.post(url, json=payload) as resp:
        text = await resp.text()
        if resp.status >= 400:
            raise HiggsfieldError(f"Submit failed: HTTP {resp.status} - {text}")

        data = await resp.json()

    if "request_id" not in data:
        raise HiggsfieldError(f"Unexpected submit response: {data}")

    return data


async def get_status(
    session: aiohttp.ClientSession,
    request_id: str,
) -> Dict[str, Any]:
    url = f"{BASE_URL}/requests/{request_id}/status"

    async with session.get(url) as resp:
        text = await resp.text()
        if resp.status >= 400:
            raise HiggsfieldError(f"Status check failed: HTTP {resp.status} - {text}")

        return await resp.json()


async def cancel_request(
    session: aiohttp.ClientSession,
    request_id: str,
) -> bool:
    """
    Cancellation is only available while the request is still queued.
    """
    url = f"{BASE_URL}/requests/{request_id}/cancel"

    async with session.post(url) as resp:
        return resp.status == 202


async def wait_for_completion(
    session: aiohttp.ClientSession,
    request_id: str,
    poll_interval: float = 3.0,
    timeout: float = 300.0,
) -> Dict[str, Any]:
    started = asyncio.get_running_loop().time()

    while True:
        if asyncio.get_running_loop().time() - started > timeout:
            raise TimeoutError(f"Timed out waiting for request {request_id}")

        status_data = await get_status(session, request_id)
        status = status_data.get("status")

        print(f"[{request_id}] status = {status}")

        if status == "completed":
            return status_data
        if status == "failed":
            raise HiggsfieldError(f"Generation failed: {status_data}")
        if status == "nsfw":
            raise HiggsfieldError(f"Generation blocked by moderation: {status_data}")

        # queued / in_progress
        await asyncio.sleep(poll_interval)


async def generate_image(
    prompt: str,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
    model_id: str = MODEL_ID,
) -> str:
    headers = {
        "Authorization": build_auth_header(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    timeout = aiohttp.ClientTimeout(total=600)

    async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
        submit_data = await submit_generation(
            session=session,
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            model_id=model_id,
        )

        request_id = submit_data["request_id"]
        print(f"Queued request: {request_id}")

        result = await wait_for_completion(session, request_id)

        images = result.get("images") or []
        if not images:
            raise HiggsfieldError(f"No images in completed response: {result}")

        image_url = images[0]["url"]
        return image_url


async def main() -> None:
    prompt = "Create Kructy Crabs"
    image_url = await generate_image(
        prompt=prompt,
        aspect_ratio="16:9",
        resolution="720p",
    )
    print("Generated image URL:", image_url)


if __name__ == "__main__":
    asyncio.run(main())
