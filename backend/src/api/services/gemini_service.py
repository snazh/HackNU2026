import json
import re

from google import genai
from google.genai import types
from src.config import settings

client = genai.Client(api_key=settings.ext_api.GEMINI)

SYSTEM_PROMPT = """
You are an AI assistant that creates diagrams for a collaborative canvas.

The user gives a voice command like:
- draw a roadmap
- create a flowchart
- make a mind map
- draw a system architecture

You must return ONLY valid JSON.

Response format:
{
  "type": "flowchart | roadmap | mindmap | architecture",
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "shape": "rect | rounded_rect | circle | diamond",
      "x": number,
      "y": number
    }
  ],
  "edges": [
    {
      "from_node": "string",
      "to_node": "string",
      "label": "string"
    }
  ]
}

Rules:
- Return only JSON
- Make the diagram clear and structured
- Keep labels short
- Use sensible coordinates
- Max 10 nodes
"""


def extract_json(text: str):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())

    raise ValueError("Could not parse JSON object from Gemini response")


async def generate_diagram_from_gemini(transcript: str):
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Voice command: {transcript}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.4,
            response_mime_type="application/json",
            max_output_tokens=1200,
        ),
    )

    return extract_json(response.text)
