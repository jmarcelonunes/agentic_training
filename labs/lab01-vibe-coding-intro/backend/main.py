"""URL Shortener Backend - Complete Implementation"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional
import aiosqlite
import secrets
import string
import os
from contextlib import asynccontextmanager

# Database path
DB_PATH = "urls.db"

# Base URL for short links (from environment or Railway public domain)
BASE_URL = os.getenv("BASE_URL") or os.getenv("RAILWAY_PUBLIC_DOMAIN") or "http://localhost:8000"
if BASE_URL and not BASE_URL.startswith("http"):
    BASE_URL = f"https://{BASE_URL}"

# Generate short code (6 characters alphanumeric)
def generate_short_code() -> str:
    """Generate a random 6-character alphanumeric code."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(6))

# Database initialization
async def init_db():
    """Initialize the database with the urls table."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_url TEXT NOT NULL,
                short_code TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_original_url ON urls(original_url)
        """)
        await db.commit()

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    await init_db()
    yield
    # Shutdown: cleanup if needed
    pass

app = FastAPI(title="URL Shortener", lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: HttpUrl

class URLResponse(BaseModel):
    short_code: str
    short_url: str

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/shorten", response_model=URLResponse)
async def shorten_url(request: URLRequest):
    """
    Shorten a URL and return the short code.
    
    - Validates URL format (handled by Pydantic)
    - Checks for existing URL (returns existing short code)
    - Generates 6-character alphanumeric code
    - Stores mapping in SQLite
    """
    url_str = str(request.url)
    
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if URL already exists
            async with db.execute(
                "SELECT short_code FROM urls WHERE original_url = ?", 
                (url_str,)
            ) as cursor:
                existing = await cursor.fetchone()
                
            if existing:
                # Return existing short code
                short_code = existing[0]
            else:
                # Generate new short code (ensure uniqueness)
                max_attempts = 10
                for _ in range(max_attempts):
                    short_code = generate_short_code()
                    
                    # Check if code already exists
                    async with db.execute(
                        "SELECT id FROM urls WHERE short_code = ?", 
                        (short_code,)
                    ) as cursor:
                        exists = await cursor.fetchone()
                    
                    if not exists:
                        # Insert new mapping
                        await db.execute(
                            "INSERT INTO urls (original_url, short_code) VALUES (?, ?)",
                            (url_str, short_code)
                        )
                        await db.commit()
                        break
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to generate unique short code. Please try again."
                    )
            
            # Construct short URL using BASE_URL
            short_url = f"{BASE_URL}/{short_code}"
            
            return URLResponse(short_code=short_code, short_url=short_url)
            
    except aiosqlite.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@app.get("/{short_code}")
async def redirect_to_url(short_code: str):
    """
    Redirect to the original URL for the given short code.
    
    - Looks up short code in database
    - Returns 307 redirect to original URL
    - Returns 404 if code not found
    """
    # Validate short code format (6 alphanumeric characters)
    if len(short_code) != 6 or not short_code.isalnum():
        raise HTTPException(
            status_code=404,
            detail="Invalid short code format"
        )
    
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                "SELECT original_url FROM urls WHERE short_code = ?",
                (short_code,)
            ) as cursor:
                result = await cursor.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Short code '{short_code}' not found"
            )
        
        original_url = result[0]
        return RedirectResponse(url=original_url, status_code=307)
        
    except aiosqlite.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
