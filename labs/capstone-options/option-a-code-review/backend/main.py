"""AI Code Review Bot — FastAPI application."""
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import ALLOWED_ORIGINS, MAX_CODE_SIZE, RATE_LIMIT
from models import ReviewRequest, ReviewResponse
from review_service import review_code

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AI Code Review Bot")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/review", response_model=ReviewResponse)
@limiter.limit(RATE_LIMIT)
async def review(request: Request, body: ReviewRequest):
    """Review code and return structured feedback."""
    if len(body.code.encode("utf-8")) > MAX_CODE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Code exceeds maximum size of {MAX_CODE_SIZE // 1024}KB. "
            "Please split into smaller files.",
        )

    logger.info("Review requested: language=%s, code_size=%d", body.language, len(body.code))

    try:
        result = review_code(body)
    except Exception:
        logger.exception("Review failed")
        raise HTTPException(status_code=502, detail="Code review failed. Please try again.")

    return result


# Import webhook routes
from github_webhook import router as webhook_router  # noqa: E402

app.include_router(webhook_router)
