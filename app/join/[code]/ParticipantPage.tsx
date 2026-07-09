"use client";

import { CheckCircle2, Loader2, Send, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicSessionPayload, QuestionType } from "@/app/types";

type ParticipantPageProps = {
  code: string;
};

function createParticipantId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function questionTypeLabel(type: QuestionType) {
  if (type === "quiz") {
    return "Quizvraag";
  }

  return type === "open" ? "Open antwoord" : "Multiple choice";
}

function optionLetter(position: number | null | undefined, fallbackIndex = 0) {
  const index = Math.max((position ?? fallbackIndex + 1) - 1, 0);
  return String.fromCharCode(65 + index);
}

type IdentityMode = "name" | "anonymous";

function readStoredIdentity(storageKey: string): { mode: IdentityMode; displayName: string } {
  if (typeof window === "undefined") {
    return { mode: "name", displayName: "" };
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return { mode: "name", displayName: "" };
    }

    const parsed = JSON.parse(stored) as { mode?: IdentityMode; displayName?: string };
    return {
      mode: parsed.mode === "anonymous" || parsed.mode === "name" ? parsed.mode : "name",
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { mode: "name", displayName: "" };
  }
}

export default function ParticipantPage({ code }: ParticipantPageProps) {
  const normalizedCode = useMemo(() => code.replace(/[^a-z0-9]/gi, "").toUpperCase(), [code]);
  const identityStorageKey = useMemo(
    () => `sessie-interactief-participant-profile-${normalizedCode}`,
    [normalizedCode]
  );
  const storedIdentity = useMemo(() => readStoredIdentity(identityStorageKey), [identityStorageKey]);
  const [session, setSession] = useState<PublicSessionPayload | null>(null);
  const [participantId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const storageKey = `sessie-interactief-participant-id-${normalizedCode}`;
    const storedId = window.localStorage.getItem(storageKey) ?? createParticipantId();
    window.localStorage.setItem(storageKey, storedId);
    return storedId;
  });
  const [identityMode, setIdentityMode] = useState<IdentityMode>(storedIdentity.mode);
  const [displayName, setDisplayName] = useState(storedIdentity.displayName);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const lastActiveQuestionId = useRef("");
  const [submittedQuestionId, setSubmittedQuestionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      try {
        const suffix = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
        const response = await fetch(`/api/session/${normalizedCode}${suffix}`, { cache: "no-store" });
        const data = (await response.json()) as PublicSessionPayload | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Sessie kon niet worden geladen.");
        }

        const activeId = data.activeQuestion?.id ?? "";
        if (activeId && lastActiveQuestionId.current && activeId !== lastActiveQuestionId.current) {
          setSelectedOptionId("");
          setTextAnswer("");
          setSubmittedQuestionId("");
        }
        if (activeId) {
          lastActiveQuestionId.current = activeId;
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
    [normalizedCode, participantId]
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
    }, 1800);

    return () => window.clearInterval(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.activeQuestion || !participantId || !session.participantLabel) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/session/${normalizedCode}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          participantName: session.participantLabel,
          optionId: selectedOptionId,
          textAnswer,
        }),
      });
      const data = (await response.json()) as PublicSessionPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Antwoord kon niet worden verzonden.");
      }
      setSession(data);
      setSubmittedQuestionId(data.activeQuestion?.id ?? session.activeQuestion.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Antwoord kon niet worden verzonden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participantId) {
      setError("Deelnemer kon niet worden herkend. Scan de QR-code opnieuw.");
      return;
    }

    const anonymous = identityMode === "anonymous";
    const name = displayName.trim();
    if (!anonymous && !name) {
      setError("Vul je naam in of kies voor anoniem blijven.");
      return;
    }

    setRegistering(true);
    setError("");

    try {
      const response = await fetch(`/api/session/${normalizedCode}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          displayName: name,
          anonymous,
        }),
      });
      const data = (await response.json()) as PublicSessionPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Deelnemer kon niet worden aangemeld.");
      }

      window.localStorage.setItem(
        identityStorageKey,
        JSON.stringify({
          mode: identityMode,
          displayName: anonymous ? "" : name,
        })
      );
      setSession(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deelnemer kon niet worden aangemeld.");
    } finally {
      setRegistering(false);
    }
  }

  const activeQuestion = session?.activeQuestion ?? null;
  const resultsQuestion = session?.screenView === "results" ? session.screenQuestion : null;
  const participantResult = session?.participantResult ?? null;
  const showQuizFeedback = resultsQuestion?.type === "quiz";
  const participantScore = participantId
    ? session?.leaderboard.find((entry) => entry.participantId === participantId) ?? null
    : null;
  const participantDisplayId =
    session?.participantLabel ?? (participantId ? `ID ${participantId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}` : "");
  const quizResultsLocked = Boolean(
    activeQuestion?.type === "quiz" && resultsQuestion?.id === activeQuestion.id
  );
  const submitted = Boolean(activeQuestion && submittedQuestionId === activeQuestion.id);
  const isChoiceQuestion = activeQuestion?.type === "multiple" || activeQuestion?.type === "quiz";
  const canSubmit =
    !quizResultsLocked && (isChoiceQuestion ? Boolean(selectedOptionId) : Boolean(textAnswer.trim()));
  const submitButtonLabel = quizResultsLocked
    ? "Antwoord gesloten"
    : submitting
      ? "Verzenden..."
      : submitted
        ? "Antwoord bijwerken"
        : "Verzend antwoord";

  if (loading && !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-100">
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          Laden...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-center text-white">
        <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-xl font-black">Sessie niet gevonden</h1>
          <p className="mt-3 text-sm font-semibold text-rose-200">{error || "Controleer de code op het scherm."}</p>
        </div>
      </main>
    );
  }

  if (!session.participantLabel) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-5 text-white">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <header className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase text-emerald-300">Sessie Interactief</p>
            <h1 className="mt-1 text-2xl font-black">{session.presentation.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-sm font-bold text-zinc-300">
                {session.presentation.code}
              </span>
            </div>
          </header>

          {error ? <p className="rounded-lg border border-rose-700 bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p> : null}

          <form className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-sm" onSubmit={registerIdentity}>
            <div className="mb-5">
              <span className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black uppercase text-emerald-950">
                Meedoen
              </span>
              <h2 className="mt-3 text-2xl font-black leading-8">Hoe wil je zichtbaar zijn?</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">
                Je kunt je naam invullen of anoniem deelnemen. Anoniem wordt automatisch Deelnemer 1, 2, enzovoort.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-lg border px-4 py-4 text-left transition ${
                  identityMode === "name"
                    ? "border-emerald-300 bg-emerald-300 text-emerald-950"
                    : "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500 hover:bg-zinc-800"
                }`}
                onClick={() => setIdentityMode("name")}
                type="button"
              >
                <span className="flex items-center gap-3 text-base font-black">
                  <UserRound aria-hidden className="h-5 w-5" />
                  Met mijn naam
                </span>
                <span className="mt-2 block text-sm font-semibold opacity-80">
                  Je naam kan op het grote scherm terugkomen.
                </span>
              </button>
              <button
                className={`rounded-lg border px-4 py-4 text-left transition ${
                  identityMode === "anonymous"
                    ? "border-emerald-300 bg-emerald-300 text-emerald-950"
                    : "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500 hover:bg-zinc-800"
                }`}
                onClick={() => setIdentityMode("anonymous")}
                type="button"
              >
                <span className="flex items-center gap-3 text-base font-black">
                  <ShieldCheck aria-hidden className="h-5 w-5" />
                  Anoniem blijven
                </span>
                <span className="mt-2 block text-sm font-semibold opacity-80">
                  Je krijgt automatisch een deelnemernummer.
                </span>
              </button>
            </div>

            {identityMode === "name" ? (
              <label className="mt-5 block">
                <span className="text-sm font-black uppercase text-zinc-300">Naam</span>
                <input
                  className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-4 text-base font-bold text-white outline-none placeholder:text-zinc-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"
                  maxLength={60}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Vul je naam in"
                  value={displayName}
                />
              </label>
            ) : (
              <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-4 text-sm font-semibold leading-6 text-zinc-300">
                Je blijft anoniem voor de groep. Het platform toont alleen jouw automatische deelnemerlabel.
              </div>
            )}

            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-4 font-bold text-emerald-950 hover:bg-emerald-200 disabled:opacity-60"
              disabled={registering || (identityMode === "name" && !displayName.trim())}
              type="submit"
            >
              {registering ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
              {registering ? "Aanmelden..." : "Ga naar de sessie"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-5 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-sm">
          <p className="text-sm font-semibold uppercase text-emerald-300">Sessie Interactief</p>
          <h1 className="mt-1 text-2xl font-black">{session.presentation.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-sm font-bold text-zinc-300">
              {session.presentation.code}
            </span>
            {participantDisplayId ? (
              <span className="rounded-md bg-emerald-300 px-2 py-1 text-sm font-black text-emerald-950">
                {participantDisplayId}
              </span>
            ) : null}
            {session.quizTotals.finalized ? (
              <span className="rounded-md bg-amber-300 px-2 py-1 text-sm font-black text-amber-950">
                Score {participantScore?.score ?? 0}/{session.quizTotals.finalized}
              </span>
            ) : null}
          </div>
        </header>

        {error ? <p className="rounded-lg border border-rose-700 bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p> : null}

        {showQuizFeedback ? (
          <section
            className={`rounded-lg border p-5 shadow-sm ${
              participantResult?.isCorrect
                ? "border-emerald-500 bg-emerald-950 text-emerald-50"
                : "border-amber-500 bg-amber-950 text-amber-50"
            }`}
          >
            {participantResult ? (
              <>
                <div className="flex items-center gap-2 text-lg font-black">
                  {participantResult.isCorrect ? (
                    <CheckCircle2 aria-hidden className="h-6 w-6" />
                  ) : (
                    <XCircle aria-hidden className="h-6 w-6" />
                  )}
                  {participantResult.isCorrect ? "Goed beantwoord" : "Helaas, fout beantwoord"}
                </div>
                <p className="mt-3 text-sm font-bold leading-6">
                  Jouw antwoord:{" "}
                  <span className="font-black">
                    {participantResult.optionPosition
                      ? `${optionLetter(participantResult.optionPosition)}. `
                      : ""}
                    {participantResult.optionLabel}
                  </span>
                </p>
                {!participantResult.isCorrect && participantResult.correctOptionLabel ? (
                  <p className="mt-1 text-sm font-bold leading-6">
                    Juiste antwoord:{" "}
                    <span className="font-black">
                      {participantResult.correctOptionPosition
                        ? `${optionLetter(participantResult.correctOptionPosition)}. `
                        : ""}
                      {participantResult.correctOptionLabel}
                    </span>
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-lg font-black">
                  <XCircle aria-hidden className="h-6 w-6" />
                  Geen antwoord gevonden
                </div>
                <p className="mt-3 text-sm font-bold leading-6">
                  De quizresultaten staan live, maar op deze telefoon is geen ingezonden antwoord voor deze vraag gevonden.
                </p>
              </>
            )}
          </section>
        ) : null}

        {!activeQuestion ? (
          <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-center shadow-sm">
            <h2 className="text-2xl font-black">Wachten op de volgende vraag</h2>
            <p className="mt-3 text-zinc-300">Je scherm werkt automatisch bij zodra de presentator een vraag opent.</p>
          </section>
        ) : (
          <form className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-sm" onSubmit={submit}>
            <div className="mb-5">
              <span className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black uppercase text-emerald-950">
                {questionTypeLabel(activeQuestion.type)}
              </span>
              <h2 className="mt-3 text-2xl font-black leading-9">{activeQuestion.prompt}</h2>
            </div>

            {isChoiceQuestion ? (
              <div className="grid gap-3">
                {activeQuestion.options.map((option, index) => (
                  <button
                    className={`rounded-lg border px-4 py-4 text-left text-base font-bold transition disabled:cursor-not-allowed ${
                      selectedOptionId === option.id
                        ? "border-emerald-300 bg-emerald-300 text-emerald-950"
                        : quizResultsLocked
                          ? "border-zinc-700 bg-zinc-950 text-zinc-400"
                          : "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500 hover:bg-zinc-800"
                    }`}
                    disabled={quizResultsLocked}
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    type="button"
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-black ${
                          selectedOptionId === option.id ? "bg-emerald-950 text-emerald-100" : "bg-zinc-800 text-zinc-100"
                        }`}
                      >
                        {optionLetter(option.position, index)}
                      </span>
                      <span>{option.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="mt-5 min-h-36 w-full resize-y rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"
                maxLength={280}
                onChange={(event) => setTextAnswer(event.target.value)}
                placeholder="Typ je antwoord"
                value={textAnswer}
              />
            )}

            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-4 font-bold text-emerald-950 hover:bg-emerald-200 disabled:opacity-60"
              disabled={!canSubmit || submitting}
              type="submit"
            >
              {quizResultsLocked ? (
                <XCircle aria-hidden className="h-5 w-5" />
              ) : submitted ? (
                <CheckCircle2 aria-hidden className="h-5 w-5" />
              ) : (
                <Send aria-hidden className="h-5 w-5" />
              )}
              {submitButtonLabel}
            </button>

            {quizResultsLocked ? (
              <p className="mt-3 rounded-lg border border-amber-700 bg-amber-950 px-4 py-3 text-sm font-semibold leading-6 text-amber-100">
                De quizresultaten staan live. Je antwoord kan nu niet meer worden aangepast.
              </p>
            ) : null}
          </form>
        )}

        {submitted && activeQuestion ? (
          <section className="rounded-lg border border-emerald-700 bg-emerald-950 p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-emerald-100">
              <CheckCircle2 aria-hidden className="h-5 w-5" />
              Antwoord ontvangen
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-emerald-50">
              Je antwoord is opgeslagen. De presentator bepaalt wanneer de resultaten zichtbaar worden.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
