# 🔬 Code Analyzer Agent — API Reference & Examples

> **Live URL:** `https://code-analyser-production.up.railway.app`

A deployed LLM-powered code analysis API that returns structured JSON feedback for any code snippet. Built with **FastAPI + Anthropic Claude**.

---

## 📡 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | General code review |
| `POST` | `/analyze/security` | Security-focused analysis |
| `POST` | `/analyze/performance` | Performance-focused analysis |
| `GET` | `/health` | Health check |

### Request Body

```json
{
  "code": "string (required) — the source code to analyze",
  "language": "string (optional, default: 'python') — e.g. 'csharp', 'javascript', 'go'"
}
```

### Response Schema

```json
{
  "summary": "2-3 sentence overview",
  "issues": [
    {
      "severity": "critical | high | medium | low",
      "line": 5,
      "category": "bug | security | performance | style | maintainability",
      "description": "what's wrong",
      "suggestion": "how to fix it"
    }
  ],
  "suggestions": ["general improvement ideas"],
  "metrics": {
    "complexity": "low | medium | high",
    "readability": "poor | fair | good | excellent",
    "test_coverage_estimate": "none | partial | good"
  }
}
```

---

## 🏥 Health Check

```bash
curl https://code-analyser-production.up.railway.app/health
```

Expected:
```json
{"status": "healthy", "provider": "google"}
```

---

## 🧪 C# Examples with Code Smells

### Example 1: God Class + SQL Injection + Hardcoded Credentials

**Smells:** God class, hardcoded connection string with password, SQL injection, no `IDisposable`/`using`, `Thread.Sleep`, magic numbers, long parameter list, public mutable static field.

```bash
curl -X POST https://code-analyser-production.up.railway.app/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class UserManager\n{\n    public string connStr = \"Server=prod;Password=admin123\";\n    public void ProcessUser(object data)\n    {\n        var x = (string)data;\n        var conn = new SqlConnection(connStr);\n        conn.Open();\n        var cmd = new SqlCommand(\"SELECT * FROM Users WHERE Name = '\'' + x + \"'\''\", conn);\n        var reader = cmd.ExecuteReader();\n        Thread.Sleep(5000);\n        if (reader.Read())\n        {\n            var y = reader[0];\n            Console.WriteLine(y);\n            SendEmail(y.ToString(), 3);\n            LogToFile(y.ToString(), 1, 2, 3, true, false, \"abc\");\n        }\n    }\n    public void SendEmail(string msg, int retries) { /* todo */ }\n    public void LogToFile(string msg, int a, int b, int c, bool d, bool e, string f) { }\n    public static List<string> cache = new List<string>();\n}",
    "language": "csharp"
  }'
```

<details>
<summary>🔍 What the analyzer should catch</summary>

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Security | Hardcoded password in connection string |
| 2 | 🔴 Critical | Security | SQL injection via string concatenation |
| 3 | 🟠 High | Bug | `SqlConnection` / `SqlCommand` / `SqlDataReader` not disposed |
| 4 | 🟠 High | Performance | `Thread.Sleep(5000)` blocks the thread |
| 5 | 🟡 Medium | Maintainability | God class — mixing DB, email, logging |
| 6 | 🟡 Medium | Style | Magic number `5000`, `3` |
| 7 | 🟡 Medium | Style | `LogToFile` has 7 parameters (long parameter list) |
| 8 | 🔵 Low | Style | Non-descriptive variable names (`x`, `y`) |
| 9 | 🔵 Low | Maintainability | Public mutable static `cache` field |

</details>

---

### Example 2: Security Vulnerabilities + Async Anti-patterns

**Smells:** Hardcoded secret key, SQL injection, Base64 used as "hashing", `.Result` causing deadlocks, path traversal, plain HTTP.

```bash
curl -X POST https://code-analyser-production.up.railway.app/analyze/security \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class AuthService\n{\n    private string _secret = \"my-super-secret-key-12345\";\n    public bool Login(string user, string pass)\n    {\n        var query = $\"SELECT * FROM Users WHERE username='\''{ user}'\'' AND password='\''{ pass}'\''\";\n        var result = ExecuteQuery(query);\n        if (result != null) return true;\n        return false;\n    }\n    public string HashPassword(string password)\n    {\n        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(password));\n    }\n    public async Task<string> GetToken()\n    {\n        var result = HttpClient().GetStringAsync(\"http://api.example.com/token\").Result;\n        return result;\n    }\n    public void SaveFile(string userInput)\n    {\n        File.WriteAllText(\"/tmp/\" + userInput, \"data\");\n    }\n}",
    "language": "csharp"
  }'
```

