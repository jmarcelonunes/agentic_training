<div align="center">

# 🔍 Codebase RAG System

**Ask questions about any public GitHub repository using AI-powered retrieval.**

[![Backend](https://img.shields.io/badge/Backend-Railway-blueviolet?logo=railway)](https://lab04-rag-system-production.up.railway.app/health)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://frontend-delta-puce-68.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org)
[![Anthropic](https://img.shields.io/badge/LLM-Anthropic-orange?logo=anthropic)](https://anthropic.com)

---

<img width="700" alt="architecture" src="https://img.shields.io/badge/GitHub_Repo→Chunk→Embed→Store→Retrieve→Answer-informational?style=for-the-badge&color=0d1117" />

</div>

## What It Does

Point to **any public GitHub repo**, and the system will:

1. **Download & chunk** the source code intelligently (by function, class, or block)
2. **Embed** each chunk using `sentence-transformers` (all-MiniLM-L6-v2) — free, no API key
3. **Store** embeddings in ChromaDB for fast vector similarity search
4. **Answer** natural-language questions using retrieved context + Anthropic Claude

---

## Architecture

```
 ┌──────────────┐     ┌──────────────────────────────────────────────────┐
 │   Next.js    │     │              FastAPI Backend                     │
 │   Frontend   │────▶│                                                  │
 │  (Vercel)    │     │  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
 └──────────────┘     │  │ Chunker  │  │ Embedder  │  │  ChromaDB    │  │
                      │  │ (AST +   │──▶│ MiniLM-  │──▶│ (Vector     │  │
 GitHub Tarball ─────▶│  │  regex)  │  │  L6-v2)   │  │   Store)    │  │
   API Download       │  └──────────┘  └───────────┘  └──────┬───────┘  │
                      │                                       │          │
                      │  ┌──────────────────────┐    Top-K    │          │
                      │  │   Anthropic Claude    │◀───────────┘          │
                      │  │   (Answer Gen)        │                       │
                      │  └──────────────────────┘       (Railway)       │
                      └──────────────────────────────────────────────────┘
```

---

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | https://frontend-delta-puce-68.vercel.app |
| **Backend API** | https://lab04-rag-system-production.up.railway.app |
| **Health Check** | https://lab04-rag-system-production.up.railway.app/health |

> **Note:** Railway storage is ephemeral — the vector index resets on each deploy. Index a repo after each backend restart.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS | Interactive UI (Dashboard, Index, Query) |
| **Backend** | FastAPI, Uvicorn | REST API with async endpoints |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) | Free local embeddings — no API key needed |
| **Vector DB** | ChromaDB | Persistent vector storage & similarity search |
| **LLM** | Anthropic Claude (via SDK) | Answer generation from retrieved context |
| **Hosting** | Vercel (frontend) + Railway (backend) | Production deployment |

---

## Quick Start

### Backend (Python)

```bash
cd python
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Required for answer generation
export ANTHROPIC_API_KEY=your-key

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm install

# Point to your backend
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local

npm run dev
```

Open http://localhost:3000 — you're ready to go.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (returns ready status) |
| `GET` | `/stats` | Index statistics (chunk count, collection name) |
| `GET` | `/files` | List all indexed file paths |
| `POST` | `/index/github` | Index a public GitHub repo by URL |
| `POST` | `/index/files` | Index files from request body |
| `POST` | `/index/directory` | Index a local directory |
| `POST` | `/query` | Ask a question about the indexed codebase |
| `POST` | `/evaluate` | Evaluate RAG retrieval & generation quality |
| `DELETE` | `/index` | Clear the entire index |

<details>
<summary><b>Example: Index a GitHub repo</b></summary>

```bash
curl -X POST https://lab04-rag-system-production.up.railway.app/index/github \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/expressjs/express", "branch": "master"}'
```

Response:
```json
{
  "indexed_chunks": 342,
  "repo": "expressjs/express",
  "branch": "master"
}
```
</details>

<details>
<summary><b>Example: Query the codebase</b></summary>

```bash
curl -X POST https://lab04-rag-system-production.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How does routing work?", "n_results": 5}'
```

Response:
```json
{
  "answer": "Express routing works by...",
  "sources": [
    {"file": "lib/router/index.js", "type": "function", "name": "route", "relevance": 0.87}
  ],
  "context_used": "..."
}
```
</details>

---

## Project Structure

```
lab04-rag-system/
├── python/                    # FastAPI backend
│   ├── main.py                # API endpoints & GitHub indexing
│   ├── llm_client.py          # Multi-provider LLM client (Anthropic/OpenAI/Google)
│   ├── rag/
│   │   ├── chunker.py         # Intelligent code chunking (AST + regex)
│   │   ├── vector_store.py    # ChromaDB wrapper with sentence-transformers
│   │   ├── pipeline.py        # RAG pipeline (index + query orchestration)
│   │   └── evaluation.py      # Retrieval & generation metrics
│   ├── requirements.txt
│   ├── railway.toml           # Railway deployment config
│   ├── Procfile               # Process file for deployment
│   └── runtime.txt            # Python version spec
│
├── frontend/                  # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx           # Dashboard (health, stats, quick actions)
│   │   ├── index-code/        # GitHub repo indexing page
│   │   ├── query/             # Natural language query page
│   │   └── layout.tsx         # Root layout with navigation
│   ├── lib/
│   │   └── api.ts             # Typed API client for all backend endpoints
│   ├── tailwind.config.ts
│   └── package.json
│
└── README.md                  # ← You are here
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **sentence-transformers** over OpenAI embeddings | Free, no API key, runs locally — great for dev & demos |
| **GitHub tarball API** over `git clone` | No git binary needed in container; faster for full-repo download |
| **Deferred initialization** (lifespan) | Model loads ~60s; `/health` responds immediately for Railway healthchecks |
| **ChromaDB PersistentClient** | Survives server restarts locally (ephemeral on Railway) |
| **Chunk deduplication** | Prevents ChromaDB errors when repos have duplicated code patterns |
| **CORS allow all** | Demo project — restrict in production |

---

## Deployment

### Backend → Railway

```bash
cd python
railway link          # Link to your Railway project
railway up --detach   # Deploy
```

Set environment variable: `ANTHROPIC_API_KEY`, `LLM_PROVIDER=anthropic`

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app`

---

## Learning Goals

- [x] Implement a RAG pipeline from scratch (chunking → embedding → retrieval → generation)
- [x] Use intelligent code chunking (function/class boundaries via AST + regex)
- [x] Understand vector similarity search with embeddings
- [x] Build a full-stack app with typed API client
- [x] Deploy a Python + Next.js app to cloud (Railway + Vercel)
