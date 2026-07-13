"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Copy,
  KeyRound,
  ListChecks,
  Monitor,
  Palette,
  Pencil,
  Play,
  Plus,
  QrCode as QrCodeIcon,
  RotateCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Square,
  Trash2,
  Trophy,
  Timer,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode } from "@/app/components/QrCode";
import { ResultView } from "@/app/components/ResultView";
import type { PresenterPayload, QuestionResult, QuestionType, ScreenView } from "@/app/types";
import {
  DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR,
  DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
  DEFAULT_GENERAL_SCREEN_FONT_SIZE,
  GENERAL_SCREEN_FONT_OPTIONS,
  MAX_GENERAL_SCREEN_FONT_SIZE,
  MIN_GENERAL_SCREEN_FONT_SIZE,
  getGeneralScreenFontOption,
  getGeneralScreenPalette,
  normalizeGeneralScreenBackgroundColor,
  normalizeGeneralScreenFontFamily,
  normalizeGeneralScreenFontSize,
  normalizeHexColor,
  resolveGeneralScreenFontFamily,
  resolveGeneralScreenFontSize,
} from "@/lib/generalScreenAppearance";
import { getQuestionTimingState } from "@/lib/questionTiming";

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
  timeLimitSeconds: string;
};

type QuestionEditForm = {
  prompt: string;
  options: string;
  quizOptions: OptionDraft[];
  timeLimitSeconds: string;
};

type PresenterTab = "regie" | "deelnemers" | "vragen" | "resultaten" | "instellingen";

function makeOptionDraft(label = "", isCorrect = false): OptionDraft {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    label,
    isCorrect,
  };
}

function defaultQuizOptions() {
  return [makeOptionDraft(), makeOptionDraft()];
}

function createDefaultQuestionForm(): QuestionForm {
  return {
    type: "open",
    prompt: "",
    options: "",
    quizOptions: defaultQuizOptions(),
    timeLimitSeconds: "",
  };
}

