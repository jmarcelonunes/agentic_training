"use client";

import { useState } from "react";
import CodeInput from "@/components/CodeInput";
import ReviewResults, { LoadingSkeleton } from "@/components/ReviewResults";
import { reviewCode, type ReviewResponse } from "@/lib/api";

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<"python" | "csharp">("python");
  const [focus, setFocus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await reviewCode({
        code,
        language,
        focus: focus.length > 0 ? focus : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-lg">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Code Review Bot
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Instant AI-powered feedback on your Python and C# code
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Code input */}
          <div>
            <CodeInput
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              focus={focus}
              setFocus={setFocus}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* Right: Results */}
          <div>
            {isLoading && <LoadingSkeleton />}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Review failed
                </p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            )}

            {result && <ReviewResults data={result} />}

            {!isLoading && !error && !result && (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)]">
                <div className="text-center">
                  <p className="text-4xl mb-3">📝</p>
                  <p className="text-[var(--text-secondary)]">
                    Paste your code and click{" "}
                    <span className="font-medium text-[var(--accent)]">
                      Review My Code
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]/60">
                    Results will appear here in PR-comment style
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
