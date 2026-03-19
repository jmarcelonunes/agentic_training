# Sample Code for Testing

Paste any of these into the Code Review Bot to see it in action.

---

## Python — User Authentication (has issues)

```python
import hashlib
import sqlite3

def login(username, password):
    conn = sqlite3.connect("users.db")
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    result = conn.execute(query).fetchone()
    if result:
        return {"token": hashlib.md5(username.encode()).hexdigest()}
    return None

def register(username, password):
    conn = sqlite3.connect("users.db")
    hashed = hashlib.sha1(password.encode()).hexdigest()
    conn.execute(f"INSERT INTO users VALUES ('{username}', '{hashed}')")
    conn.commit()
    return True

def get_users():
    conn = sqlite3.connect("users.db")
    users = conn.execute("SELECT * FROM users").fetchall()
    passwords = [u[1] for u in users]
    print(f"DEBUG: all passwords = {passwords}")
    return users

def delete_user(user_id):
    conn = sqlite3.connect("users.db")
    conn.execute(f"DELETE FROM users WHERE id = {user_id}")
    conn.commit()

def process_data(items=[]):
    items.append("processed")
    results = []
    for i in range(len(items)):
        results.append(items[i].upper())
    return results
```

---

## C# — Order Processing (has issues)

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;

public class OrderService
{
    private HttpClient client = new HttpClient();
    private string connectionString = "Server=prod-db;User=admin;Password=s3cret123;";

    public decimal CalculateDiscount(decimal price, string customerType)
    {
        if (customerType == "vip")
            return price * 0.20m;
        if (customerType == "regular")
            return price * 0.05m;
        if (customerType == "VIP")
            return price * 0.20m;
        return 0;
    }

    public void ProcessOrder(int orderId)
    {
        var response = client.GetAsync($"https://api.example.com/orders/{orderId}").Result;
        var body = response.Content.ReadAsStringAsync().Result;
        File.WriteAllText($"/tmp/{orderId}.json", body);

        var conn = new System.Data.SqlClient.SqlConnection(connectionString);
        conn.Open();
        var cmd = new System.Data.SqlClient.SqlCommand(
            $"UPDATE orders SET status = 'processed' WHERE id = {orderId}", conn);
        cmd.ExecuteNonQuery();
    }

    public List<string> GetOrderNames(List<int> orderIds)
    {
        var names = new List<string>();
        foreach (var id in orderIds)
        {
            var response = client.GetAsync($"https://api.example.com/orders/{id}").Result;
            names.Add(response.Content.ReadAsStringAsync().Result);
        }
        return names;
    }

    public double CalculateTotal(List<double> prices)
    {
        double total = 0;
        for (int i = 0; i <= prices.Count; i++)
        {
            total = total + prices[i];
        }
        return total;
    }
}
```

---

## What to look for

| Issue | Python sample | C# sample |
|-------|--------------|-----------|
| SQL injection | `f"SELECT ... '{username}'"` | `$"UPDATE ... {orderId}"` |
| Weak hashing | MD5 for tokens, SHA1 for passwords | — |
| Hardcoded secrets | — | Connection string with password |
| No resource cleanup | DB connections never closed | SqlConnection not disposed |
| Blocking async | — | `.Result` instead of `await` |
| Off-by-one error | — | `i <= prices.Count` |
| Mutable default arg | `items=[]` | — |
| Logging secrets | Prints all passwords | — |
| N+1 requests | — | Loop calling API per order |
| Case sensitivity bug | — | `"vip"` vs `"VIP"` duplicate |
