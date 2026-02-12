"""URL Shortener Backend - Complete Implementation"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl, field_validator, Field
from typing import Optional
import aiosqlite
import secrets
import string
import os
import re
from contextlib import asynccontextmanager

# Database path
DB_PATH = "urls.db"

# Base URL for short links (from environment or Railway public domain)
BASE_URL = os.getenv("BASE_URL") or os.getenv("RAILWAY_PUBLIC_DOMAIN") or "http://localhost:8000"
if BASE_URL and not BASE_URL.startswith("http"):
    BASE_URL = f"https://{BASE_URL}"

# CORS origins - production frontend and local development
ALLOWED_ORIGINS = [
    "https://urlshortener-flame-two.vercel.app",
    "http://localhost:3000",  # Local development
]

# Blocked domains for security (prevent abuse)
BLOCKED_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    # Add other blocked domains as needed
]

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

# CORS for frontend - restricted to specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class URLRequest(BaseModel):
    url: HttpUrl = Field(
        ...,
        description="The URL to shorten",
        examples=["https://www.example.com/very/long/path"]
    )

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: HttpUrl) -> HttpUrl:
        """Enhanced URL validation with security checks."""
        url_str = str(v)
        
        # 1. Check URL length (prevent extremely long URLs)
        if len(url_str) > 2048:
            raise ValueError("URL is too long (max 2048 characters)")
        
        # 2. Ensure only http/https protocols
        if not url_str.startswith(("http://", "https://")):
            raise ValueError("Only HTTP and HTTPS protocols are allowed")
        
        # 3. Extract domain and check against blocklist
        domain_match = re.search(r'://([^/:]+)', url_str)
        if domain_match:
            domain = domain_match.group(1).lower()
            
            # Check if domain is in blocklist
            for blocked in BLOCKED_DOMAINS:
                if blocked in domain:
                    raise ValueError(f"Cannot shorten URLs with domain: {blocked}")
        
        # 4. Basic malicious pattern detection
        suspicious_patterns = [
            r'javascript:',
            r'data:',
            r'vbscript:',
            r'file://',
        ]
        
        url_lower = url_str.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, url_lower):
                raise ValueError("URL contains suspicious pattern")
        
        # 5. Check for excessive special characters (potential obfuscation)
        special_char_count = len(re.findall(r'[%@]', url_str))
        if special_char_count > 20:
            raise ValueError("URL contains too many encoded or special characters")
        
        return v

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
