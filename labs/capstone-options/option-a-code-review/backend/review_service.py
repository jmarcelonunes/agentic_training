"""Core review logic: builds prompt, calls LLM, parses response."""
import logging

from llm_client import LLMClient, extract_json
from models import Metrics, ReviewRequest, ReviewResponse
from prompts import SYSTEM_PROMPT, build_review_prompt

logger = logging.getLogger(__name__)

_llm = LLMClient()


def review_code(request: ReviewRequest) -> ReviewResponse:
    """Review code and return structured feedback."""
    prompt = build_review_prompt(
        code=request.code,
        language=request.language,
        focus=request.focus,
    )

    raw = _llm.chat(system=SYSTEM_PROMPT, user=prompt)
    data = extract_json(raw)

    # Validate and coerce the parsed data into our models
    issues = data.get("issues", [])
    suggestions = data.get("suggestions", [])
    metrics_raw = data.get("metrics", {})

    metrics = Metrics(
        overall_score=max(1, min(10, int(metrics_raw.get("overall_score", 5)))),
        complexity=metrics_raw.get("complexity", "medium"),
        maintainability=metrics_raw.get("maintainability", "fair"),
    )

    return ReviewResponse(
        summary=data.get("summary", "Review completed."),
        issues=issues,
        suggestions=suggestions,
        metrics=metrics,
    )
