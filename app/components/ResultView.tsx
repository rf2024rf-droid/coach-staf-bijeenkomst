"use client";

import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { QuestionResult } from "@/app/types";

type ResultViewProps = {
  question: QuestionResult;
  mode?: "compact" | "screen" | "dashboard";
};

function optionLetter(position: number, fallbackIndex: number) {
  const index = Math.max((position || fallbackIndex + 1) - 1, 0);
  return String.fromCharCode(65 + index);
}

export function ResultView({ question, mode = "dashboard" }: ResultViewProps) {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const showAllResponses = expandedQuestionId === question.id;

  if (question.type === "slide") {
    return (
      <section className="glass-row rounded-lg p-4 text-zinc-200">
        <p className="text-sm font-black uppercase text-zinc-400">Slide zonder antwoorden</p>
        {question.description ? (
          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6">{question.description}</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Dit onderdeel verzamelt geen reacties.</p>
        )}
      </section>
    );
  }

  if (question.type === "multiple" || question.type === "quiz") {
    const correctOption = question.options.find((option) => option.isCorrect);

    return (
      <div className={mode === "screen" ? "space-y-5" : "space-y-3"}>
        {question.type === "quiz" ? (
          <section className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 p-4 text-emerald-100">
            <p className="text-sm font-black uppercase">Quizuitslag</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black">{question.correctPercentage}% goed</span>
              <span className="pb-1 text-sm font-bold">
                {question.correctCount} van {question.answerCount} antwoorden
              </span>
            </div>
            {correctOption ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 aria-hidden className="h-4 w-4" />
                Juist antwoord: {correctOption.label}
              </p>
            ) : null}
          </section>
        ) : null}
        {question.options.map((option, index) => (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-200">
              <span className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-900 text-xs font-black text-white">
                  {optionLetter(option.position, index)}
                </span>
                {option.label}
                {question.type === "quiz" && option.isCorrect ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black uppercase text-emerald-800">
                    Juist
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-zinc-400">
                {option.count} / {option.percentage}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  question.type === "quiz" && !option.isCorrect ? "bg-zinc-500" : "bg-emerald-700"
                }`}
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
        {!question.answerCount ? <p className="text-sm text-zinc-400">Nog geen antwoorden.</p> : null}
      </div>
    );
  }

  const responses = question.responses.filter((response) => response.textAnswer);

  if (!responses.length) {
    return <p className="text-sm text-zinc-400">Nog geen antwoorden.</p>;
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
          <article key={response.id} className="glass-row rounded-lg p-4">
            <p className={mode === "screen" ? "text-lg leading-7 text-white" : "text-sm leading-6 text-zinc-200"}>
              {response.textAnswer}
            </p>
          </article>
        ))}
      </div>

      {canExpand ? (
        <button
          aria-expanded={showAllResponses}
          className="liquid-button inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-zinc-100 hover:bg-white/[0.1]"
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
