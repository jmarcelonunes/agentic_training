"""GitHub webhook receiver for automatic PR reviews."""
import hashlib
import hmac
import logging

from fastapi import APIRouter, HTTPException, Request

from config import GITHUB_WEBHOOK_SECRET
from github_service import (
    filter_supported_files,
    get_file_content,
    get_language_for_file,
    get_pr_files,
    parse_diff_line_map,
    post_pr_review,
)
from models import ReviewRequest
from review_service import review_code

logger = logging.getLogger(__name__)

router = APIRouter()


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify the GitHub webhook HMAC-SHA256 signature."""
    if not GITHUB_WEBHOOK_SECRET:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping signature verification")
        return True

    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhook/github")
async def github_webhook(request: Request):
    """Receive and process GitHub webhook events."""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    if not verify_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")

    # Respond to ping events (sent when webhook is first created)
    if event == "ping":
        return {"message": "pong"}

    if event != "pull_request":
        return {"message": f"Ignored event: {event}"}

    payload = await request.json()
    action = payload.get("action")

    if action not in ("opened", "synchronize"):
        return {"message": f"Ignored action: {action}"}

    pr = payload["pull_request"]
    repo = payload["repository"]
    owner = repo["owner"]["login"]
    repo_name = repo["name"]
    pr_number = pr["number"]
    head_sha = pr["head"]["sha"]

    logger.info("Processing PR #%d on %s/%s (SHA: %s)", pr_number, owner, repo_name, head_sha)

    # Fetch and filter changed files
    pr_files = get_pr_files(owner, repo_name, pr_number)
    supported_files = filter_supported_files(pr_files)

    if not supported_files:
        logger.info("No supported files (.py, .cs) in PR #%d", pr_number)
        return {"message": "No supported files to review"}

    all_comments = []
    file_summaries = []

    for pr_file in supported_files:
        filename = pr_file["filename"]
        patch = pr_file.get("patch", "")
        language = get_language_for_file(filename)

        try:
            content = get_file_content(owner, repo_name, filename, head_sha)
        except Exception:
            logger.exception("Failed to fetch content for %s", filename)
            continue

        # Review the file
        req = ReviewRequest(code=content, language=language, filename=filename)
        try:
            result = review_code(req)
        except Exception:
            logger.exception("Failed to review %s", filename)
            continue

        file_summaries.append(f"**{filename}** — Score: {result.metrics.overall_score}/10")

        # Map issues to inline PR comments
        line_map = parse_diff_line_map(patch)
        for issue in result.issues:
            if issue.line and issue.line in line_map:
                comment_body = (
                    f"**{issue.severity.upper()}** ({issue.category}): "
                    f"{issue.description}\n\n"
                    f"💡 **Suggestion:** {issue.suggestion}"
                )
                all_comments.append({
                    "path": filename,
                    "position": line_map[issue.line],
                    "body": comment_body,
                })

    # Post the review
    review_body = "## 🤖 AI Code Review\n\n"
    if file_summaries:
        review_body += "\n".join(f"- {s}" for s in file_summaries)
    else:
        review_body += "No issues found in supported files."

    try:
        post_pr_review(
            owner=owner,
            repo=repo_name,
            pr_number=pr_number,
            commit_sha=head_sha,
            body=review_body,
            comments=all_comments,
        )
        logger.info(
            "Posted review on PR #%d with %d inline comments", pr_number, len(all_comments)
        )
    except Exception:
        logger.exception("Failed to post review on PR #%d", pr_number)
        raise HTTPException(status_code=502, detail="Failed to post review to GitHub")

    return {
        "message": f"Reviewed {len(supported_files)} file(s)",
        "comments": len(all_comments),
    }
