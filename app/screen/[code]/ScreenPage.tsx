"use client";

import { BarChart3, Loader2, QrCode as QrCodeIcon, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCode } from "@/app/components/QrCode";
import type { PublicSessionPayload, QuestionResult } from "@/app/types";

type ScreenPageProps = {
  code: string;
};

function SpotlightResults({ question }: { question: QuestionResult }) {
  if (question.type === "multiple") {
    const winner = question.options.reduce(
      (top, option) => (option.count > top.count ? option : top),
      question.options[0] ?? { id: "", label: "", count: 0, percentage: 0, position: 0 }
    );
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

    return (
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-7 text-zinc-950">
          <p className="text-sm font-black uppercase text-emerald-800">Hoogste score</p>
          <h3 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            {winner.label || "Nog geen keuze"}
          </h3>
          <p className="mt-5 text-7xl font-black text-emerald-800">{winner.percentage}%</p>
          <p className="mt-3 text-xl font-bold text-zinc-700">
            {winner.count} van {question.answerCount} antwoorden
          </p>
        </section>

        <section className="rounded-lg border border-zinc-700 bg-zinc-100 p-6 text-zinc-950">
          <div className="space-y-5">
            {question.options.map((option, index) => (
              <div key={option.id} className="space-y-2">
                <div className="flex items-end justify-between gap-6">
                  <h3 className="text-2xl font-black leading-tight">{option.label}</h3>
                  <div className="text-right">
                    <p className="text-4xl font-black">{option.percentage}%</p>
                    <p className="text-sm font-bold text-zinc-600">{option.count} antwoorden</p>
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

function ResponsePulse({ count, questionType }: { count: number; questionType: QuestionResult["type"] }) {
  const label = questionType === "multiple" ? "stemmen" : "antwoorden";
  const dots = Array.from({ length: 18 }, (_, index) => index);
  const activeDots = Math.min(dots.length, Math.max(1, count));

  return (
    <section className="grid flex-1 items-center gap-8 rounded-lg border border-zinc-700 bg-zinc-900 p-8 md:grid-cols-[1fr_420px] md:p-10">
      <div>
        <p className="inline-flex items-center gap-3 text-lg font-black uppercase tracking-wide text-emerald-300">
          <Users aria-hidden className="h-6 w-6" />
          Reacties komen binnen
        </p>
        <div className="mt-6 flex items-end gap-5">
          <span className="text-8xl font-black leading-none text-white md:text-9xl">{count}</span>
          <span className="pb-4 text-3xl font-black text-zinc-300">{label}</span>
        </div>
        <p className="mt-6 max-w-2xl text-2xl font-semibold leading-9 text-zinc-300">
          De resultaten blijven verborgen totdat de presentator ze op het grote scherm zet.
        </p>
      </div>

      <div className="relative grid aspect-square place-items-center justify-self-center">
        <div className="absolute h-72 w-72 rounded-full border border-emerald-300/30" />
        <div className="absolute h-56 w-56 animate-pulse rounded-full bg-emerald-300/10" />
        <div className="relative grid h-72 w-72 grid-cols-6 gap-3 rounded-full bg-zinc-950 p-8 shadow-2xl shadow-emerald-950/40">
          {dots.map((dot) => (
            <span
              className={`h-7 w-7 rounded-full transition ${
                dot < activeDots ? "bg-emerald-300 shadow-lg shadow-emerald-300/30" : "bg-zinc-800"
              }`}
              key={dot}
            />
          ))}
        </div>
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
  const compactOpenResults =
    resultsQuestion?.type === "open" &&
    resultsQuestion.responses.filter((response) => response.textAnswer).length > 16;

  if (session.screenView === "qr") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-rows-[auto_1fr] gap-6 px-6 py-6">
          <header className="flex flex-col gap-4 border-b border-zinc-700 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-300">Coach Staf Bijeenkomst</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{session.presentation.title}</h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-mono text-3xl font-black text-zinc-950">
              <QrCodeIcon aria-hidden className="h-7 w-7" />
              {session.presentation.code}
            </span>
          </header>

          <section className="grid items-center gap-8 lg:grid-cols-[1fr_560px]">
            <div>
              <p className="text-2xl font-bold text-amber-200">Meedoen met de sessie</p>
              <h2 className="mt-5 max-w-4xl text-6xl font-black leading-tight md:text-8xl">
                Scan de QR-code
              </h2>
              <p className="mt-6 max-w-3xl text-2xl font-semibold leading-9 text-zinc-200">
                Of ga naar de deelnemerslink en gebruik code{" "}
                <span className="font-mono text-amber-200">{session.presentation.code}</span>.
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

  if (session.screenView === "results") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
          <header className="flex flex-col gap-4 border-b border-zinc-700 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-300">Coach Staf Bijeenkomst</p>
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
                    {resultsQuestion.answerCount} antwoorden verzameld
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
        {activeQuestion ? (
          <header className="border-b border-zinc-700 pb-5">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-300">Coach Staf Bijeenkomst</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{session.presentation.title}</h1>
            </div>
          </header>
        ) : null}

        {!activeQuestion ? (
          <section className="grid flex-1 place-items-center text-center">
            <h2 className="max-w-5xl text-6xl font-black leading-tight text-white md:text-8xl">
              Coach Staf Bijeenkomst
            </h2>
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-6">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-7 md:p-9">
              <div className="mx-auto max-w-6xl">
                <span className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black uppercase text-emerald-950">
                  {activeQuestion.type === "open" ? "Open antwoord" : "Multiple choice"}
                </span>
                <h2 className="mt-5 text-5xl font-black leading-tight md:text-7xl">{activeQuestion.prompt}</h2>
              </div>
            </div>
            <ResponsePulse count={activeQuestion.answerCount} questionType={activeQuestion.type} />
          </section>
        )}
      </div>
    </main>
  );
}
