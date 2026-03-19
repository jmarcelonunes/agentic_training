"""Pydantic models for request/response schemas."""
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ReviewRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=51200)
    language: Literal["python", "csharp"] = "python"
    focus: Optional[List[Literal[
        "bugs", "security", "performance", "style", "maintainability"
    ]]] = None
    filename: Optional[str] = None


class Issue(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    category: Literal["bug", "security", "performance", "style", "maintainability"]
    line: Optional[int] = None
    description: str
    suggestion: str
    code_snippet: Optional[str] = None


class Metrics(BaseModel):
    overall_score: int = Field(..., ge=1, le=10)
    complexity: Literal["low", "medium", "high"]
    maintainability: Literal["poor", "fair", "good", "excellent"]


class ReviewResponse(BaseModel):
    summary: str
    issues: List[Issue]
    suggestions: List[str]
    metrics: Metrics
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
