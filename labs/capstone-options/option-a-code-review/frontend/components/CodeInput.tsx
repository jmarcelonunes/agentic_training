"use client";

import { useRef } from "react";

interface CodeInputProps {
  code: string;
  setCode: (code: string) => void;
  language: "python" | "csharp";
  setLanguage: (lang: "python" | "csharp") => void;
  focus: string[];
  setFocus: (focus: string[]) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const FOCUS_OPTIONS = [
  { value: "bugs", label: "Bugs" },
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "style", label: "Style" },
  { value: "maintainability", label: "Maintainability" },
];

export default function CodeInput({
  code,
  setCode,
  language,
  setLanguage,
  focus,
  setFocus,
  onSubmit,
  isLoading,
}: CodeInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setCode(content);
        // Auto-detect language from extension
        if (file.name.endsWith(".cs")) {
          setLanguage("csharp");
        } else if (file.name.endsWith(".py")) {
          setLanguage("python");
        }
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  };

  const toggleFocus = (value: string) => {
    if (focus.includes(value)) {
      setFocus(focus.filter((f) => f !== value));
    } else {
      setFocus([...focus, value]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Your Code
        </h2>
        <div className="flex items-center gap-3">
          {/* Language picker */}
          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value as "python" | "csharp")
            }
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm
                       focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="python">Python</option>
            <option value="csharp">C#</option>
          </select>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm
                       text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Upload file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.cs"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Code textarea */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={
          language === "python"
            ? "# Paste your Python code here...\ndef hello():\n    print('Hello, world!')"
            : "// Paste your C# code here...\npublic class Hello\n{\n    public void Greet() => Console.WriteLine(\"Hello!\");\n}"
        }
        className="code-font min-h-[400px] w-full resize-y rounded-lg border border-[var(--border)]
                   bg-white p-4 text-sm leading-relaxed
                   placeholder:text-[var(--text-secondary)]/50
                   focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        spellCheck={false}
      />

      {/* Focus areas */}
      <div>
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          Focus on (optional):
        </p>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleFocus(opt.value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                focus.includes(opt.value)
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={isLoading || !code.trim()}
        className="rounded-lg bg-[var(--accent)] px-6 py-3 text-base font-medium text-white
                   transition-colors hover:bg-[var(--accent)]/90
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Reviewing...
          </span>
        ) : (
          "Review My Code"
        )}
      </button>
    </div>
  );
}
