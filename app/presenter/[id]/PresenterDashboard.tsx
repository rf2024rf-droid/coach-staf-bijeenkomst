"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Copy,
  KeyRound,
  Monitor,
  Pencil,
  Play,
  Plus,
  QrCode as QrCodeIcon,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode } from "@/app/components/QrCode";
import { ResultView } from "@/app/components/ResultView";
import type { PresenterPayload, QuestionResult, QuestionType, ScreenView } from "@/app/types";

type PresenterDashboardProps = {
  id: string;
};

type OptionDraft = {
  id: string;
  label: string;
  isCorrect: boolean;
};

type QuestionForm = {
  type: QuestionType;
  prompt: string;
  options: string;
  quizOptions: OptionDraft[];
};

type QuestionEditForm = {
  prompt: string;
  options: string;
  quizOptions: OptionDraft[];
};

function makeOptionDraft(label = "", isCorrect = false): OptionDraft {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    label,
    isCorrect,
  };
}

function defaultQuizOptions() {
  return [makeOptionDraft("", true), makeOptionDraft("")];
}

function createDefaultQuestionForm(): QuestionForm {
  return {
    type: "open",
    prompt: "",
    options: "Ja\nNee\nMisschien",
    quizOptions: defaultQuizOptions(),
  };
}

