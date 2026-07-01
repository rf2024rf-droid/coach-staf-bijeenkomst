"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { QuestionResult } from "@/app/types";

type ResultViewProps = {
  question: QuestionResult;
  mode?: "compact" | "screen" | "dashboard";
};

export function ResultView({ question, mode = "dashboard" }: ResultViewProps) {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const showAllResponses = expandedQuestionId === question.id;

  if (question.type === "multiple") {
    return (
      <div className={mode === "screen" ? "space-y-5" : "space-y-3"}>
        {question.options.map((option) => (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-800">
              <span>{option.label}</span>
              <span className="tabular-nums text-zinc-600">
                {option.count} / {option.percentage}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
        {!question.answerCount ? <p className="text-sm text-zinc-500">Nog geen antwoorden.</p> : null}
      </div>
    );
  }

  const responses = question.responses.filter((response) => response.textAnswer);

  if (!responses.length) {
    return <p className="text-sm text-zinc-500">Nog geen antwoorden.</p>;
  }

  const responseLimit = mode === "screen" ? 42 : 16;
  const canExpand = mode !== "screen" && responses.length > responseLimit;
  const visibleResponses =
    canExpand && showAllResponses ? responses : responses.slice(0, responseLimit);

  return (
    <div className="space-y-3">
      <div
        className={
          mode === "screen"
            ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            : "grid gap-3 md:grid-cols-2"
        }
      >
        {visibleResponses.map((response) => (
          <article key={response.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className={mode === "screen" ? "text-lg leading-7 text-zinc-900" : "text-sm leading-6 text-zinc-800"}>
              {response.textAnswer}
            </p>
          </article>
        ))}
      </div>

      {canExpand ? (
        <button
          aria-expanded={showAllResponses}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-100"
          onClick={() => setExpandedQuestionId((current) => (current === question.id ? null : question.id))}
          type="button"
        >
          {showAllResponses ? (
            <ChevronUp aria-hidden className="h-4 w-4" />
          ) : (
            <ChevronDown aria-hidden className="h-4 w-4" />
          )}
          {showAllResponses
            ? "Toon minder antwoorden"
            : `Toon alle ${responses.length} antwoorden`}
        </button>
      ) : null}
    </div>
  );
}