<details>
<summary>🔍 What the analyzer should catch</summary>

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Security | SQL injection in `Login()` |
| 2 | 🔴 Critical | Security | Hardcoded secret key |
| 3 | 🔴 Critical | Security | Base64 is NOT hashing — passwords stored reversibly |
| 4 | 🔴 Critical | Security | Path traversal in `SaveFile()` — user controls file path |
| 5 | 🟠 High | Security | Plain HTTP for token endpoint (should be HTTPS) |
| 6 | 🟠 High | Bug | `.Result` on async call — deadlock risk |
| 7 | 🟠 High | Security | Storing/comparing plain-text passwords |
| 8 | 🟡 Medium | Performance | `new HttpClient()` per call — socket exhaustion |

</details>

---

### Example 3: Performance Anti-patterns

**Smells:** O(n²) nested loop, N+1 query problem, string concatenation in loop, redundant sorting, `Thread.Sleep` in hot path.

```bash
curl -X POST https://code-analyser-production.up.railway.app/analyze/performance \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class ReportGenerator\n{\n    public List<string> GenerateReport(List<Order> orders)\n    {\n        var result = new List<string>();\n        foreach (var order in orders)\n        {\n            foreach (var item in orders)\n            {\n                if (order.Id == item.Id)\n                {\n                    var details = GetOrderDetails(order.Id);\n                    result.Add(details);\n                }\n            }\n        }\n        var sorted = result.OrderBy(x => x).ToList();\n        sorted = sorted.OrderBy(x => x.Length).ToList();\n        for (int i = 0; i < sorted.Count; i++)\n        {\n            sorted[i] = sorted[i] + DateTime.Now.ToString();\n            string concat = \"\";\n            for (int j = 0; j < 10000; j++)\n                concat += j.ToString();\n        }\n        return sorted;\n    }\n    private string GetOrderDetails(int id)\n    {\n        Thread.Sleep(100);\n        using var conn = new SqlConnection(\"...\");\n        conn.Open();\n        return conn.QueryFirst<string>($\"SELECT * FROM Orders WHERE Id = {id}\");\n    }\n}",
    "language": "csharp"
  }'
```

<details>
<summary>🔍 What the analyzer should catch</summary>

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Performance | O(n²) nested loop comparing list to itself |
| 2 | 🔴 Critical | Performance | N+1 query — `GetOrderDetails()` called per iteration |
| 3 | 🟠 High | Performance | String concatenation in loop (`concat += ...`) — use `StringBuilder` |
| 4 | 🟠 High | Performance | `Thread.Sleep(100)` in data-access hot path |
| 5 | 🟡 Medium | Performance | Sorting twice — second `.OrderBy()` discards first sort |
| 6 | 🟡 Medium | Performance | `DateTime.Now.ToString()` called repeatedly in loop |
| 7 | 🟡 Medium | Security | SQL interpolation in `GetOrderDetails` |

</details>

---

## 🐍 Bonus: Python Example

```bash
curl -X POST https://code-analyser-production.up.railway.app/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import pickle, os\n\ndef load_config(user_path):\n    with open(user_path, \"rb\") as f:\n        return pickle.load(f)\n\ndef run_command(cmd):\n    os.system(cmd)\n\nclass DB:\n    pwd = \"root123\"\n    def query(self, table, name):\n        return f\"SELECT * FROM {table} WHERE name = '\''{name}'\''\"",
    "language": "python"
  }'
```

---

## 🌐 Using from Code

### Python

```python
import requests

response = requests.post(
    "https://code-analyser-production.up.railway.app/analyze",
    json={
        "code": "your code here",
        "language": "csharp"
    }
)
print(response.json())
```

### JavaScript / TypeScript

```typescript
const response = await fetch("https://code-analyser-production.up.railway.app/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    code: "your code here",
    language: "csharp",
  }),
});
const analysis = await response.json();
console.log(analysis);
```

---

## 🏗️ Architecture

```
┌──────────┐     POST /analyze      ┌──────────────┐     API call     ┌─────────┐
│  Client   │ ──────────────────────▶│  FastAPI App  │ ───────────────▶│ Gemini  │
│ (curl/app)│ ◀──────────────────────│  (Railway)    │ ◀───────────────│   LLM   │
└──────────┘    Structured JSON      └──────────────┘   Raw analysis   └─────────┘
```

---

## 📝 License

Built as part of the **Agentic AI Training** — Lab 02.
