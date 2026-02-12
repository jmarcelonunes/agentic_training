# Testing Guide - URL Shortener Lab

This guide walks you through testing the URL shortener application locally.

## Prerequisites

- Python 3.10+ installed
- Node.js 18+ installed
- Terminal access

---

## Backend Testing

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
# From the backend directory
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 3. Test the Health Endpoint

Open a new terminal and run:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"healthy"}
```

### 4. Test URL Shortening

```bash
curl -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/very/long/url/path"}'
```

Expected response:
```json
{
  "short_code": "aBc123",
  "short_url": "http://localhost:8000/aBc123"
}
```

Note: The actual short_code will be different (randomly generated).

### 5. Test Duplicate URL Handling

Run the same curl command again:

```bash
curl -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/very/long/url/path"}'
```

Expected: Same short_code as before (verifies duplicate detection).

### 6. Test URL Redirect

Using the short_code from step 4:

```bash
curl -I http://localhost:8000/aBc123
```

Expected response headers:
```
HTTP/1.1 307 Temporary Redirect
location: https://www.example.com/very/long/url/path
```

### 7. Test Error Handling

**Invalid URL:**
```bash
curl -X POST http://localhost:8000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "not-a-valid-url"}'
```

Expected: 422 Validation Error

**Non-existent short code:**
```bash
curl -I http://localhost:8000/XXXXXX
```

Expected: 404 Not Found

### 8. Verify Database

Check that the database file was created:

```bash
ls -la urls.db
```

You can also inspect the database:

```bash
sqlite3 urls.db "SELECT * FROM urls;"
```

---

## Frontend Testing

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This may take a few minutes on first run.

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local

# The default value should work for local development:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start the Frontend Server

Make sure the backend is still running in another terminal, then:

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### 4. Manual UI Testing

Open your browser to http://localhost:3000

**Test Case 1: Basic URL Shortening**
- Enter: `https://www.google.com`
- Click "Shorten URL"
- Verify: Short URL appears in green success box
- Click "Copy to Clipboard"
- Verify: Button changes to "Copied!"

**Test Case 2: Test Redirect**
- Copy the short URL from Test Case 1
- Open in new browser tab
- Verify: Redirects to Google

**Test Case 3: Duplicate URL**
- Enter the same URL: `https://www.google.com`
- Click "Shorten URL"
- Verify: Same short code returned

**Test Case 4: Invalid URL**
- Enter: `not a url`
- Click "Shorten URL"
- Verify: Red error message appears

**Test Case 5: Long URL**
- Enter: `https://www.example.com/path/to/some/very/long/url/that/needs/shortening?param1=value1&param2=value2`
- Click "Shorten URL"
- Verify: Successfully shortens

**Test Case 6: Loading State**
- Enter any valid URL
- Click "Shorten URL"
- Verify: Button shows spinner and "Shortening..." text
- Verify: Button is disabled during loading

**Test Case 7: Reset Functionality**
- After shortening a URL
- Click "Shorten Another"
- Verify: Form clears, result disappears

**Test Case 8: Dark Mode (if supported by OS)**
- Switch your OS to dark mode
- Verify: UI adapts to dark theme

---

## Integration Testing

Both backend and frontend should be running simultaneously.

### Network Tab Inspection (Browser DevTools)

1. Open browser DevTools (F12)
2. Go to Network tab
3. Shorten a URL
4. Inspect the POST request to `/shorten`:
   - Status: 200 OK
   - Request payload: `{"url": "..."}`
   - Response: `{"short_code": "...", "short_url": "..."}`

### CORS Verification

- Verify no CORS errors in browser console
- Backend should accept requests from http://localhost:3000

### End-to-End Flow

1. Frontend (localhost:3000) → Submit URL
2. POST request → Backend (localhost:8000/shorten)
3. Backend → Generate code, store in SQLite, return response
4. Frontend → Display short URL
5. User → Visit short URL in browser
6. Backend → Lookup code, redirect to original URL

---

## Common Issues & Solutions

### Backend Issues

**Issue:** `ModuleNotFoundError: No module named 'fastapi'`
- **Solution:** Run `pip install -r requirements.txt`

**Issue:** `Address already in use`
- **Solution:** Port 8000 is occupied. Kill the process or use different port:
  ```bash
  uvicorn main:app --reload --port 8001
  ```
  Update frontend `.env.local` accordingly.

**Issue:** `Database is locked`
- **Solution:** Close any SQLite browser/tools, restart backend

### Frontend Issues

**Issue:** `Module not found` errors
- **Solution:** Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Issue:** API requests failing
- **Solution:** 
  - Verify backend is running
  - Check `.env.local` has correct API_URL
  - Check browser console for CORS errors

**Issue:** `EADDRINUSE: address already in use :::3000`
- **Solution:** Port 3000 is occupied. Kill the process or specify different port:
  ```bash
  npm run dev -- -p 3001
  ```

**Issue:** Dark mode not working
- **Solution:** This is OS-dependent. Check CSS media query support.

### Integration Issues

**Issue:** CORS errors in browser console
- **Solution:** Backend CORS middleware should allow `*` origins (already configured)

**Issue:** Network timeout
- **Solution:** 
  - Verify backend is running and accessible
  - Try accessing http://localhost:8000/health directly
  - Check firewall settings

---

## Performance Testing (Optional)

### Load Testing with curl

Test multiple URLs quickly:

```bash
for i in {1..10}; do
  curl -X POST http://localhost:8000/shorten \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"https://example.com/test-$i\"}" &
done
wait
```

### Database Growth

Check how many URLs are stored:

```bash
sqlite3 urls.db "SELECT COUNT(*) FROM urls;"
```

---

## Success Criteria

- ✅ Backend starts without errors
- ✅ Health endpoint returns 200
- ✅ POST /shorten creates short URLs
- ✅ Duplicate URLs return same code
- ✅ GET /{code} redirects correctly
- ✅ Invalid inputs return proper error codes
- ✅ Frontend builds and starts
- ✅ UI displays and accepts input
- ✅ Form submits to backend successfully
- ✅ Short URLs display in UI
- ✅ Copy button works
- ✅ End-to-end flow completes

---

## Next Steps

Once all tests pass:

1. **Code Review**: Review the generated code, understand patterns
2. **Extensions**: Try the extension challenges in the main README
3. **Deployment**: Follow Step 6-7 in main README to deploy
4. **Cleanup**: Stop both servers (Ctrl+C), delete test database if needed

---

## Troubleshooting Logs

### Enable Debug Logging

**Backend:**
```bash
uvicorn main:app --reload --log-level debug
```

**Frontend:**
Add `console.log()` statements in `page.tsx` to debug state changes.

### View Database Contents

```bash
sqlite3 urls.db ".schema urls"
sqlite3 urls.db "SELECT * FROM urls ORDER BY created_at DESC LIMIT 10;"
```

---

**Questions?** Refer back to the main [README.md](README.md) or check the course guides in the parent directory.
