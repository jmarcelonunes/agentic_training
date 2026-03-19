"""GitHub REST API service for fetching PR files and posting review comments."""
import base64
import logging
from typing import Any

import httpx

from config import GITHUB_TOKEN

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
SUPPORTED_EXTENSIONS = {".py": "python", ".cs": "csharp"}


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_pr_files(owner: str, repo: str, pr_number: int) -> list[dict[str, Any]]:
    """Fetch the list of files changed in a PR."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/files"
    resp = httpx.get(url, headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_file_content(owner: str, repo: str, path: str, ref: str) -> str:
    """Fetch file content at a specific ref (SHA/branch)."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    resp = httpx.get(url, headers=_headers(), params={"ref": ref}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    return content


def post_pr_review(
    owner: str,
    repo: str,
    pr_number: int,
    commit_sha: str,
    body: str,
    comments: list[dict[str, Any]],
) -> dict[str, Any]:
    """Post a PR review with inline comments."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
    payload: dict[str, Any] = {
        "commit_id": commit_sha,
        "body": body,
        "event": "COMMENT",
    }
    if comments:
        payload["comments"] = comments

    resp = httpx.post(url, headers=_headers(), json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


def parse_diff_line_map(patch: str) -> dict[int, int]:
    """Map absolute line numbers (in the new file) to diff positions.

    GitHub's review comment API requires a 'position' that refers to the
    line's position within the diff hunk, not the absolute file line number.
    """
    position_map: dict[int, int] = {}
    if not patch:
        return position_map

    position = 0
    for line in patch.split("\n"):
        position += 1
        if line.startswith("@@"):
            # Parse the new-file line start: @@ -old,count +new,count @@
            try:
                plus_part = line.split("+")[1].split("@@")[0].strip()
                if "," in plus_part:
                    current_line = int(plus_part.split(",")[0])
                else:
                    current_line = int(plus_part)
            except (IndexError, ValueError):
                continue
            # The @@ line itself is position N, the next line starts at current_line
            continue
        elif line.startswith("-"):
            # Removed line — no new-file line number
            continue
        elif line.startswith("+"):
            position_map[current_line] = position
            current_line += 1
        else:
            # Context line
            position_map[current_line] = position
            current_line += 1

    return position_map


def filter_supported_files(files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter PR files to only supported languages."""
    result = []
    for f in files:
        filename = f.get("filename", "")
        for ext in SUPPORTED_EXTENSIONS:
            if filename.endswith(ext):
                result.append(f)
                break
    return result


def get_language_for_file(filename: str) -> str:
    """Determine the language based on file extension."""
    for ext, lang in SUPPORTED_EXTENSIONS.items():
        if filename.endswith(ext):
            return lang
    return "python"