function questionTypeLabel(type: QuestionType) {
  if (type === "slide") {
    return "Slide";
  }

  if (type === "quiz") {
    return "Quizvraag";
  }

  return type === "open" ? "Open antwoord" : "Multiple choice";
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeOptionDrafts(options: OptionDraft[]) {
  return options;
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
                placeholder={`Antwoord ${optionLetter(index)}`}
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

function formatTimerSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatShortDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [presenterTab, setPresenterTab] = useState<PresenterTab>("regie");
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [editForm, setEditForm] = useState<QuestionEditForm>(() => ({
    prompt: "",
    options: "",
    quizOptions: defaultQuizOptions(),
    timeLimitSeconds: "",
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [generalBackgroundDraft, setGeneralBackgroundDraft] = useState(DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR);
  const [generalBackgroundDirty, setGeneralBackgroundDirty] = useState(false);
  const [generalBackgroundSaving, setGeneralBackgroundSaving] = useState(false);
  const [generalBackgroundError, setGeneralBackgroundError] = useState("");
  const [generalTypographyDraft, setGeneralTypographyDraft] = useState({
    fontFamily: DEFAULT_GENERAL_SCREEN_FONT_FAMILY,
    fontSize: String(DEFAULT_GENERAL_SCREEN_FONT_SIZE),
  });
  const [generalTypographyDirty, setGeneralTypographyDirty] = useState(false);
  const [generalTypographySaving, setGeneralTypographySaving] = useState(false);
  const [generalTypographyError, setGeneralTypographyError] = useState("");
  const persistedGeneralScreenBackgroundColor = payload?.presentation.generalScreenBackgroundColor ?? null;
  const persistedGeneralScreenFontFamily = payload?.presentation.generalScreenFontFamily ?? null;
  const persistedGeneralScreenFontSize = payload?.presentation.generalScreenFontSize ?? null;
  const loadedPresentationId = payload?.presentation.id ?? "";

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

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loadedPresentationId || !generalBackgroundDirty) {
      return;
    }

    const normalized = normalizeHexColor(generalBackgroundDraft);
    if (!normalized) {
      return;
    }

    const nextStoredColor = normalizeGeneralScreenBackgroundColor(normalized);
    if (nextStoredColor === persistedGeneralScreenBackgroundColor) {
      const timer = window.setTimeout(() => setGeneralBackgroundDirty(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      setGeneralBackgroundSaving(true);
      setGeneralBackgroundError("");

      try {
        const response = await fetch(apiPath(`/api/presentations/${id}`), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ generalScreenBackgroundColor: nextStoredColor }),
        });
        const data = (await response.json()) as PresenterPayload | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Achtergrondkleur kon niet worden opgeslagen.");
        }

        setPayload(data);
        setGeneralBackgroundDirty(false);
      } catch (caught) {
        setGeneralBackgroundError(
          caught instanceof Error ? caught.message : "Achtergrondkleur kon niet worden opgeslagen."
        );
      } finally {
        setGeneralBackgroundSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    apiPath,
    generalBackgroundDirty,
    generalBackgroundDraft,
    id,
    loadedPresentationId,
    persistedGeneralScreenBackgroundColor,
  ]);

  useEffect(() => {
    if (!loadedPresentationId || !generalTypographyDirty) {
      return;
    }

    const nextFontFamily = normalizeGeneralScreenFontFamily(generalTypographyDraft.fontFamily);
    const nextFontSize = normalizeGeneralScreenFontSize(generalTypographyDraft.fontSize);

    if (
      nextFontFamily === persistedGeneralScreenFontFamily &&
      nextFontSize === persistedGeneralScreenFontSize
    ) {
      const timer = window.setTimeout(() => setGeneralTypographyDirty(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      setGeneralTypographySaving(true);
      setGeneralTypographyError("");

      try {
        const response = await fetch(apiPath(`/api/presentations/${id}`), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            generalScreenFontFamily: nextFontFamily,
            generalScreenFontSize: nextFontSize,
          }),
        });
        const data = (await response.json()) as PresenterPayload | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Lettertype kon niet worden opgeslagen.");
        }

        setPayload(data);
        setGeneralTypographyDirty(false);
      } catch (caught) {
        setGeneralTypographyError(caught instanceof Error ? caught.message : "Lettertype kon niet worden opgeslagen.");
      } finally {
        setGeneralTypographySaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    apiPath,
    generalTypographyDirty,
    generalTypographyDraft,
    id,
    loadedPresentationId,
    persistedGeneralScreenFontFamily,
    persistedGeneralScreenFontSize,
  ]);

  function updateGeneralBackgroundDraft(value: string) {
    setGeneralBackgroundDraft(value.toUpperCase());
    setGeneralBackgroundDirty(true);
    setGeneralBackgroundError("");
  }

  function restoreDefaultGeneralBackground() {
    setGeneralBackgroundDraft(DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR);
    setGeneralBackgroundDirty(true);
    setGeneralBackgroundError("");
  }

  function updateGeneralTypographyDraft(next: { fontFamily?: string; fontSize?: string }) {
    const currentFontFamily = generalTypographyDirty
      ? generalTypographyDraft.fontFamily
      : persistedGeneralScreenFontFamily ?? DEFAULT_GENERAL_SCREEN_FONT_FAMILY;
    const currentFontSize = generalTypographyDirty
      ? generalTypographyDraft.fontSize
      : String(persistedGeneralScreenFontSize ?? DEFAULT_GENERAL_SCREEN_FONT_SIZE);

    setGeneralTypographyDraft({
      fontFamily: next.fontFamily ?? currentFontFamily,
      fontSize: next.fontSize ?? currentFontSize,
    });
    setGeneralTypographyDirty(true);
    setGeneralTypographyError("");
  }

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
          content: {
            timeLimitSeconds: form.type === "quiz" && form.timeLimitSeconds ? Number(form.timeLimitSeconds) : null,
          },
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
    setPresenterTab("vragen");
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
      timeLimitSeconds:
        typeof question.content.timeLimitSeconds === "number" && question.content.timeLimitSeconds > 0
          ? String(question.content.timeLimitSeconds)
          : "",
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
          content: {
            ...question.content,
            timeLimitSeconds:
              question.type === "quiz" && editForm.timeLimitSeconds ? Number(editForm.timeLimitSeconds) : null,
          },
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Vraag kon niet worden bijgewerkt.");
      }
      return data;
    }, "Vraag bijgewerkt");

    setEditingQuestionId("");
    setEditForm({ prompt: "", options: "", quizOptions: defaultQuizOptions(), timeLimitSeconds: "" });
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

  async function resetFlow() {
    const confirmed = window.confirm(
      "Presentatieflow opnieuw starten?\n\nDit sluit alle live vragen, haalt resultaten van het scherm en zet quizvragen weer open voor de regie. Antwoorden blijven bewaard."
    );
    if (!confirmed) {
      return;
    }

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/flow`), {
        method: "PATCH",
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Presentatieflow kon niet worden gereset.");
      }
      return data;
    }, "Presentatieflow opnieuw gestart");
  }

  async function startParticipantGroup() {
    const alreadyStarted = Boolean(payload?.presentation.participantGroupStartedAt);
    const confirmed = window.confirm(
      alreadyStarted
        ? "Startgroep opnieuw vastleggen?\n\nHet huidige aantal aangemelde deelnemers wordt opnieuw als startgroep opgeslagen. Nieuwe deelnemers daarna blijven gewoon later instromen."
        : "Starten met de huidige groep?\n\nDe huidige aangemelde deelnemers worden als startgroep opgeslagen. Nieuwe deelnemers kunnen daarna nog gewoon instromen via QR-code of link."
    );
    if (!confirmed) {
      return;
    }

    await mutate(async () => {
      const response = await fetch(apiPath(`/api/presentations/${id}/participants/start`), {
        method: "PATCH",
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Startgroep kon niet worden vastgelegd.");
      }
      return data;
    }, alreadyStarted ? "Startgroep opnieuw vastgelegd" : "Startgroep vastgelegd");
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
  const screenQuestion =
    payload.questions.find((question) => question.id === payload.presentation.screenQuestionId) ?? null;
  const currentFlowQuestion = activeQuestion ?? screenQuestion;
  const currentFlowQuestionIndex = currentFlowQuestion
    ? payload.questions.findIndex((question) => question.id === currentFlowQuestion.id)
    : -1;
  const previousQuestion = currentFlowQuestionIndex > 0 ? payload.questions[currentFlowQuestionIndex - 1] : null;
  const nextQuestion =
    currentFlowQuestionIndex >= 0 && currentFlowQuestionIndex < payload.questions.length - 1
      ? payload.questions[currentFlowQuestionIndex + 1]
      : null;
  const activeResultsVisible = Boolean(
    activeQuestion &&
      payload.presentation.screenView === "results" &&
      payload.presentation.screenQuestionId === activeQuestion.id
  );
  const activeQuizTiming =
    activeQuestion?.type === "quiz" ? getQuestionTimingState(activeQuestion.content, "quiz", nowMs) : null;
  const showActiveQuizTimer = Boolean(
    activeQuestion?.type === "quiz" && activeQuizTiming && (activeQuizTiming.isCountdown || activeQuizTiming.timeLimitSeconds)
  );
  const activeQuizRemainingSeconds =
    activeQuizTiming?.isCountdown && activeQuizTiming.answerOpenAtMs
      ? Math.max(0, Math.ceil((activeQuizTiming.answerOpenAtMs - nowMs) / 1000))
      : activeQuizTiming?.answerEndsAtMs
        ? Math.max(0, Math.ceil((activeQuizTiming.answerEndsAtMs - nowMs) / 1000))
        : null;
  const activeQuizTimerLabel = activeQuizTiming?.isCountdown
    ? "Aftellen"
    : activeQuizTiming?.isExpired
      ? "Tijd voorbij"
      : "Tijd loopt";
  const activeQuizTimerDetail = activeQuizTiming?.isCountdown
    ? `Stemmen opent over ${formatTimerSeconds(activeQuizRemainingSeconds ?? 0)}.`
    : activeQuizTiming?.isExpired
      ? "De vraag is gesloten voor deelnemers."
      : activeQuizRemainingSeconds !== null
        ? `Nog ${formatTimerSeconds(activeQuizRemainingSeconds)} om te stemmen.`
        : "Geen tijdslimiet actief.";
  const activeQuizTimerProgress = activeQuizTiming
    ? activeQuizTiming.isCountdown
      ? activeQuizTiming.countdownProgress
      : activeQuizTiming.timeLimitSeconds
        ? activeQuizTiming.answerProgress
        : 0
    : 0;
  const activeQuizTimerToneClass = activeQuizTiming?.isExpired
    ? "border-amber-300 bg-amber-50 text-amber-950"
    : activeQuizTiming?.isCountdown
      ? "border-sky-300 bg-sky-50 text-sky-950"
      : "border-emerald-300 bg-emerald-50 text-emerald-950";
  const activeQuizTimerBarClass = activeQuizTiming?.isExpired
    ? "bg-amber-500"
    : activeQuizTiming?.isCountdown
      ? "bg-sky-600"
      : "bg-emerald-700";
  const isGeneralScreenVisible = payload.presentation.screenView === "question" && !activeQuestion;
  const rankingLabel =
    payload.quizTotals.total > 0 && payload.quizTotals.finalized >= payload.quizTotals.total
      ? "Eindklassering"
      : "Tussenstand";
  const participantGroupStartedAt = payload.presentation.participantGroupStartedAt;
  const participantGroupStarted = Boolean(participantGroupStartedAt);
  const participants = payload.participants;
  const lateParticipants = participants.filter((participant) => participant.joinedAfterGroupStart);
  const participantsWithScore = participants.filter((participant) => participant.score > 0);
  const participantGroupStartLabel = formatShortDateTime(participantGroupStartedAt);
  const participantGroupCount = participantGroupStarted
    ? payload.presentation.participantGroupStartedCount ?? Math.max(participants.length - lateParticipants.length, 0)
    : participants.length;
  const editingQuestion = payload.questions.find((question) => question.id === editingQuestionId) ?? null;
  const tabs: Array<{ id: PresenterTab; label: string; meta: string }> = [
    { id: "regie", label: "Regie", meta: isGeneralScreenVisible ? "algemeen" : "op beeld" },
    { id: "deelnemers", label: "Deelnemers", meta: `${payload.totals.participants}` },
    { id: "vragen", label: "Vragen", meta: `${payload.questions.length}` },
    { id: "resultaten", label: "Resultaten", meta: `${payload.totals.answers}` },
    { id: "instellingen", label: "Instellingen", meta: payload.presentation.code },
  ];

  function tabClassName(tab: PresenterTab) {
    return `rounded-lg px-2 py-2 text-center text-xs font-black transition sm:px-4 sm:py-3 sm:text-left sm:text-sm ${
      presenterTab === tab
        ? "bg-zinc-950 text-white shadow-sm"
        : "bg-white text-zinc-700 hover:bg-zinc-100"
    }`;
  }

  function tabIcon(tab: PresenterTab) {
    const className = "h-5 w-5";

    if (tab === "regie") {
      return <SlidersHorizontal aria-hidden className={className} />;
    }

    if (tab === "deelnemers") {
      return <Users aria-hidden className={className} />;
    }

    if (tab === "vragen") {
      return <ListChecks aria-hidden className={className} />;
    }

    if (tab === "resultaten") {
      return <BarChart3 aria-hidden className={className} />;
    }

    return <Settings aria-hidden className={className} />;
  }

  async function showGeneralScreen() {
    await activate(null);
  }

  const screenState = (() => {
    if (payload.presentation.screenView === "qr") {
      return {
        label: "QR-code staat live op het grote scherm",
        detail: `Deelnemers kunnen binnenkomen met code ${payload.presentation.code}.`,
        tone: "emerald",
      };
    }

    if (payload.presentation.screenView === "results") {
      return {
        label: "Resultaten staan live op het grote scherm",
        detail: screenQuestion?.prompt ?? "Er worden resultaten getoond.",
        tone: "sky",
      };
    }

    if (payload.presentation.screenView === "ranking") {
      return {
        label: `${rankingLabel} staat live op het grote scherm`,
        detail: "De scorelijst is zichtbaar voor de zaal.",
        tone: "amber",
      };
    }

    if (activeQuestion) {
      return {
        label: "Vraag staat live op het grote scherm",
        detail: activeQuestion.prompt,
        tone: "emerald",
      };
    }

    return {
      label: "Algemeen scherm staat live",
      detail: payload.presentation.idleScreenText || payload.presentation.title,
      tone: "zinc",
    };
  })();

  const screenToneClass =
    screenState.tone === "emerald"
      ? "border-emerald-400 bg-emerald-50 text-emerald-950"
      : screenState.tone === "sky"
        ? "border-sky-300 bg-sky-50 text-sky-950"
        : screenState.tone === "amber"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-zinc-300 bg-white text-zinc-950";
  const generalBackgroundInputValue = generalBackgroundDirty
    ? generalBackgroundDraft
    : persistedGeneralScreenBackgroundColor ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR;
  const normalizedGeneralBackgroundDraft = normalizeHexColor(generalBackgroundInputValue);
  const generalBackgroundPreviewColor =
    normalizedGeneralBackgroundDraft ?? DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR;
  const generalBackgroundPalette = getGeneralScreenPalette(generalBackgroundPreviewColor);
  const generalBackgroundInvalid = Boolean(generalBackgroundInputValue.trim() && !normalizedGeneralBackgroundDraft);
  const generalBackgroundDefault =
    Boolean(normalizedGeneralBackgroundDraft) &&
    normalizeGeneralScreenBackgroundColor(normalizedGeneralBackgroundDraft) === null;
  const generalFontFamilyInputValue = resolveGeneralScreenFontFamily(
    generalTypographyDirty
      ? generalTypographyDraft.fontFamily
      : persistedGeneralScreenFontFamily ?? DEFAULT_GENERAL_SCREEN_FONT_FAMILY
  );
  const generalFontSizeInputValue = resolveGeneralScreenFontSize(
    generalTypographyDirty
      ? generalTypographyDraft.fontSize
      : persistedGeneralScreenFontSize ?? DEFAULT_GENERAL_SCREEN_FONT_SIZE
  );
  const generalFontOption = getGeneralScreenFontOption(generalFontFamilyInputValue);
  const generalPreviewHeadingSize = Math.max(18, Math.round(generalFontSizeInputValue / 4));
  const generalPreviewMetaSize = Math.max(10, Math.round(generalFontSizeInputValue / 10));
  const generalTypographyDefault =
    normalizeGeneralScreenFontFamily(generalFontFamilyInputValue) === null &&
    normalizeGeneralScreenFontSize(generalFontSizeInputValue) === null;

  return (
    <main className={`min-h-screen bg-[#f4f4ef] text-zinc-950 ${activeQuestion ? "pb-56 md:pb-40" : ""}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 md:gap-5 md:px-8 md:py-5">
        <header className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase text-emerald-800">Sessie Interactief</p>
            <h1 className="mt-1 break-words text-2xl font-black leading-tight md:mt-2 md:text-4xl">{payload.presentation.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 md:gap-2">
              <span className="rounded-lg bg-zinc-900 px-3 py-2 font-mono text-base font-black text-white md:text-lg">
                {payload.presentation.code}
              </span>
              <span className={`rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${screenToneClass}`}>
                {screenState.label}
              </span>
              <span className="hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 sm:inline-flex">
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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              href="/moderator"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Gebruikersomgeving
            </a>
            <a
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              href="/beheerder"
            >
              Beheerder
            </a>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              onClick={() => copy(joinLink, "Deelnemerslink")}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              Link
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
              onClick={() => copy(payload.presentation.code, "Sessiecode")}
              type="button"
            >
              <Copy aria-hidden className="h-4 w-4" />
              Code
            </button>
            <a
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700 sm:col-span-1"
              href={screenLink}
              rel="noreferrer"
              target="_blank"
            >
              <Monitor aria-hidden className="h-4 w-4" />
              Groot scherm
            </a>
          </div>
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

        <nav className="grid grid-cols-2 gap-1.5 rounded-lg border border-zinc-300 bg-zinc-100 p-1.5 sm:grid-cols-5 sm:gap-2 sm:p-2">
          {tabs.map((tab) => (
            <button className={tabClassName(tab.id)} key={tab.id} onClick={() => setPresenterTab(tab.id)} type="button">
              <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 ${
                    presenterTab === tab.id ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {tabIcon(tab.id)}
                </span>
                <span className="min-w-0">
                  <span className="block">{tab.label}</span>
                  <span className={`mt-1 hidden text-xs sm:block ${presenterTab === tab.id ? "text-zinc-300" : "text-zinc-500"}`}>
                    {tab.meta}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </nav>

        {presenterTab === "regie" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
            <div className="flex flex-col gap-4 md:gap-5">
              <article className={`rounded-lg border p-4 shadow-sm md:p-5 ${screenToneClass}`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
                  <div className="min-w-0 rounded-lg border border-black/10 bg-white/70 p-4">
                    <p className="inline-flex items-center gap-2 text-xs font-black uppercase">
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                      Nu op beeld
                    </p>
                    <h2 className="mt-2 text-xl font-black leading-tight md:text-2xl">{screenState.label}</h2>
                    <p className="mt-2 line-clamp-3 text-sm font-semibold opacity-80">{screenState.detail}</p>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-zinc-500">Vragen</p>
                        <p className="text-lg font-black text-zinc-950">{payload.totals.questions}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-zinc-500">Antwoorden</p>
                        <p className="text-lg font-black text-zinc-950">{payload.totals.answers}</p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-zinc-500">Deelnemers</p>
                        <p className="text-lg font-black text-zinc-950">{payload.totals.participants}</p>
                      </div>
                    </div>

                    {showActiveQuizTimer ? (
                      <div className={`mt-4 rounded-lg border px-3 py-3 ${activeQuizTimerToneClass}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="inline-flex items-center gap-2 text-xs font-black uppercase">
                            <Timer aria-hidden className="h-4 w-4" />
                            {activeQuizTimerLabel}
                          </p>
                          <p className="text-sm font-black">
                            {activeQuizTiming?.isExpired
                              ? "Voorbij"
                              : activeQuizRemainingSeconds !== null
                                ? formatTimerSeconds(activeQuizRemainingSeconds)
                                : ""}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                          <div
                            className={`h-full rounded-full transition-[width] duration-200 ${activeQuizTimerBarClass}`}
                            style={{ width: `${Math.round(activeQuizTimerProgress * 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs font-bold opacity-85">{activeQuizTimerDetail}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-black/10 bg-white p-3 text-zinc-950 shadow-sm md:p-4">
                    <p className="text-xs font-black uppercase text-zinc-500">Regieknoppen</p>
                    <button
                      className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-4 text-base font-black text-white disabled:opacity-50 ${
                        payload.presentation.screenView === "results"
                          ? "bg-emerald-800 hover:bg-emerald-900"
                          : "bg-sky-800 hover:bg-sky-900"
                      }`}
                      disabled={
                        saving ||
                        (payload.presentation.screenView !== "results" && !activeQuestion) ||
                        (payload.presentation.screenView === "results" && !nextQuestion && isGeneralScreenVisible)
                      }
                      onClick={() =>
                        payload.presentation.screenView === "results"
                          ? nextQuestion
                            ? activate(nextQuestion.id)
                            : showGeneralScreen()
                          : activeQuestion && toggleResults(activeQuestion.id)
                      }
                      type="button"
                    >
                      {payload.presentation.screenView === "results" ? (
                        <ArrowDown aria-hidden className="h-5 w-5" />
                      ) : (
                        <BarChart3 aria-hidden className="h-5 w-5" />
                      )}
                      {payload.presentation.screenView === "results"
                        ? nextQuestion
                          ? "Volgende vraag"
                          : "Algemeen scherm"
                        : "Resultaten tonen"}
                    </button>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50"
                        disabled={saving || !nextQuestion}
                        onClick={() => nextQuestion && activate(nextQuestion.id)}
                        type="button"
                      >
                        <ArrowDown aria-hidden className="h-4 w-4" />
                        Volgende
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50"
                        disabled={saving || isGeneralScreenVisible}
                        onClick={showGeneralScreen}
                        type="button"
                      >
                        <Monitor aria-hidden className="h-4 w-4" />
                        Algemeen
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50"
                        disabled={saving || !activeQuestion || payload.presentation.screenView === "question"}
                        onClick={() => updateScreenView("question")}
                        type="button"
                      >
                        <Play aria-hidden className="h-4 w-4" />
                        Vraag
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 py-3 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                        disabled={saving || !activeQuestion}
                        onClick={() => activate(null)}
                        type="button"
                      >
                        <Square aria-hidden className="h-4 w-4" />
                        Stop
                      </button>
                      <button
                        className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold disabled:opacity-60 ${
                          payload.presentation.screenView === "ranking"
                            ? "bg-zinc-950 text-white hover:bg-zinc-800"
                            : "bg-amber-700 text-white hover:bg-amber-800"
                        }`}
                        disabled={saving || !payload.quizTotals.finalized}
                        onClick={toggleRanking}
                        type="button"
                      >
                        <Trophy aria-hidden className="h-4 w-4" />
                        {payload.presentation.screenView === "ranking" ? "Sluit stand" : rankingLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-lg border border-zinc-300 bg-white p-3 shadow-sm md:p-5">
                <div className="mb-3 flex flex-col gap-3 border-b border-zinc-200 pb-3 md:mb-5 md:flex-row md:items-end md:justify-between md:pb-4">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-800">Presentatieflow</p>
                    <h2 className="mt-1 text-xl font-black">Vragen live bedienen</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
                    <span className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700">
                      {payload.questions.length} vragen
                    </span>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                      disabled={saving}
                      onClick={resetFlow}
                      type="button"
                    >
                      <RotateCcw aria-hidden className="h-4 w-4" />
                      Reset presentatieflow
                    </button>
                    <button
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-60 md:col-span-1"
                      disabled={saving || !payload.totals.answers}
                      onClick={() => reset(null)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Wis alle antwoorden
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:gap-3">
                  {payload.questions.map((question, index) => {
                    const isActive = question.id === payload.presentation.activeQuestionId;
                    const showingResults =
                      payload.presentation.screenView === "results" && payload.presentation.screenQuestionId === question.id;

                    return (
                      <article
                        className={`rounded-lg border p-3 md:p-4 ${
                          isActive ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-zinc-200 bg-zinc-50"
                        }`}
                        key={question.id}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-zinc-950 px-2.5 py-1 font-mono text-xs font-black text-white">
                                {question.position}
                              </span>
                              <span className="rounded-md bg-white px-2 py-1 text-xs font-bold uppercase text-zinc-600">
                                {questionTypeLabel(question.type)}
                              </span>
                              {isActive ? <span className="rounded-md bg-emerald-800 px-2 py-1 text-xs font-black uppercase text-white">Live</span> : null}
                              {question.type === "quiz" && question.finalized ? (
                                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-900">
                                  Afgesloten
                                </span>
                              ) : null}
                              <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-zinc-600">
                                {question.answerCount} antwoorden
                              </span>
                            </div>
                            <h3 className="mt-2 text-sm font-black leading-snug md:text-base">{question.prompt}</h3>
                          </div>
                          <div className="grid grid-cols-4 gap-2 lg:flex lg:flex-wrap lg:justify-end">
                            <button
                              aria-label="Vraag omhoog"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40"
                              disabled={saving || index === 0}
                              onClick={() => moveQuestion(question.id, "up")}
                              type="button"
                            >
                              <ArrowUp aria-hidden className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Vraag omlaag"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 disabled:opacity-40"
                              disabled={saving || index === payload.questions.length - 1}
                              onClick={() => moveQuestion(question.id, "down")}
                              type="button"
                            >
                              <ArrowDown aria-hidden className="h-4 w-4" />
                            </button>
                            <button
                              className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black disabled:opacity-60 lg:col-span-1 ${
                                showingResults ? "bg-zinc-950 text-white" : "bg-sky-800 text-white hover:bg-sky-900"
                              }`}
                              disabled={saving}
                              onClick={() => toggleResults(question.id)}
                              type="button"
                            >
                              <BarChart3 aria-hidden className="h-4 w-4" />
                              {showingResults ? "Sluit" : "Resultaten"}
                            </button>
                            <button
                              className={`col-span-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black text-white disabled:opacity-60 lg:col-span-1 ${
                                isActive ? "bg-amber-700 hover:bg-amber-800" : "bg-emerald-800 hover:bg-emerald-900"
                              }`}
                              disabled={saving}
                              onClick={() => activate(isActive ? null : question.id)}
                              type="button"
                            >
                              {isActive ? <Square aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
                              {question.finalized ? "Open opnieuw" : isActive ? "Stop" : "Live"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            </div>

            <aside className="flex flex-col gap-4 md:gap-5">
              <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-white shadow-sm md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-300">Live preview groot scherm</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-400">
                      Zelfde beeld als in de zaal
                    </p>
                  </div>
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-800"
                    href={screenLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Monitor aria-hidden className="h-4 w-4" />
                    Open
                  </a>
                </div>
                <div className="mt-4 hidden overflow-hidden rounded-lg border border-zinc-700 bg-black shadow-inner md:block">
                  <div className="relative aspect-video w-full overflow-hidden">
                    <iframe
                      className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left border-0"
                      key={payload.presentation.code}
                      src={screenLink}
                      style={{ transform: "scale(0.25)" }}
                      title="Live preview van het grote scherm"
                    />
                  </div>
                </div>
              </article>

              <article className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black">Deelnemers</h2>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-sm font-black">
                    {payload.presentation.code}
                  </span>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-[140px_1fr] xl:grid-cols-1">
                  <div className="hidden sm:block">
                    <QrCode label={joinLink || payload.presentation.code} value={joinLink || payload.presentation.code} />
                  </div>
                  <div>
                    <p className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xl font-black sm:text-2xl">
                      {payload.presentation.code}
                    </p>
                    <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50" onClick={() => copy(joinLink, "Deelnemerslink")} type="button">
                      <Copy aria-hidden className="h-4 w-4" />
                      Kopieer link
                    </button>
                    <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-3 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-60" disabled={saving} onClick={() => updateScreenView("qr")} type="button">
                      <QrCodeIcon aria-hidden className="h-4 w-4" />
                      Toon QR op groot scherm
                    </button>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        ) : null}

        {presenterTab !== "regie" ? (
        <section className={`grid gap-6 ${presenterTab === "vragen" ? "xl:grid-cols-[360px_1fr]" : "xl:grid-cols-1"}`}>
          <aside className="flex flex-col gap-6">
            <article className={`${presenterTab === "deelnemers" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-4 shadow-sm md:p-5`}>
              <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-800">Deelnemers</p>
                  <h2 className="mt-1 text-2xl font-black">Wie doet er mee?</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold text-zinc-600">
                    Leg de startgroep vast zodra je wilt beginnen. De QR-code en aanmeldlink blijven daarna open voor late instromers.
                  </p>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-60"
                  disabled={saving || !participants.length}
                  onClick={startParticipantGroup}
                  type="button"
                >
                  <UserCheck aria-hidden className="h-4 w-4" />
                  {participantGroupStarted ? "Startgroep opnieuw vastleggen" : "Start met huidige groep"}
                </button>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-black uppercase text-zinc-500">Aangemeld</p>
                  <p className="mt-1 text-2xl font-black">{participants.length}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-black uppercase text-zinc-500">Startgroep</p>
                  <p className="mt-1 text-2xl font-black">{participantGroupCount}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-black uppercase text-zinc-500">Later ingestroomd</p>
                  <p className="mt-1 text-2xl font-black">{participantGroupStarted ? lateParticipants.length : 0}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-black uppercase text-zinc-500">Met punten</p>
                  <p className="mt-1 text-2xl font-black">{participantsWithScore.length}</p>
                </div>
              </div>

              <div
                className={`mt-4 rounded-lg border p-4 ${
                  participantGroupStarted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="inline-flex items-center gap-2 text-sm font-black">
                    {participantGroupStarted ? (
                      <UserCheck aria-hidden className="h-4 w-4" />
                    ) : (
                      <UserPlus aria-hidden className="h-4 w-4" />
                    )}
                    {participantGroupStarted
                      ? `Startgroep vastgelegd${participantGroupStartLabel ? ` op ${participantGroupStartLabel}` : ""}`
                      : "Quizgroep nog niet gestart"}
                  </p>
                  <p className="text-sm font-bold opacity-80">
                    {participantGroupStarted
                      ? "Late deelnemers blijven welkom en komen automatisch in de ranking."
                      : "Wacht tot de meeste mensen binnen zijn en leg dan de startgroep vast."}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                {participants.length ? (
                  <div className="divide-y divide-zinc-200">
                    {participants.map((participant) => (
                      <div
                        className="grid gap-3 bg-white p-3 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:p-4"
                        key={participant.participantId}
                      >
                        <div className="flex items-center gap-3 md:block">
                          <span className="grid h-11 w-11 place-items-center rounded-lg bg-zinc-950 text-sm font-black text-white">
                            {participant.displayIndex}
                          </span>
                          <span className="md:hidden text-sm font-black">{participant.label}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="hidden truncate text-lg font-black md:block">{participant.label}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                              {participant.isAnonymous ? "Anoniem" : "Naam ingevuld"}
                            </span>
                            {participantGroupStarted ? (
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-black ${
                                  participant.joinedAfterGroupStart
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {participant.joinedAfterGroupStart ? "Later ingestroomd" : "Startgroep"}
                              </span>
                            ) : null}
                            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200">
                              Binnen sinds {formatShortDateTime(participant.joinedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:min-w-[260px]">
                          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-black uppercase text-zinc-500">Plaats</p>
                            <p className="text-base font-black">{participant.rank ? `#${participant.rank}` : "-"}</p>
                          </div>
                          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-black uppercase text-zinc-500">Score</p>
                            <p className="text-base font-black">
                              {participant.score} {participant.score === 1 ? "punt" : "punten"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-black uppercase text-zinc-500">Quiz</p>
                            <p className="text-base font-black">{participant.answered}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-[220px] place-items-center bg-zinc-50 p-6 text-center">
                    <div>
                      <Users aria-hidden className="mx-auto h-10 w-10 text-zinc-400" />
                      <h3 className="mt-3 text-xl font-black">Nog niemand aangemeld</h3>
                      <p className="mt-2 text-sm font-semibold text-zinc-600">
                        Toon de QR-code of deel de link zodat deelnemers binnenkomen.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className={`${presenterTab === "instellingen" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
              <h2 className="mb-2 text-lg font-bold">Groot scherm bediening</h2>
              <p className="mb-4 text-sm text-zinc-600">
                Open deze vaste URL op de laptop bij de beamer en stuur de inhoud vanaf hier.
              </p>
              <div className="mb-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                <span className="block font-semibold">Scherm-URL</span>
                <span className="block break-all font-mono text-xs">{screenLink}</span>
              </div>
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

            <article className={`${presenterTab === "instellingen" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-emerald-800">
                    <Palette aria-hidden className="h-4 w-4" />
                    Vormgeving
                  </p>
                  <h2 className="mt-1 text-lg font-black">Algemeen scherm</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-600">
                    Deze kleur wordt gebruikt op het algemene scherm, zoals de lobby en het wachtenscherm.
                  </p>
                </div>
                <span className="rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm font-black text-zinc-800">
                  {generalBackgroundPreviewColor}
                </span>
              </div>

              <form className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4" onSubmit={saveIdleScreenText}>
                <label className="block text-sm font-black text-zinc-800" htmlFor="idle-screen-text">
                  Naam op algemeen scherm
                </label>
                <p className="mt-1 text-sm font-semibold text-zinc-600">
                  Deze tekst staat op het algemene scherm wanneer er geen vraag live is.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    defaultValue={payload.presentation.idleScreenText}
                    id="idle-screen-text"
                    key={payload.presentation.idleScreenText}
                    maxLength={90}
                    name="idleScreenText"
                  />
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                    disabled={saving}
                    type="submit"
                  >
                    <Save aria-hidden className="h-4 w-4" />
                    Opslaan
                  </button>
                </div>
              </form>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                <section className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <label className="text-sm font-black text-zinc-800" htmlFor="general-screen-background">
                    Achtergrondkleur
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[72px_1fr_auto] sm:items-end">
                    <input
                      aria-label="Kies achtergrondkleur"
                      className="h-12 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
                      id="general-screen-background"
                      onChange={(event) => updateGeneralBackgroundDraft(event.target.value)}
                      type="color"
                      value={generalBackgroundPreviewColor}
                    />
                    <label className="min-w-0 text-sm font-bold text-zinc-700" htmlFor="general-screen-background-hex">
                      HEX
                      <input
                        aria-invalid={generalBackgroundInvalid}
                        className={`mt-1 w-full rounded-lg border bg-white px-3 py-3 font-mono text-sm font-black outline-none focus:ring-2 ${
                          generalBackgroundInvalid
                            ? "border-rose-300 text-rose-800 focus:border-rose-600 focus:ring-rose-100"
                            : "border-zinc-300 text-zinc-950 focus:border-emerald-700 focus:ring-emerald-100"
                        }`}
                        id="general-screen-background-hex"
                        maxLength={7}
                        onChange={(event) => updateGeneralBackgroundDraft(event.target.value)}
                        placeholder="#09090B"
                        spellCheck={false}
                        value={generalBackgroundInputValue}
                      />
                    </label>
                    <div
                      aria-label={`Kleurpreview ${generalBackgroundPreviewColor}`}
                      className="h-12 rounded-lg border border-zinc-300 shadow-inner sm:w-16"
                      style={{ backgroundColor: generalBackgroundPreviewColor }}
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p
                      className={`text-sm font-semibold ${
                        generalBackgroundError || generalBackgroundInvalid ? "text-rose-700" : "text-zinc-600"
                      }`}
                    >
                      {generalBackgroundError ||
                        (generalBackgroundInvalid
                          ? "Gebruik een geldige HEX-kleur, bijvoorbeeld #00963E."
                          : generalBackgroundSaving
                            ? "Achtergrondkleur opslaan..."
                            : generalBackgroundDefault
                              ? `Standaardkleur actief (${DEFAULT_GENERAL_SCREEN_BACKGROUND_COLOR})`
                              : "Achtergrondkleur opgeslagen.")}
                    </p>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50"
                      disabled={generalBackgroundSaving}
                      onClick={restoreDefaultGeneralBackground}
                      type="button"
                    >
                      <RotateCcw aria-hidden className="h-4 w-4" />
                      Standaard herstellen
                    </button>
                  </div>

                  <div className="border-t border-zinc-200 pt-4">
                    <label className="text-sm font-black text-zinc-800" htmlFor="general-screen-font-family">
                      Lettertype
                    </label>
                    <select
                      className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      id="general-screen-font-family"
                      onChange={(event) => updateGeneralTypographyDraft({ fontFamily: event.target.value })}
                      value={generalFontFamilyInputValue}
                    >
                      {GENERAL_SCREEN_FONT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-black text-zinc-800" htmlFor="general-screen-font-size">
                        Lettergrootte
                      </label>
                      <span className="rounded-md bg-white px-2 py-1 font-mono text-xs font-black text-zinc-700">
                        {generalFontSizeInputValue}px
                      </span>
                    </div>
                    <input
                      className="mt-3 w-full accent-emerald-800"
                      id="general-screen-font-size"
                      max={MAX_GENERAL_SCREEN_FONT_SIZE}
                      min={MIN_GENERAL_SCREEN_FONT_SIZE}
                      onChange={(event) => updateGeneralTypographyDraft({ fontSize: event.target.value })}
                      step={4}
                      type="range"
                      value={generalFontSizeInputValue}
                    />
                    <div className="mt-1 flex justify-between text-xs font-bold text-zinc-500">
                      <span>Kleiner</span>
                      <span>Groter</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-600">
                      {generalTypographyError ||
                        (generalTypographySaving
                          ? "Lettertype opslaan..."
                          : generalTypographyDefault
                            ? "Standaard lettertype en grootte actief."
                            : "Lettertype opgeslagen.")}
                    </p>
                  </div>
                </section>

                <section className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-500">Preview algemeen scherm</p>
                  <div
                    className="mt-3 grid aspect-video place-items-center rounded-lg border p-5 text-center"
                    style={{
                      backgroundColor: generalBackgroundPalette.background,
                      borderColor: generalBackgroundPalette.border,
                      color: generalBackgroundPalette.foreground,
                      fontFamily: generalFontOption.css,
                    }}
                  >
                    <div>
                      <p
                        className="font-black uppercase"
                        style={{
                          color: generalBackgroundPalette.subtle,
                          fontSize: `${generalPreviewMetaSize}px`,
                        }}
                      >
                        Sessie Interactief
                      </p>
                      <h3
                        className="mt-2 font-black leading-tight"
                        style={{ fontSize: `${generalPreviewHeadingSize}px` }}
                      >
                        {payload.presentation.idleScreenText || payload.presentation.title}
                      </h3>
                      <p
                        className="mt-2 font-semibold"
                        style={{
                          color: generalBackgroundPalette.muted,
                          fontSize: `${generalPreviewMetaSize}px`,
                        }}
                      >
                        {payload.presentation.code}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </article>

            <article className={`${presenterTab === "instellingen" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
              <h2 className="mb-4 text-lg font-bold">QR voor deelnemers</h2>
              <QrCode label={joinLink || payload.presentation.code} value={joinLink || payload.presentation.code} />
              <div className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 font-mono text-lg font-black">
                {payload.presentation.code}
              </div>
            </article>

            <form className={`${presenterTab === "vragen" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`} onSubmit={createQuestion}>
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
                    placeholder={"Antwoord A\nAntwoord B\nAntwoord C"}
                    value={form.options}
                  />
                </>
              ) : null}

              {form.type === "quiz" ? (
                <>
                  <QuizOptionsEditor
                    onChange={(quizOptions) => setForm((current) => ({ ...current, quizOptions }))}
                    options={form.quizOptions}
                  />
                  <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor="question-time-limit">
                    Tijdslimiet quizvraag
                  </label>
                  <input
                    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    id="question-time-limit"
                    min={0}
                    onChange={(event) => setForm((current) => ({ ...current, timeLimitSeconds: event.target.value }))}
                    placeholder="Leeg of 0 is geen timer"
                    type="number"
                    value={form.timeLimitSeconds}
                  />
                  <p className="mt-2 text-xs font-semibold text-zinc-500">
                    Bij live zetten start eerst een korte aftelling. Daarna sluit de telefoon automatisch na deze tijd.
                  </p>
                </>
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
            <article className={`${presenterTab === "vragen" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
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
                              disabled={saving}
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
                                ? "Open opnieuw"
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
                    {presenterTab === "resultaten" && editingQuestionId === question.id ? (
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
                          <>
                            <QuizOptionsEditor
                              onChange={(quizOptions) => setEditForm((current) => ({ ...current, quizOptions }))}
                              options={editForm.quizOptions}
                            />
                            <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor={`edit-time-limit-${question.id}`}>
                              Tijdslimiet quizvraag
                            </label>
                            <input
                              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                              id={`edit-time-limit-${question.id}`}
                              min={0}
                              onChange={(event) => setEditForm((current) => ({ ...current, timeLimitSeconds: event.target.value }))}
                              placeholder="Leeg of 0 is geen timer"
                              type="number"
                              value={editForm.timeLimitSeconds}
                            />
                          </>
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
                              setEditForm({ prompt: "", options: "", quizOptions: defaultQuizOptions(), timeLimitSeconds: "" });
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

            <section className={`${presenterTab === "resultaten" ? "" : "hidden"} rounded-lg border border-zinc-300 bg-white p-5 shadow-sm`}>
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
        ) : null}
      </div>

      {editingQuestion ? (
        <div className="fixed inset-0 z-[60] flex justify-end bg-zinc-950/35 p-3">
          <section className="flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <p className="text-xs font-black uppercase text-emerald-800">{questionTypeLabel(editingQuestion.type)}</p>
                <h2 className="mt-1 text-xl font-black">Vraag bewerken</h2>
              </div>
              <button
                aria-label="Sluit bewerken"
                className="rounded-lg border border-zinc-300 bg-white p-2 hover:bg-zinc-100"
                onClick={() => setEditingQuestionId("")}
                type="button"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-zinc-700" htmlFor={`edit-prompt-${editingQuestion.id}`}>
              Vraagtekst
            </label>
            <textarea
              className="mt-2 min-h-32 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id={`edit-prompt-${editingQuestion.id}`}
              maxLength={180}
              onChange={(event) => setEditForm((current) => ({ ...current, prompt: event.target.value }))}
              value={editForm.prompt}
            />

            {editingQuestion.type === "multiple" ? (
              <>
                <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor={`edit-options-${editingQuestion.id}`}>
                  Opties
                </label>
                <textarea
                  className="mt-2 min-h-32 w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  id={`edit-options-${editingQuestion.id}`}
                  onChange={(event) => setEditForm((current) => ({ ...current, options: event.target.value }))}
                  value={editForm.options}
                />
              </>
            ) : null}

            {editingQuestion.type === "quiz" ? (
              <>
                <QuizOptionsEditor
                  onChange={(quizOptions) => setEditForm((current) => ({ ...current, quizOptions }))}
                  options={editForm.quizOptions}
                />
                <label className="mt-4 block text-sm font-semibold text-zinc-700" htmlFor={`edit-time-limit-${editingQuestion.id}`}>
                  Tijdslimiet quizvraag
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  id={`edit-time-limit-${editingQuestion.id}`}
                  min={0}
                  onChange={(event) => setEditForm((current) => ({ ...current, timeLimitSeconds: event.target.value }))}
                  placeholder="Leeg of 0 is geen timer"
                  type="number"
                  value={editForm.timeLimitSeconds}
                />
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  Na de aftelling sluit de telefoon automatisch wanneer de tijd voorbij is.
                </p>
              </>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={saving}
                onClick={() => saveQuestionEdit(editingQuestion)}
                type="button"
              >
                <Save aria-hidden className="h-4 w-4" />
                Opslaan
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-bold hover:bg-zinc-100"
                onClick={() => {
                  setEditingQuestionId("");
                  setEditForm({ prompt: "", options: "", quizOptions: defaultQuizOptions(), timeLimitSeconds: "" });
                }}
                type="button"
              >
                Annuleer
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {activeQuestion ? (
        <section
          aria-label="Live commandocentrum"
          className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-6xl rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-white shadow-2xl shadow-zinc-950/30 md:bottom-4 md:p-3"
        >
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-300 text-emerald-950 sm:grid">
                <Play aria-hidden className="h-5 w-5 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />
                  Nu live
                </p>
                <h2 className="truncate text-sm font-black leading-5 md:text-base">{activeQuestion.prompt}</h2>
                <p className="mt-0.5 hidden text-xs font-semibold text-zinc-400 sm:block">
                  {activeQuestion.answerCount} antwoorden · groot scherm:{" "}
                  {screenViewLabel(payload.presentation.screenView)}
                </p>
                {showActiveQuizTimer ? (
                  <div className={`mt-1 max-w-md rounded-md border px-2 py-1.5 ${activeQuizTimerToneClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="inline-flex items-center gap-2 text-xs font-black uppercase">
                        <Timer aria-hidden className="h-4 w-4" />
                        {activeQuizTimerLabel}
                      </p>
                      <p className="shrink-0 text-sm font-black">
                        {activeQuizTiming?.isExpired
                          ? "Voorbij"
                          : activeQuizRemainingSeconds !== null
                            ? formatTimerSeconds(activeQuizRemainingSeconds)
                            : ""}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/70">
                      <div
                        className={`h-full rounded-full transition-[width] duration-200 ${activeQuizTimerBarClass}`}
                        style={{ width: `${Math.round(activeQuizTimerProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:flex lg:shrink-0">
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 md:text-sm"
                disabled={saving || !previousQuestion}
                onClick={() => previousQuestion && activate(previousQuestion.id)}
                type="button"
              >
                <ArrowUp aria-hidden className="h-4 w-4" />
                Vorige
              </button>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40 md:text-sm"
                disabled={saving || !nextQuestion}
                onClick={() => nextQuestion && activate(nextQuestion.id)}
                type="button"
              >
                <ArrowDown aria-hidden className="h-4 w-4" />
                Volgende
              </button>
              <button
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold disabled:opacity-60 md:text-sm ${
                  activeResultsVisible
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-sky-700 text-white hover:bg-sky-800"
                }`}
                disabled={saving}
                onClick={() => toggleResults(activeQuestion.id)}
                type="button"
              >
                <BarChart3 aria-hidden className="h-4 w-4" />
                {activeResultsVisible ? "Sluit" : "Resultaat"}
              </button>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60 md:text-sm"
                disabled={saving}
                onClick={showGeneralScreen}
                type="button"
              >
                <Monitor aria-hidden className="h-4 w-4" />
                Algemeen
              </button>
              <button
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold disabled:opacity-60 md:text-sm ${
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
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-2 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-60 md:text-sm"
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
