"use client";

import { BarChart3, CheckCircle2, Loader2, QrCode as QrCodeIcon, Trophy, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCode } from "@/app/components/QrCode";
import type { PublicSessionPayload, QuestionResult } from "@/app/types";
import {
  getGeneralScreenFontOption,
  getGeneralScreenPalette,
  resolveGeneralScreenFontSize,
} from "@/lib/generalScreenAppearance";
import { getQuestionTimingState } from "@/lib/questionTiming";

type ScreenPageProps = {
  code: string;
};

function optionLetter(position: number, fallbackIndex: number) {
  const index = Math.max((position || fallbackIndex + 1) - 1, 0);
  return String.fromCharCode(65 + index);
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function answerLabel(count: number) {
  return pluralize(count, "antwoord", "antwoorden");
}

function participantLabel(count: number) {
  return pluralize(count, "deelnemer", "deelnemers");
}

function voteLabel(count: number) {
  return pluralize(count, "stem", "stemmen");
}

function pointLabel(count: number) {
  return pluralize(count, "punt", "punten");
}

function correctVerb(count: number) {
  return count === 1 ? "had" : "hadden";
}

function screenQuestionLabel(question: QuestionResult) {
  if (question.type === "slide") {
    return question.kind === "chapter_slide" ? "Tussenscherm" : "Informatieslide";
  }
  if (question.type === "quiz") {
    return "Quizvraag";
  }
  if (question.type === "open") {
    return "Open antwoord";
  }
  return "Multiple choice";
}

function SpotlightResults({ question }: { question: QuestionResult }) {
  if (question.type === "multiple" || question.type === "quiz") {
    const winner = question.options.reduce(
      (top, option) => (option.count > top.count ? option : top),
      question.options[0] ?? { id: "", label: "", isCorrect: false, count: 0, percentage: 0, position: 0 }
    );
    const correctOption = question.options.find((option) => option.isCorrect);
    const accents = [
      "bg-emerald-700",
      "bg-sky-800",
      "bg-amber-500",
      "bg-rose-700",
      "bg-violet-800",
      "bg-cyan-700",
      "bg-lime-700",
      "bg-fuchsia-800",
    ];

    if (question.type === "quiz") {
      return (
        <div className="grid items-stretch gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="flex h-full flex-col rounded-lg border border-emerald-200 bg-emerald-50 p-7 text-zinc-950">
            <p className="text-sm font-black uppercase text-emerald-800">Quizuitslag</p>
            <p className="mt-5 text-8xl font-black leading-none text-emerald-800 md:text-9xl">
              {question.correctCount}
            </p>
            <p className="mt-4 text-2xl font-black text-zinc-800">
              {participantLabel(question.correctCount)} {correctVerb(question.correctCount)} het goed
            </p>
            <p className="mt-3 text-xl font-bold text-zinc-700">
              van {question.answerCount} gegeven {answerLabel(question.answerCount)}
            </p>
            {correctOption ? (
              <div className="mt-8 rounded-lg bg-white p-6 text-center">
                <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-emerald-800">
                  <CheckCircle2 aria-hidden className="h-5 w-5" />
                  Juist antwoord
                </p>
                <p className="mt-4 text-8xl font-black leading-none text-zinc-950 md:text-9xl">
                  {optionLetter(correctOption.position, 0)}
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-zinc-800 md:text-3xl">
                  {correctOption.label}
                </h3>
              </div>
            ) : null}
          </section>

          <section className="flex h-full flex-col rounded-lg border border-zinc-700 bg-zinc-100 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/20 md:p-5">
            <p className="mb-4 text-sm font-black uppercase text-zinc-600">Antwoordopties</p>
            <div className="grid flex-1 auto-rows-fr gap-3">
              {question.options.map((option, index) => (
                <div
                  className={`flex items-center rounded-lg border p-4 ${
                    option.isCorrect
                      ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200"
                      : "border-zinc-200 bg-white"
                  }`}
                  key={option.id}
                >
                  <h3 className="flex w-full items-center gap-3 text-2xl font-black leading-tight">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-950 text-lg font-black text-white">
                      {optionLetter(option.position, index)}
                    </span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                    {option.isCorrect ? (
                      <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-xs font-black uppercase text-emerald-800">
                        Juist
                      </span>
                    ) : null}
                  </h3>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-7 text-zinc-950">
          <p className="text-sm font-black uppercase text-emerald-800">Hoogste score</p>
          <h3 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            {winner.label || "Nog geen keuze"}
          </h3>
          <p className="mt-5 text-7xl font-black text-emerald-800">{winner.percentage}%</p>
          <p className="mt-3 text-xl font-bold text-zinc-700">
            {winner.count} van {question.answerCount} {answerLabel(question.answerCount)}
          </p>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-100 p-6 text-zinc-950">
          <div className="space-y-5">
            {question.options.map((option, index) => (
              <div key={option.id} className="space-y-2">
                <div className="flex items-end justify-between gap-6">
                  <h3 className="inline-flex items-center gap-3 text-2xl font-black leading-tight">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-950 text-base font-black text-white">
                      {optionLetter(option.position, index)}
                    </span>
                    {option.label}
                  </h3>
                  <div className="text-right">
                    <p className="text-4xl font-black">{option.percentage}%</p>
                    <p className="text-sm font-bold text-zinc-600">
                      {option.count} {answerLabel(option.count)}
                    </p>
                  </div>
                </div>
                <div className="h-7 overflow-hidden rounded-full bg-white shadow-inner">
                  <div
                    className={`h-full rounded-full ${accents[index % accents.length]} transition-all duration-500`}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const responses = question.responses.filter((response) => response.textAnswer);
  const isCompact = responses.length > 16;
  const visibleResponses = responses.slice(0, isCompact ? 54 : 24);
  const cardStyles = [
    "border-emerald-200 bg-emerald-50",
    "border-sky-200 bg-sky-50",
    "border-amber-200 bg-amber-50",
    "border-rose-200 bg-rose-50",
    "border-violet-200 bg-violet-50",
    "border-cyan-200 bg-cyan-50",
  ];

  if (!responses.length) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-100 p-8 text-center text-zinc-950">
        <p className="text-3xl font-black">Nog geen antwoorden om te bespreken.</p>
      </div>
    );
  }

  return (
    <section
      className={
        isCompact
          ? "grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {visibleResponses.map((response, index) => (
        <article
          className={`rounded-lg border text-zinc-950 shadow-sm ${
            isCompact ? "p-3" : "p-5"
          } ${cardStyles[index % cardStyles.length]}`}
          key={response.id}
        >
          <p className={isCompact ? "mb-1 text-xs font-black uppercase text-zinc-600" : "mb-3 text-sm font-black uppercase text-zinc-600"}>
            {response.participantName}
          </p>
          <p
            className={isCompact ? "text-sm font-black leading-5 xl:text-base" : "text-2xl font-black leading-8"}
            style={
              isCompact
                ? {
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {response.textAnswer}
          </p>
        </article>
      ))}
    </section>
  );
}

function LeaderboardScreen({ session }: { session: PublicSessionPayload }) {
  const isFinal =
    session.quizTotals.total > 0 && session.quizTotals.finalized >= session.quizTotals.total;
  const topEntries = session.leaderboard.slice(0, 3);
  const otherEntries = session.leaderboard.slice(3, 27);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col gap-4 border-b border-zinc-700 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-300">Sessie Interactief</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{session.presentation.title}</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-5 py-3 text-xl font-black text-amber-950">
            <Trophy aria-hidden className="h-6 w-6" />
            {isFinal ? "Eindklassering" : "Tussenstand"}
          </span>
        </header>

        {!session.quizTotals.finalized || !session.leaderboard.length ? (
          <section className="grid flex-1 place-items-center text-center">
            <div>
              <p className="text-xl font-bold text-amber-200">
                {session.quizTotals.finalized ? "Nog geen deelnemers in de stand" : "Nog geen quizscore"}
              </p>
              <h2 className="mt-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
                {session.quizTotals.finalized
                  ? "Er zijn nog geen antwoorden die punten opleveren."
                  : "Toon eerst de resultaten van een quizvraag."}
              </h2>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-6">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 md:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-amber-200">
                    {session.quizTotals.finalized} van {session.quizTotals.total} quizvragen afgesloten
                  </p>
                  <h2 className="mt-2 text-4xl font-black leading-tight md:text-6xl">
                    {isFinal ? "Eindstand" : "Stand na de laatste quizvraag"}
                  </h2>
                </div>
                <p className="text-2xl font-black text-zinc-300">
                  {session.quizTotals.participants} {participantLabel(session.quizTotals.participants)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {topEntries.map((entry) => (
                <article
                  className={`rounded-lg border p-6 shadow-2xl ${
                    entry.rank === 1
                      ? "border-amber-300 bg-amber-100 text-amber-950"
                      : "border-zinc-700 bg-zinc-100 text-zinc-950"
                  }`}
                  key={entry.participantId}
                >
                  <p className="text-sm font-black uppercase">Plaats {entry.rank}</p>
                  <h3 className="mt-3 text-3xl font-black">{entry.label}</h3>
                  <p className="mt-5 text-6xl font-black leading-none">{entry.score}</p>
                  <p className="mt-2 text-xl font-black">{pointLabel(entry.score)}</p>
                  <p className="mt-4 text-sm font-bold opacity-75">
                    {entry.answered} van {session.quizTotals.finalized} beantwoord
                  </p>
                </article>
              ))}
            </div>

            <section className="rounded-lg border border-zinc-700 bg-zinc-100 p-5 text-zinc-950">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {otherEntries.map((entry) => (
                  <div
                    className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-lg bg-white px-4 py-3"
                    key={entry.participantId}
                  >
                    <span className="text-2xl font-black text-zinc-500">#{entry.rank}</span>
                    <span className="min-w-0 truncate text-lg font-black">{entry.label}</span>
                    <span className="rounded-md bg-zinc-950 px-3 py-2 font-black text-white">
                      {entry.score} {pointLabel(entry.score)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

function ResponsePulse({ count, questionType }: { count: number; questionType: QuestionResult["type"] }) {
  const label = questionType === "open" ? answerLabel(count) : voteLabel(count);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-5 py-4 text-center shadow-xl shadow-black/20 md:px-6 md:py-5">
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-300/90 md:text-sm">
          <Users aria-hidden className="h-4 w-4" />
          Reacties komen binnen
        </p>
        <p className="flex items-baseline justify-center gap-2 text-zinc-300">
          <span className="text-3xl font-black leading-none text-white md:text-4xl">{count}</span>
          <span className="text-base font-black md:text-lg">{label}</span>
        </p>
      </div>
    </section>
  );
}

export default function ScreenPage({ code }: ScreenPageProps) {
  const normalizedCode = useMemo(() => code.replace(/[^a-z0-9]/gi, "").toUpperCase(), [code]);
  const [session, setSession] = useState<PublicSessionPayload | null>(null);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const joinLink = origin ? `${origin}/join/${normalizedCode}` : "";

  const load = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(`/api/session/${normalizedCode}`, { cache: "no-store" });
        const data = (await response.json()) as PublicSessionPayload | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Sessie kon niet worden geladen.");
        }
        setSession(data);
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Sessie kon niet worden geladen.");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [normalizedCode]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load(true);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
        <div className="flex items-center gap-3 text-xl">
          <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
          Laden...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-8 text-center text-white">
        <div>
          <h1 className="text-4xl font-black">Sessie niet gevonden</h1>
          <p className="mt-4 text-lg text-rose-200">{error || "Controleer de code."}</p>
        </div>
      </main>
    );
  }

  const activeQuestion = session.activeQuestion;
  const resultsQuestion = session.screenQuestion ?? activeQuestion;
  const idleScreenText = session.presentation.idleScreenText || "Sessie Interactief";
  const activeQuestionTiming =
    activeQuestion?.type === "quiz" ? getQuestionTimingState(activeQuestion.content, "quiz", nowMs) : null;
  const activeCorrectOption =
    activeQuestion?.type === "quiz" ? activeQuestion.options.find((option) => option.isCorrect) ?? null : null;
  const compactOpenResults =
    resultsQuestion?.type === "open" &&
    resultsQuestion.responses.filter((response) => response.textAnswer).length > 16;
  const generalScreenPalette = getGeneralScreenPalette(session.presentation.generalScreenBackgroundColor);
  const generalScreenFont = getGeneralScreenFontOption(session.presentation.generalScreenFontFamily);
  const generalScreenFontSize = resolveGeneralScreenFontSize(session.presentation.generalScreenFontSize);
  const generalScreenStyle = {
    backgroundColor: generalScreenPalette.background,
    color: generalScreenPalette.foreground,
    fontFamily: generalScreenFont.css,
  };
  const generalBorderStyle = { borderColor: generalScreenPalette.border };
  const generalScreenHeadingStyle = {
    color: generalScreenPalette.foreground,
    fontSize: `${generalScreenFontSize}px`,
  };
  const generalScreenTitleStyle = {
    color: generalScreenPalette.foreground,
    fontSize: `${Math.max(34, Math.round(generalScreenFontSize * 0.52))}px`,
  };
  const generalScreenSlideHeadingStyle = {
    color: generalScreenPalette.foreground,
    fontSize: `${Math.max(44, Math.round(generalScreenFontSize * 0.78))}px`,
  };

  if (session.screenView === "qr") {
    return (
      <main className="min-h-screen" style={generalScreenStyle}>
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-rows-[auto_1fr] gap-6 px-6 py-6">
          <header
            className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between"
            style={generalBorderStyle}
          >
            <div>
              <p className="text-sm font-bold uppercase" style={{ color: generalScreenPalette.subtle }}>
                Sessie Interactief
              </p>
              <h1 className="mt-2 font-black" style={generalScreenTitleStyle}>
                {session.presentation.title}
              </h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-mono text-3xl font-black text-zinc-950">
              <QrCodeIcon aria-hidden className="h-7 w-7" />
              {session.presentation.code}
            </span>
          </header>

          <section className="grid items-center gap-8 lg:grid-cols-[1fr_560px]">
            <div>
              <p className="text-2xl font-bold" style={{ color: generalScreenPalette.subtle }}>
                Meedoen met de sessie
              </p>
              <h2
                className="mt-5 max-w-4xl font-black leading-tight"
                style={generalScreenHeadingStyle}
              >
                Scan de QR-code
              </h2>
              <p
                className="mt-6 max-w-3xl text-2xl font-semibold leading-9"
                style={{ color: generalScreenPalette.muted }}
              >
                Of ga naar de deelnemerslink en gebruik code{" "}
                <span className="font-mono" style={{ color: generalScreenPalette.subtle }}>
                  {session.presentation.code}
                </span>
                .
              </p>
            </div>
            <div className="justify-self-center lg:justify-self-end">
              <QrCode label={joinLink || session.presentation.code} size={520} value={joinLink || session.presentation.code} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (session.screenView === "ranking") {
    return <LeaderboardScreen session={session} />;
  }

  if (session.screenView === "results") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
          <header className="flex flex-col gap-4 border-b border-zinc-700 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-300">Sessie Interactief</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{session.presentation.title}</h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-xl font-black text-zinc-950">
              <BarChart3 aria-hidden className="h-6 w-6 text-sky-800" />
              Resultaten
            </span>
          </header>

          {resultsQuestion ? (
            <section className="flex flex-1 flex-col gap-6">
              <div
                className={`rounded-lg border border-zinc-700 bg-zinc-900 ${
                  compactOpenResults ? "p-5" : "p-7 md:p-9"
                }`}
              >
                <div className="mx-auto max-w-6xl">
                  <span className="rounded-md bg-sky-300 px-2 py-1 text-xs font-black uppercase text-sky-950">
                    Bespreekmoment
                  </span>
                  <h2
                    className={
                      compactOpenResults
                        ? "mt-3 text-3xl font-black leading-tight md:text-4xl"
                        : "mt-5 text-4xl font-black leading-tight md:text-6xl"
                    }
                  >
                    {resultsQuestion.prompt}
                  </h2>
                  <p
                    className={`${compactOpenResults ? "mt-2 text-base" : "mt-4 text-xl"} font-bold text-zinc-300`}
                  >
                    {resultsQuestion.answerCount} {answerLabel(resultsQuestion.answerCount)} verzameld
                  </p>
                </div>
              </div>
              <SpotlightResults question={resultsQuestion} />
            </section>
          ) : (
            <section className="grid flex-1 place-items-center text-center">
              <div>
                <p className="text-xl font-bold text-amber-200">Geen resultaten geselecteerd</p>
                <h2 className="mt-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
                  Zet eerst een vraag live om resultaten groot te tonen.
                </h2>
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  const isGeneralQuestionScreen = !activeQuestion || activeQuestion.type === "slide";

  return (
    <main
      className={`min-h-screen ${isGeneralQuestionScreen ? "" : "bg-zinc-950 text-white"}`}
      style={isGeneralQuestionScreen ? generalScreenStyle : undefined}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
        {activeQuestion ? (
          <header
            className={`border-b pb-5 ${isGeneralQuestionScreen ? "" : "border-zinc-700"}`}
            style={isGeneralQuestionScreen ? generalBorderStyle : undefined}
          >
            <div>
              <p
                className={`text-sm font-bold uppercase ${isGeneralQuestionScreen ? "" : "text-emerald-300"}`}
                style={isGeneralQuestionScreen ? { color: generalScreenPalette.subtle } : undefined}
              >
                Sessie Interactief
              </p>
              <h1
                className={`mt-2 font-black ${isGeneralQuestionScreen ? "" : "text-3xl md:text-5xl"}`}
                style={isGeneralQuestionScreen ? generalScreenTitleStyle : undefined}
              >
                {session.presentation.title}
              </h1>
            </div>
          </header>
        ) : null}

        {!activeQuestion ? (
          <section className="grid flex-1 place-items-center text-center">
            <h2
              className="max-w-5xl break-words font-black leading-tight"
              style={generalScreenHeadingStyle}
            >
              {idleScreenText}
            </h2>
          </section>
        ) : activeQuestionTiming?.isCountdown ? (
          <section className="grid flex-1 place-items-center text-center">
            <div className="mx-auto w-full max-w-4xl rounded-lg border border-zinc-700 bg-zinc-900 p-10 md:p-14">
              <p className="text-xl font-black uppercase tracking-wide text-emerald-300">Quiz start zo</p>
              <h2 className="mt-8 text-[168px] font-black leading-none text-white md:text-[240px]">
                {activeQuestionTiming.countdownNumber}
              </h2>
              <div className="mx-auto mt-8 h-4 max-w-2xl overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-[width] duration-200"
                  style={{ width: `${Math.round(activeQuestionTiming.countdownProgress * 100)}%` }}
                />
              </div>
            </div>
          </section>
        ) : activeQuestion.type === "quiz" && activeQuestionTiming?.isExpired ? (
          <section className="grid flex-1 place-items-center text-center">
            <div className="mx-auto w-full max-w-6xl rounded-lg border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/30 md:p-12">
              <p className="text-lg font-black uppercase tracking-wide text-amber-200 md:text-xl">Tijd voorbij</p>
              <h2 className="mx-auto mt-5 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
                {activeQuestion.prompt}
              </h2>
              {activeCorrectOption ? (
                <div className="mx-auto mt-9 grid max-w-4xl gap-5 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-zinc-950 md:grid-cols-[160px_1fr] md:items-center md:p-8">
                  <div className="grid h-36 w-full place-items-center rounded-lg bg-emerald-700 text-7xl font-black leading-none text-white md:h-40 md:text-8xl">
                    {optionLetter(activeCorrectOption.position, 0)}
                  </div>
                  <div className="text-left">
                    <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-emerald-800">
                      <CheckCircle2 aria-hidden className="h-5 w-5" />
                      Juist antwoord
                    </p>
                    <p className="mt-3 text-3xl font-black leading-tight text-zinc-950 md:text-5xl">
                      {activeCorrectOption.label}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mx-auto mt-8 max-w-3xl text-2xl font-bold leading-9 text-zinc-300">
                  De quizvraag is gesloten.
                </p>
              )}
              <p className="mt-7 text-lg font-bold text-zinc-400">
                {activeQuestion.answerCount} {voteLabel(activeQuestion.answerCount)} ontvangen
              </p>
            </div>
          </section>
        ) : (
          <section
            className={
              activeQuestion.type === "slide"
                ? "grid flex-1 place-items-center"
                : "grid flex-1 grid-rows-[1fr_auto] gap-5"
            }
          >
            <div
              className={`grid min-h-[56vh] place-items-center rounded-lg border p-8 text-center md:min-h-[62vh] md:p-12 ${
                activeQuestion.type === "slide" ? "" : "border-zinc-700 bg-zinc-900"
              }`}
              style={
                activeQuestion.type === "slide"
                  ? {
                      backgroundColor: generalScreenPalette.panel,
                      borderColor: generalScreenPalette.border,
                      color: generalScreenPalette.foreground,
                    }
                  : undefined
              }
            >
              <div className="mx-auto max-w-6xl">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black uppercase ${
                    activeQuestion.type === "slide" ? "" : "bg-emerald-300 text-emerald-950"
                  }`}
                  style={
                    activeQuestion.type === "slide"
                      ? {
                          backgroundColor: generalScreenPalette.badgeBackground,
                          color: generalScreenPalette.badgeForeground,
                        }
                      : undefined
                  }
                >
                  {screenQuestionLabel(activeQuestion)}
                </span>
                <h2
                  className={`mt-5 font-black leading-tight ${
                    activeQuestion.type === "slide" ? "" : "text-5xl md:text-7xl"
                  }`}
                  style={activeQuestion.type === "slide" ? generalScreenSlideHeadingStyle : undefined}
                >
                  {activeQuestion.prompt}
                </h2>
                {activeQuestion.description ? (
                  <p
                    className={`mx-auto mt-6 max-w-4xl whitespace-pre-line text-2xl font-semibold leading-10 ${
                      activeQuestion.type === "slide" ? "" : "text-zinc-200"
                    }`}
                    style={activeQuestion.type === "slide" ? { color: generalScreenPalette.muted } : undefined}
                  >
                    {activeQuestion.description}
                  </p>
                ) : null}
              </div>
            </div>
            {activeQuestion.type === "slide" ? null : (
              <ResponsePulse count={activeQuestion.answerCount} questionType={activeQuestion.type} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}