function questionTypeLabel(type: QuestionType) {
  if (type === "quiz") {
    return "Quizvraag";
  }

  return type === "open" ? "Open antwoord" : "Multiple choice";
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeOptionDrafts(options: OptionDraft[]) {
  if (options.some((option) => option.isCorrect)) {
    return options;
  }

  return options.map((option, index) => ({ ...option, isCorrect: index === 0 }));
}

function QuizOptionsEditor({
  options,
  onChange,
}: {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
}) {
  function updateOption(id: string, label: string) {
    onChange(options.map((option) => (option.id === id ? { ...option, label } : option)));
  }

  function markCorrect(id: string) {
    onChange(options.map((option) => ({ ...option, isCorrect: option.id === id })));
  }

  function addOption() {
    onChange([...options, makeOptionDraft()]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) {
      return;
    }

    onChange(normalizeOptionDrafts(options.filter((option) => option.id !== id)));
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-zinc-700">Antwoordmogelijkheden</span>
      </div>
      <div className="grid gap-2">
        {options.map((option, index) => (
          <div className="grid gap-2 rounded-lg bg-white p-2 sm:grid-cols-[1fr_auto_auto]" key={option.id}>
            <label className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-900 text-sm font-black text-white">
                {optionLetter(index)}
              </span>
              <input
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                maxLength={90}
                onChange={(event) => updateOption(option.id, event.target.value)}
                placeholder={`Antwoord ${index + 1}`}
                value={option.label}
              />
            </label>
            <button
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                option.isCorrect
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
              onClick={() => markCorrect(option.id)}
              type="button"
            >
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              Juist
            </button>
            <button
              aria-label="Verwijder antwoordoptie"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
              disabled={options.length <= 2}
              onClick={() => removeOption(option.id)}
              type="button"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-400 bg-white px-3 py-3 text-sm font-bold text-zinc-800 hover:border-zinc-700 hover:bg-zinc-50"
          onClick={addOption}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Optie toevoegen
        </button>
      </div>
    </div>
  );
}

function screenViewLabel(screenView: ScreenView) {
  if (screenView === "qr") {
    return "QR-code";
  }

  if (screenView === "results") {
    return "resultaten";
  }

  if (screenView === "ranking") {
    return "stand";
  }

  return "live vraag";
}

export default function PresenterDashboard({ id }: PresenterDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKey = searchParams.get("key") ?? "";
  const [key, setKey] = useState(initialKey);
  const [keyInput, setKeyInput] = useState(initialKey);
  const [payload, setPayload] = useState<PresenterPayload | null>(null);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [form, setForm] = useState<QuestionForm>(() => createDefaultQuestionForm());
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [editForm, setEditForm] = useState<QuestionEditForm>(() => ({
    prompt: "",
    options: "",
    quizOptions: defaultQuizOptions(),
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const joinLink = useMemo(() => {
    if (!origin || !payload) {
      return "";
    }
    return `${origin}/join/${payload.presentation.code}`;
  }, [origin, payload]);

  const screenLink = useMemo(() => {
    if (!origin || !payload) {
      return "";
    }
    return `${origin}/screen/${payload.presentation.code}`;
  }, [origin, payload]);

  const apiPath = useCallback(
    (path: string, params: Record<string, string | null | undefined> = {}) => {
      const search = new URLSearchParams();

      if (key) {
        search.set("key", key);
      }

      for (const [name, value] of Object.entries(params)) {
        if (value) {
          search.set(name, value);
        }
      }

      const query = search.toString();
      return query ? `${path}?${query}` : path;
    },
    [key]
  );

  const load = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(apiPath(`/api/presentations/${id}`), {
          cache: "no-store",
        });
        const data = (await response.json()) as PresenterPayload | { error: string };

        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Dashboard kon niet worden geladen.");
        }

        setPayload(data);
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Dashboard kon niet worden geladen.");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [apiPath, id]
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
    }, 2000);

    return () => window.clearInterval(timer);
  }, [load]);

  function applyKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextKey = keyInput.trim();
    setKey(nextKey);
    router.replace(nextKey ? `/presenter/${id}?key=${encodeURIComponent(nextKey)}` : `/presenter/${id}`);
  }

  async function copy(value: string, label: string) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setNotice(`${label} gekopieerd`);
    window.setTimeout(() => setNotice(""), 1800);
  }

  async function mutate(
    action: () => Promise<PresenterPayload>,
    successMessage: string
  ) {
    setSaving(true);
    setError("");

    try {
      const next = await action();
      setPayload(next);
      setNotice(successMessage);
      window.setTimeout(() => setNotice(""), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Actie kon niet worden uitgevoerd.");
    } finally {
      setSaving(false);
    }
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options =
      form.type === "quiz"
        ? form.quizOptions.map((option) => ({ label: option.label, isCorrect: option.isCorrect }))
        : form.options
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean);

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/questions`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          prompt: form.prompt,
          options,
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet worden opgeslagen.");
      }
      return data;
    }, "Vraag toegevoegd");

    setForm(createDefaultQuestionForm());
  }

  function startEditing(question: QuestionResult) {
    setEditingQuestionId(question.id);
    setEditForm({
      prompt: question.prompt,
      options: question.options.map((option) => option.label).join("\n"),
      quizOptions:
        question.type === "quiz"
          ? question.options.map((option) => ({
              id: option.id,
              label: option.label,
              isCorrect: option.isCorrect,
            }))
          : defaultQuizOptions(),
    });
  }

  async function saveQuestionEdit(question: QuestionResult) {
    const options =
      question.type === "quiz"
        ? editForm.quizOptions.map((option) => ({ label: option.label, isCorrect: option.isCorrect }))
        : editForm.options
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean);

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/questions`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update",
          questionId: question.id,
          prompt: editForm.prompt,
          options,
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet worden bijgewerkt.");
      }
      return data;
    }, "Vraag bijgewerkt");

    setEditingQuestionId("");
    setEditForm({ prompt: "", options: "", quizOptions: defaultQuizOptions() });
  }

  async function moveQuestion(questionId: string, direction: "up" | "down") {
    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/questions`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "move",
          questionId,
          direction,
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet worden verplaatst.");
      }
      return data;
    }, "Volgorde aangepast");
  }

  async function activate(questionId: string | null) {
    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/active`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet live worden gezet.");
      }
      return data;
    }, questionId ? "Vraag staat live" : "Alle vragen gesloten");
  }

  async function updateScreenView(screenView: ScreenView, questionId: string | null = null) {
    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/screen-view`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screenView, questionId }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Groot scherm kon niet worden aangepast.");
      }
      return data;
    },
    screenView === "qr"
      ? "QR-code staat groot op het scherm"
      : screenView === "ranking"
        ? "Stand staat op het grote scherm"
      : screenView === "results"
        ? "Resultaten staan groot op het scherm"
        : "Groot scherm toont de live vraag");
  }

  async function saveIdleScreenText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const idleScreenText = String(formData.get("idleScreenText") ?? "");

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idleScreenText }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Schermtekst kon niet worden opgeslagen.");
      }
      return data;
    }, "Schermtekst opgeslagen");
  }

  async function toggleResults(questionId: string) {
    const isShowingThisQuestion =
      payload?.presentation.screenView === "results" &&
      payload.presentation.screenQuestionId === questionId;

    await updateScreenView(isShowingThisQuestion ? "question" : "results", isShowingThisQuestion ? null : questionId);
  }

  async function toggleRanking() {
    await updateScreenView(payload?.presentation.screenView === "ranking" ? "question" : "ranking");
  }

  async function reset(questionId: string | null) {
    const scopeLabel = questionId ? "de antwoorden van deze vraag" : "alle antwoorden in deze presentatie";
    const firstConfirmed = window.confirm(`Weet je zeker dat je ${scopeLabel} wilt resetten?`);
    if (!firstConfirmed) {
      return;
    }

    const finalConfirmed = window.confirm(
      `Laatste bevestiging: ${scopeLabel} worden definitief verwijderd. Dit kun je niet ongedaan maken.`
    );
    if (!finalConfirmed) {
      return;
    }

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/answers`, { questionId }), {
        method: "DELETE",
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Antwoorden konden niet worden gewist.");
      }
      return data;
    }, questionId ? "Antwoorden bij vraag gewist" : "Alle antwoorden gewist");
  }

  async function removeQuestion(questionId: string, prompt: string) {
    const confirmed = window.confirm(`Vraag verwijderen?\n\n${prompt}`);
    if (!confirmed) {
      return;
    }

    await mutate(async () => {
      const response = await fetch(
        apiPath(`/api/presentations/${id}/questions`, { questionId }),
        { method: "DELETE" }
      );
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet worden verwijderd.");
      }
      return data;
    }, "Vraag verwijderd");
  }

  if (!loading && !payload && (!key || error.includes("Beheersleutel") || error.includes("Log eerst in"))) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5">
        <form className="w-full max-w-md rounded-lg border border-zinc-300 bg-white p-6 shadow-sm" onSubmit={applyKey}>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-700 text-white">
              <KeyRound aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Presentator login</h1>
              <p className="text-sm text-zinc-600">Voer de beheersleutel van deze presentatie in.</p>
            </div>
          </div>
          <input
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Beheersleutel"
            value={keyInput}
          />
          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-3 font-bold text-white" type="submit">
            <KeyRound aria-hidden className="h-5 w-5" />
            Open dashboard
          </button>
          <a
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold text-zinc-800 hover:bg-zinc-50"
            href="/moderator"
          >
            <ArrowLeft aria-hidden className="h-5 w-5" />
            Naar gebruikersomgeving
          </a>
          <a
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold text-zinc-800 hover:bg-zinc-50"
            href="/beheerder"
          >
            <ArrowLeft aria-hidden className="h-5 w-5" />
            Naar beheerderomgeving
          </a>
        </form>
      </main>
    );
  }

  if (loading && !payload) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f5f0] text-zinc-700">Dashboard laden...</main>;
  }

  if (!payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0] px-5 text-center">
        <div className="max-w-md rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">Dashboard niet beschikbaar</h1>
          <p className="mt-3 text-sm text-rose-800">{error || "Controleer de link of beheersleutel."}</p>
        </div>
      </main>
    );
  }

  const activeQuestion = payload.activeQuestion;
  const activeQuestionIndex = activeQuestion
    ? payload.questions.findIndex((question) => question.id === activeQuestion.id)
    : -1;
  const previousQuestion = activeQuestionIndex > 0 ? payload.questions[activeQuestionIndex - 1] : null;
  const nextQuestion =
    activeQuestionIndex >= 0 && activeQuestionIndex < payload.questions.length - 1
      ? payload.questions[activeQuestionIndex + 1]
      : null;
  const activeResultsVisible = Boolean(
    activeQuestion &&
      payload.presentation.screenView === "results" &&
      payload.presentation.screenQuestionId === activeQuestion.id
  );
  const rankingLabel =
    payload.quizTotals.total > 0 && payload.quizTotals.finalized >= payload.quizTotals.total
      ? "Eindklassering"
      : "Tussenstand";

  return (
    <main className={`min-h-screen bg-[#f5f5f0] text-zinc-950 ${activeQuestion ? "pb-72 md:pb-36" : ""}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-800">Sessie Interactief</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">{payload.presentation.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-zinc-900 px-3 py-2 font-mono text-lg font-black text-white">
                {payload.presentation.code}
              </span>
              <span className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
                {payload.activeQuestion ? "Live vraag open" : "Geen vraag live"}
              </span>
              <span className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
                Groot scherm: {screenViewLabel(payload.presentation.screenView)}
              </span>
              <span className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-600">
                Vragen <strong className="font-black text-zinc-900">{payload.totals.questions}</strong>
              </span>
              <span className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-600">
                Antwoorden <strong className="font-black text-zinc-900">{payload.totals.answers}</strong>
              </span>
              <span className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-600">
                Deelnemers <strong className="font-black text-zinc-900">{payload.totals.participants}</strong>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              href="/moderator"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Gebruikersomgeving
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              href="/beheerder"
            >
              Beheerder
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              onClick={() => copy(joinLink, "Deelnemerslink")}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              Link
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              onClick={() => copy(payload.presentation.code, "Sessiecode")}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              Code
            </button>
            <a
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700"
              href={screenLink}
              rel="noreferrer"
              target="_blank"
            >
              <Monitor aria-hidden className="h-4 w-4" />
              Groot scherm
            </a>
          </div>
        </header>

        {notice || error ? (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {error || notice}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-6">
            <article className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-lg font-bold">Groot scherm bediening</h2>
              <p className="mb-4 text-sm text-zinc-600">
                Open deze vaste URL op de laptop bij de beamer en stuur de inhoud vanaf hier.
              </p>
              <div className="mb-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                <span className="block font-semibold">Scherm-URL</span>
                <span className="block break-all font-mono text-xs">{screenLink}</span>
              </div>
              <form className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3" onSubmit={saveIdleScreenText}>
                <label className="block text-sm font-semibold text-zinc-700" htmlFor="idle-screen-text">
                  Tekst op leeg scherm
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    defaultValue={payload.presentation.idleScreenText}
                    id="idle-screen-text"
                    key={payload.presentation.idleScreenText}
                    maxLength={90}
                    name="idleScreenText"
                  />
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                    disabled={saving}
                    type="submit"
                  >
                    <Save aria-hidden className="h-4 w-4" />
                    Opslaan
                  </button>
                </div>
              </form>
              <div className="grid gap-2">
                <button
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold transition disabled:opacity-60 ${
                    payload.presentation.screenView === "question"
                      ? "bg-zinc-900 text-white hover:bg-zinc-700"
                      : "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                  }`}
                  disabled={saving}
                  onClick={() => updateScreenView("question")}
                  type="button"
                >
                  <Monitor aria-hidden className="h-5 w-5" />
                  Toon live vraag
                </button>
                <button
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold transition disabled:opacity-60 ${
                    payload.presentation.screenView === "qr"
                      ? "bg-zinc-900 text-white hover:bg-zinc-700"
                      : "bg-emerald-800 text-white hover:bg-emerald-900"
                  }`}
                  disabled={saving}
                  onClick={() => updateScreenView("qr")}
                  type="button"
                >
                  <QrCodeIcon aria-hidden className="h-5 w-5" />
                  Toon QR groot
                </button>
                <button
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold transition disabled:opacity-60 ${
                    payload.presentation.screenView === "ranking"
                      ? "bg-zinc-900 text-white hover:bg-zinc-700"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
                  disabled={saving || !payload.quizTotals.finalized}
                  onClick={toggleRanking}
                  type="button"
                >
                  <Trophy aria-hidden className="h-5 w-5" />
                  {payload.presentation.screenView === "ranking" ? "Sluit stand" : rankingLabel}
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                  onClick={() => copy(screenLink, "Groot-scherm-URL")}
                  type="button"
                >
                  <Copy aria-hidden className="h-5 w-5" />
                  Kopieer scherm-URL
                </button>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">QR voor deelnemers</h2>
              <QrCode label={joinLink || payload.presentation.code} value={joinLink || payload.presentation.code} />
              <div className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 font-mono text-lg font-black">
                {payload.presentation.code}
              </div>
            </article>

            <form className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm" onSubmit={createQuestion}>
              <h2 className="mb-4 text-lg font-bold">Vraag toevoegen</h2>
              <label className="block text-sm font-semibold text-zinc-700" htmlFor="question-type">
                Type
              </label>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="question-type"
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as QuestionType }))}
                value={form.type}
              >
                <option value="open">Open antwoord</option>
                <option value="multiple">Multiple choice</option>
                <option value="quiz">Quizvraag</option>
              </select>

              <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="question-prompt">
                Vraag
              </label>
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                id="question-prompt"
                maxLength={180}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                placeholder="Typ je vraag"
                value={form.prompt}
              />

              {form.type === "multiple" ? (
                <>
                  <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="question-options">
                    Opties
                  </label>
                  <textarea
                    className="mt-2 min-h-28 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="question-options"
                    onChange={(event) => setForm((current) => ({ ...current, options: event.target.value }))}
                    value={form.options}
                  />
                </>
              ) : null}

              {form.type === "quiz" ? (
                <QuizOptionsEditor
                  onChange={(quizOptions) => setForm((current) => ({ ...current, quizOptions }))}
                  options={form.quizOptions}
                />
              ) : null}

              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Plus aria-hidden className="h-5 w-5" />
                Voeg vraag toe
              </button>
            </form>
          </aside>

          <section className="flex flex-col gap-6">
            <article className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-800">Bediening</p>
                  <h2 className="mt-1 text-xl font-black">Presentatieflow</h2>
                  <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                    Zet vragen live, wijzig de volgorde en beheer vragen. De antwoorden staan bewust in het blok hieronder.
                  </p>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                  disabled={saving || !payload.totals.answers}
                  onClick={() => reset(null)}
                  type="button"
                >
                  <RotateCcw aria-hidden className="h-4 w-4" />
                  Reset alle antwoorden
                </button>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-black uppercase text-zinc-600">Vragen en acties</span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-zinc-600">
                    {payload.questions.length} vragen
                  </span>
                </div>
                <div className="grid gap-3">
                  {payload.questions.map((question, index) => (
                    <div
                      className={`rounded-lg border p-4 shadow-sm ${
                        question.id === payload.presentation.activeQuestionId
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                          : "border-zinc-200 bg-white"
                      }`}
                      key={question.id}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-white px-2 py-1 text-xs font-bold uppercase text-zinc-600">
                              {questionTypeLabel(question.type)}
                            </span>
                            {question.id === payload.presentation.activeQuestionId ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-2 py-1 text-xs font-black uppercase text-white">
                                <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                                Nu live
                              </span>
                            ) : null}
                            {question.type === "quiz" && question.finalized ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-900">
                                <Trophy aria-hidden className="h-3.5 w-3.5" />
                                Afgesloten
                              </span>
                            ) : null}
                          </div>
                          <h3 className="font-bold">{question.prompt}</h3>
                          <p className="mt-1 text-sm text-zinc-600">{question.answerCount} antwoorden</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-black uppercase text-zinc-500">Acties</span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              aria-label="Vraag omhoog"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-40"
                              disabled={saving || index === 0}
                              onClick={() => moveQuestion(question.id, "up")}
                              type="button"
                            >
                              <ArrowUp aria-hidden className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Vraag omlaag"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-40"
                              disabled={saving || index === payload.questions.length - 1}
                              onClick={() => moveQuestion(question.id, "down")}
                              type="button"
                            >
                              <ArrowDown aria-hidden className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-60"
                              disabled={saving}
                              onClick={() => startEditing(question)}
                              type="button"
                            >
                              <Pencil aria-hidden className="h-4 w-4" />
                              Bewerk
                            </button>
                            <button
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60 ${
                                payload.presentation.screenView === "results" &&
                                payload.presentation.screenQuestionId === question.id
                                  ? "bg-zinc-900 text-white hover:bg-zinc-700"
                                  : "bg-sky-800 text-white hover:bg-sky-900"
                              }`}
                              disabled={saving}
                              onClick={() => toggleResults(question.id)}
                              type="button"
                            >
                              <BarChart3 aria-hidden className="h-4 w-4" />
                              {payload.presentation.screenView === "results" &&
                              payload.presentation.screenQuestionId === question.id
                                ? "Sluit resultaten"
                                : "Resultaten"}
                            </button>
                            <button
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                                question.id === payload.presentation.activeQuestionId
                                  ? "bg-amber-700 hover:bg-amber-800"
                                  : "bg-emerald-800 hover:bg-emerald-900"
                              }`}
                              disabled={saving || question.finalized}
                              onClick={() =>
                                activate(question.id === payload.presentation.activeQuestionId ? null : question.id)
                              }
                              type="button"
                            >
                              {question.id === payload.presentation.activeQuestionId ? (
                                <Square aria-hidden className="h-4 w-4" />
                              ) : (
                                <Play aria-hidden className="h-4 w-4" />
                              )}
                              {question.finalized
                                ? "Afgesloten"
                                : question.id === payload.presentation.activeQuestionId
                                  ? "Stop live"
                                  : "Live"}
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100 disabled:opacity-60"
                              disabled={saving || !question.answerCount}
                              onClick={() => reset(question.id)}
                              type="button"
                            >
                              <RotateCcw aria-hidden className="h-4 w-4" />
                              Reset
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                              disabled={saving}
                              onClick={() => removeQuestion(question.id, question.prompt)}
                              type="button"
                            >
                              <Trash2 aria-hidden className="h-4 w-4" />
                              Verwijder
                            </button>
                          </div>
                        </div>
                      </div>
                    {editingQuestionId === question.id ? (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4">
                        <label className="block text-sm font-semibold text-zinc-700" htmlFor={`edit-prompt-${question.id}`}>
                          Vraagtekst
                        </label>
                        <textarea
                          className="mt-2 min-h-24 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                          id={`edit-prompt-${question.id}`}
                          maxLength={180}
                          onChange={(event) => setEditForm((current) => ({ ...current, prompt: event.target.value }))}
                          value={editForm.prompt}
                        />

                        {question.type === "multiple" ? (
                          <>
                            <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor={`edit-options-${question.id}`}>
                              Opties
                            </label>
                            <textarea
                              className="mt-2 min-h-28 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                              id={`edit-options-${question.id}`}
                              onChange={(event) => setEditForm((current) => ({ ...current, options: event.target.value }))}
                              value={editForm.options}
                            />
                          </>
                        ) : null}

                        {question.type === "quiz" ? (
                          <QuizOptionsEditor
                            onChange={(quizOptions) => setEditForm((current) => ({ ...current, quizOptions }))}
                            options={editForm.quizOptions}
                          />
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                            disabled={saving}
                            onClick={() => saveQuestionEdit(question)}
                            type="button"
                          >
                            <Save aria-hidden className="h-4 w-4" />
                            Opslaan
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                            onClick={() => {
                              setEditingQuestionId("");
                              setEditForm({ prompt: "", options: "", quizOptions: defaultQuizOptions() });
                            }}
                            type="button"
                          >
                            <X aria-hidden className="h-4 w-4" />
                            Annuleer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                </div>
              </div>
            </article>

            <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
              <div className="mb-5 border-b border-zinc-200 pb-4">
                <p className="text-xs font-black uppercase text-sky-800">Overzicht</p>
                <h2 className="mt-1 text-xl font-black">Vragen en antwoorden</h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                  Hier bekijk je rustig alle binnengekomen antwoorden, zonder beheerknoppen ertussen.
                </p>
              </div>
              <div className="grid gap-4">
                {payload.questions.map((question) => (
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={question.id}>
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-emerald-800">
                          Vraag {question.position} · {questionTypeLabel(question.type)}
                        </p>
                        <h3 className="text-lg font-bold">{question.prompt}</h3>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-zinc-700">
                        {question.answerCount} antwoorden
                      </span>
                    </div>
                    <ResultView question={question} />
                  </article>
                ))}
              </div>
            </section>
          </section>
        </section>
      </div>

      {activeQuestion ? (
        <section
          aria-label="Live commandocentrum"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-6xl rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white shadow-2xl shadow-zinc-950/30 md:bottom-4 md:p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-300 text-emerald-950">
                <Play aria-hidden className="h-6 w-6 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />
                  Nu live
                </p>
                <h2 className="truncate text-base font-black leading-6 md:text-lg">{activeQuestion.prompt}</h2>
                <p className="mt-0.5 text-xs font-semibold text-zinc-400 md:text-sm">
                  {activeQuestion.answerCount} antwoorden · groot scherm:{" "}
                  {screenViewLabel(payload.presentation.screenView)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex lg:shrink-0">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40"
                disabled={saving || !previousQuestion}
                onClick={() => previousQuestion && activate(previousQuestion.id)}
                type="button"
              >
                <ArrowUp aria-hidden className="h-4 w-4" />
                Vorige
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40"
                disabled={saving || !nextQuestion}
                onClick={() => nextQuestion && activate(nextQuestion.id)}
                type="button"
              >
                <ArrowDown aria-hidden className="h-4 w-4" />
                Volgende
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-60 ${
                  activeResultsVisible
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-sky-700 text-white hover:bg-sky-800"
                }`}
                disabled={saving}
                onClick={() => toggleResults(activeQuestion.id)}
                type="button"
              >
                <BarChart3 aria-hidden className="h-4 w-4" />
                {activeResultsVisible ? "Sluit resultaten" : "Resultaten"}
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-60 ${
                  payload.presentation.screenView === "ranking"
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
                disabled={saving || !payload.quizTotals.finalized}
                onClick={toggleRanking}
                type="button"
              >
                <Trophy aria-hidden className="h-4 w-4" />
                Stand
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-3 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60"
                disabled={saving}
                onClick={() => activate(null)}
                type="button"
              >
                <Square aria-hidden className="h-4 w-4" />
                Stop live
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
