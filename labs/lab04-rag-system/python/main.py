"""RAG System - FastAPI Application."""
import asyncio
import os
import re
import tarfile
import tempfile
import urllib.request
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from llm_client import get_llm_client

from rag import CodebaseRAG, RAGEvaluator, create_eval_dataset

# Deferred initialization — populated during startup
provider = os.getenv("LLM_PROVIDER", "anthropic")
llm = None
rag = None
_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy resources (LLM client, vector store, embeddings) in background."""
    global llm, rag, _ready

    async def _init():
        global llm, rag, _ready
        llm = get_llm_client(provider)
        rag = CodebaseRAG(llm)
        _ready = True
        print("RAG system initialized and ready")

    asyncio.create_task(_init())
    yield


app = FastAPI(
    title="Codebase RAG System",
    description="RAG system for querying codebases with evaluation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    """Request for querying the codebase."""
    question: str
    n_results: int = 5
    filter_language: Optional[str] = None


class IndexDirectoryRequest(BaseModel):
    """Request to index a directory."""
    directory: str
    extensions: Optional[List[str]] = None


class IndexFilesRequest(BaseModel):
    """Request to index files directly."""
    files: Dict[str, str]  # filename -> content


class IndexGitHubRequest(BaseModel):
    """Request to index a public GitHub repo."""
    repo_url: str
    branch: str = "main"
    extensions: Optional[List[str]] = None


class EvalRequest(BaseModel):
    """Request for evaluation."""
    examples: List[Dict[str, Any]]


class QueryResponse(BaseModel):
    """Response from query."""
    answer: str
    sources: List[Dict[str, Any]]
    context_used: str


# Initialize RAG
# (deferred to lifespan startup — see above)


def _require_ready():
    """Guard: raise 503 if RAG system is still initializing."""
    if not _ready:
        raise HTTPException(status_code=503, detail="RAG system is still initializing. Please wait.")


@app.post("/index/directory")
async def index_directory(request: IndexDirectoryRequest):
    """Index a codebase directory."""
    _require_ready()
    try:
        count = rag.index_directory(request.directory, request.extensions)
        return {"indexed_chunks": count, "directory": request.directory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/index/files")
async def index_files(request: IndexFilesRequest):
    """Index files from request body."""
    _require_ready()
    try:
        count = rag.index_files(request.files)
        return {"indexed_chunks": count, "files": list(request.files.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_github_url(repo_url: str) -> tuple[str, str]:
    """Extract owner/repo from a GitHub URL."""
    pattern = r"(?:https?://)?(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?$"
    match = re.match(pattern, repo_url.strip())
    if not match:
        raise ValueError(f"Invalid GitHub URL: {repo_url}")
    return match.group(1), match.group(2)


@app.post("/index/github")
async def index_github(request: IndexGitHubRequest):
    """Index a public GitHub repository."""
    _require_ready()
    try:
        owner, repo = _parse_github_url(request.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    tarball_url = f"https://api.github.com/repos/{owner}/{repo}/tarball/{request.branch}"
    extensions = request.extensions or [".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go"]

    try:
        req = urllib.request.Request(
            tarball_url,
            headers={"Accept": "application/vnd.github+json", "User-Agent": "CodebaseRAG/1.0"},
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            tar_path = os.path.join(tmpdir, "repo.tar.gz")
            with urllib.request.urlopen(req) as response:
                with open(tar_path, "wb") as f:
                    f.write(response.read())

            extract_dir = os.path.join(tmpdir, "repo")
            with tarfile.open(tar_path, "r:gz") as tar:
                # Validate paths to prevent path traversal
                for member in tar.getmembers():
                    if member.name.startswith('/') or '..' in member.name:
                        raise HTTPException(status_code=400, detail="Malicious tar entry detected")
                tar.extractall(extract_dir)

            # GitHub tarballs have a single top-level directory like owner-repo-sha
            entries = os.listdir(extract_dir)
            repo_root = os.path.join(extract_dir, entries[0]) if len(entries) == 1 else extract_dir

            count = rag.index_directory(repo_root, extensions)

        return {
            "indexed_chunks": count,
            "repo": f"{owner}/{repo}",
            "branch": request.branch,
        }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail=f"Repository not found: {owner}/{repo} (branch: {request.branch})")
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e.code} {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=QueryResponse)
async def query_codebase(request: QueryRequest):
    """Query the codebase."""
    _require_ready()
    try:
        result = rag.query(
            request.question,
            request.n_results,
            request.filter_language
        )
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate")
async def evaluate_rag(request: EvalRequest):
    """Evaluate RAG performance."""
    _require_ready()
    try:
        examples = create_eval_dataset(request.examples)
        evaluator = RAGEvaluator(rag, llm)

        retrieval_metrics = evaluator.evaluate_retrieval(examples)
        generation_metrics = evaluator.evaluate_generation(examples)

        return {
            "retrieval": retrieval_metrics,
            "generation": generation_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get index statistics."""
    _require_ready()
    return rag.get_stats()


@app.get("/files")
async def get_indexed_files():
    """Get list of all indexed file paths."""
    _require_ready()
    files = rag.vector_store.get_indexed_files()
    return {"files": files, "count": len(files)}


@app.delete("/index")
async def clear_index():
    """Clear the index."""
    _require_ready()
    rag.clear_index()
    return {"status": "cleared"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "provider": provider,
        "ready": _ready,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
