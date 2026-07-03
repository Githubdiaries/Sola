from __future__ import annotations

import json
from typing import Any

from app.core.config import get_settings

SYSTEM_PROMPT = """You are Sola Decision Intelligence. Convert user questions into solar site ranking filters and explain tradeoffs using only supplied site/risk context. Return concise JSON with filters, rationale, and recommended_next_steps."""


async def answer_site_question(question: str, site_context: list[dict[str, Any]]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.google_cloud_project or not settings.vertex_ai_location:
        return _fallback_answer(question, site_context)
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
    except ImportError:
        return _fallback_answer(question, site_context)

    vertexai.init(project=settings.google_cloud_project, location=settings.vertex_ai_location)
    model = GenerativeModel(settings.gemini_model)
    prompt = f"{SYSTEM_PROMPT}\nQuestion: {question}\nSite context JSON: {json.dumps(site_context[:25], default=str)}"
    response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"answer": response.text, "source": "vertex-ai-gemini"}


def _fallback_answer(question: str, site_context: list[dict[str, Any]]) -> dict[str, Any]:
    ranked = sorted(site_context, key=lambda site: site.get("suitability_score", 0), reverse=True)[:5]
    return {"answer": "Vertex AI is not configured; returning deterministic ranked recommendations.", "question": question, "recommended_sites": ranked, "filters": {"sort": "suitability_score_desc"}, "source": "local-fallback"}
