"use client";

import type { ReviewResponse, Issue } from "@/lib/api";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const CATEGORY_ICONS: Record<string, string> = {
  bug: "🐛",
  security: "🔒",
  performance: "⚡",
  style: "🎨",
  maintainability: "🔧",
};

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-green-100 text-green-800";
  if (score <= 3) color = "bg-red-100 text-red-800";
  else if (score <= 5) color = "bg-yellow-100 text-yellow-800";
  else if (score <= 7) color = "bg-blue-100 text-blue-800";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-lg font-bold ${color}`}>
      {score}/10
    </span>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.low;
  const icon = CATEGORY_ICONS[issue.category] || "📝";

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${style.border} ${style.text}`}
          >
            {issue.severity}
          </span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {icon} {issue.category}
          </span>
        </div>
        {issue.line && (
          <span className="code-font rounded bg-white/60 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            Line {issue.line}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mb-2 text-sm text-[var(--text-primary)]">{issue.description}</p>

      {/* Code snippet if present */}
      {issue.code_snippet && (
        <pre className="code-font mb-2 rounded bg-white/80 p-2 text-xs text-red-600 overflow-x-auto">
          {issue.code_snippet}
        </pre>
      )}

      {/* Suggestion */}
      <div className="rounded bg-green-50 border border-green-200 p-3">
        <p className="text-xs font-medium text-green-800 mb-1">Suggestion</p>
        <p className="code-font text-sm text-green-900">{issue.suggestion}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-[var(--bg-tertiary)]" />
        <div className="h-5 w-20 rounded-full bg-[var(--bg-tertiary)]" />
      </div>
      <div className="mb-2 h-4 w-3/4 rounded bg-[var(--bg-tertiary)]" />
      <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="animate-pulse rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="mb-3 h-6 w-1/3 rounded bg-[var(--bg-tertiary)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default function ReviewResults({ data }: { data: ReviewResponse }) {
  const sortedIssues = [...data.issues].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  const issueCounts = data.issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review Summary</h2>
          <ScoreBadge score={data.metrics.overall_score} />
        </div>

        <p className="mb-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          {data.summary}
        </p>

        {/* Metrics row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-secondary)]">Complexity:</span>
            <span className="font-medium capitalize">{data.metrics.complexity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-secondary)]">Maintainability:</span>
            <span className="font-medium capitalize">{data.metrics.maintainability}</span>
          </div>
          {data.issues.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Issues:</span>
              <span className="font-medium">
                {Object.entries(issueCounts)
                  .map(([sev, count]) => `${count} ${sev}`)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Issues */}
      {sortedIssues.length > 0 ? (
        <>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Issues ({sortedIssues.length})
          </h3>
          {sortedIssues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg text-green-800">No issues found!</p>
          <p className="mt-1 text-sm text-green-600">Your code looks great.</p>
        </div>
      )}

      {/* General suggestions */}
      {data.suggestions.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-white p-6">
          <h3 className="mb-3 text-base font-semibold">General Suggestions</h3>
          <ul className="space-y-2">
            {data.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="mt-0.5 text-[var(--accent)]">&#10003;</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
