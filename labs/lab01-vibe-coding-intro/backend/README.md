# URL Shortener Backend

A FastAPI-based URL shortening service with SQLite database storage. This backend provides RESTful endpoints for shortening URLs and redirecting short codes to their original destinations.

## Features

- **URL Shortening**: Convert long URLs into short, 6-character alphanumeric codes
- **Duplicate Detection**: Returns existing short code if URL has been previously shortened
- **Fast Redirects**: Efficient database lookups with indexed queries
- **Health Check**: Endpoint for monitoring service availability
- **CORS Support**: Configured for cross-origin requests from frontend applications
- **Production Ready**: Includes Procfile for deployment to Railway, Heroku, or similar platforms

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **Uvicorn**: Lightning-fast ASGI server
- **SQLite**: Lightweight, file-based database via aiosqlite
- **Pydantic**: Data validation using Python type annotations

## Prerequisites

- Python 3.11+ (specified in runtime.txt)
- pip for package management

## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running Locally

**Development mode** (with auto-reload):
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
```
GET /health
```
Returns service status.

**Response**:
```json
{
  "status": "healthy"
}
```

### Shorten URL
```
POST /shorten
```
Creates a short code for a given URL.

**Request Body**:
```json
{
  "url": "https://example.com/very/long/url"
}
```

**Response**:
```json
{
  "short_code": "aB3dEf",
  "short_url": "http://localhost:8000/aB3dEf"
}
```

### Redirect
```
GET /{short_code}
```
Redirects to the original URL associated with the short code.

**Example**: `GET /aB3dEf` → redirects to `https://example.com/very/long/url`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Base URL for generating short links | `http://localhost:8000` |
| `RAILWAY_PUBLIC_DOMAIN` | Automatically set by Railway deployment | - |

## Database

The application uses SQLite with the following schema:

```sql
CREATE TABLE urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

Indexes:
- `idx_short_code` on `short_code` for fast lookups
- `idx_original_url` on `original_url` for duplicate detection

The database file (`urls.db`) is automatically created on first run.

## Deployment

### Railway / Heroku

The `Procfile` is already configured for deployment:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Steps**:
1. Push code to Git repository
2. Connect repository to Railway/Heroku
3. Set `BASE_URL` environment variable to your deployment URL
4. Deploy!

### Docker

Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t url-shortener-backend .
docker run -p 8000:8000 url-shortener-backend
```

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── runtime.txt          # Python version specification
├── Procfile            # Deployment configuration
├── .gitignore          # Git ignore rules
└── urls.db             # SQLite database (auto-generated)
```

## Development

### Adding Features

The codebase is well-structured for extensions:
- **Analytics**: Add click tracking in the redirect endpoint
- **Custom Short Codes**: Allow users to specify their own codes
- **Expiration**: Add TTL for short links
- **Authentication**: Protect endpoints with API keys or OAuth

### Testing

Example test cases to implement:
```python
# Test URL shortening
# Test duplicate URL detection
# Test invalid URL handling
# Test redirect functionality
# Test non-existent short codes
```

## Security Considerations

For production use, consider:
- Rate limiting to prevent abuse
- Input sanitization (Pydantic provides basic validation)
- CORS configuration (currently allows all origins)
- HTTPS enforcement
- Database backups

## License

This project is part of the Agentic Training course materials.
