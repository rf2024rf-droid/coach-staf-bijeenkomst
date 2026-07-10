"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Copy,
  Eye,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  PresentationKind,
  PresentationWorkflowStatus,
  PresenterPayload,
  QuestionResult,
  QuestionType,
} from "@/app/types";

type WizardStep = "title" | "type" | "canvas" | "preview" | "finish";
type SaveState = "idle" | "pending" | "saving" | "saved" | "blocked" | "error";
type BuilderKind =
  | "quiz_multiple"
  | "true_false"
  | "open_question"
  | "multi_answer"
  | "title_slide"
  | "text_slide"
  | "image_text"
  | "info_slide"
  | "chapter_slide"
  | "poll"
  | "statement"
  | "wordcloud"
  | "scale";

type OptionDraft = {
  id: string;
  label: string;
  isCorrect: boolean;
};

type ItemDraft = {
  id: string;
  type: QuestionType;
  kind: BuilderKind;
  prompt: string;
  description: string;
  slideBody: string;
  imageUrl: string;
  required: boolean;
  timeLimitSeconds: string;
  points: string;
  options: OptionDraft[];
};

type ItemDefinition = {
  kind: BuilderKind;
  group: "quiz" | "slides" | "interactive";
  type: QuestionType;
  icon: "quiz" | "open" | "slide" | "poll" | "image" | "scale";
  title: string;
  description: string;
  prompt: string;
  options?: Array<{ label: string; isCorrect?: boolean }>;
  content?: Partial<ItemDraft>;
};

const presentationTypes: Array<{
  id: PresentationKind;
  title: string;
  description: string;
  icon: "quiz" | "presentation" | "combined";
}> = [
  {
    id: "quiz",
    title: "Quiz",
    description: "Voor kennisvragen met juiste antwoorden, punten en een eindstand.",
    icon: "quiz",
  },
  {
    id: "interactive",
    title: "Interactieve presentatie",
    description: "Voor open vragen, polls en gesprekken met de zaal.",
    icon: "presentation",
  },
  {
    id: "combined",
    title: "Combinatie",
    description: "Combineer slides, quizvragen en interactieve onderdelen in een flow.",
    icon: "combined",
  },
];

const itemDefinitions: ItemDefinition[] = [
  {
    kind: "quiz_multiple",
    group: "quiz",
    type: "quiz",
    icon: "quiz",
    title: "Meerkeuzevraag",
    description: "Een quizvraag met precies een goed antwoord.",
    prompt: "Welke optie is juist?",
    options: [
      { label: "Antwoord A", isCorrect: true },
      { label: "Antwoord B" },
      { label: "Antwoord C" },
      { label: "Antwoord D" },
    ],
    content: { required: true, points: "1" },
  },
  {
    kind: "true_false",
    group: "quiz",
    type: "quiz",
    icon: "quiz",
    title: "Waar of niet waar",
    description: "Een snelle quizvraag met twee vaste antwoordopties.",
    prompt: "Deze stelling is waar.",
    options: [
      { label: "Waar", isCorrect: true },
      { label: "Niet waar" },
    ],
    content: { required: true, points: "1" },
  },
  {
    kind: "open_question",
    group: "quiz",
    type: "open",
    icon: "open",
    title: "Open vraag",
    description: "Deelnemers typen een kort antwoord of reactie.",
    prompt: "Wat wil je delen met de groep?",
    content: { required: true },
  },
  {
    kind: "multi_answer",
    group: "quiz",
    type: "multiple",
    icon: "poll",
    title: "Meerdere antwoorden mogelijk",
    description: "Voor nu als keuzelijst opgeslagen; later uitbreidbaar naar meerselectie.",
    prompt: "Welke antwoorden passen hierbij?",
    options: [{ label: "Optie A" }, { label: "Optie B" }, { label: "Optie C" }],
    content: { required: true },
  },
  {
    kind: "title_slide",
    group: "slides",
    type: "slide",
    icon: "slide",
    title: "Titelpagina",
    description: "Een duidelijke startslide voor je sessie.",
    prompt: "Titel van je presentatie",
  },
  {
    kind: "text_slide",
    group: "slides",
    type: "slide",
    icon: "slide",
    title: "Tekstslide",
    description: "Een slide met titel en korte tekst.",
    prompt: "Belangrijk punt",
    content: { slideBody: "Schrijf hier de kernboodschap." },
  },
  {
    kind: "image_text",
    group: "slides",
    type: "slide",
    icon: "image",
    title: "Afbeelding met tekst",
    description: "Een visuele slide met optionele afbeelding.",
    prompt: "Titel bij de afbeelding",
  },
  {
    kind: "info_slide",
    group: "slides",
    type: "slide",
    icon: "slide",
    title: "Informatieslide",
    description: "Voor uitleg, agenda of context.",
    prompt: "Informatie voor de groep",
  },
  {
    kind: "chapter_slide",
    group: "slides",
    type: "slide",
    icon: "slide",
    title: "Hoofdstukscherm",
    description: "Markeer een nieuw onderdeel in je presentatie.",
    prompt: "Nieuw hoofdstuk",
  },
  {
    kind: "poll",
    group: "interactive",
    type: "multiple",
    icon: "poll",
    title: "Poll",
    description: "Laat deelnemers kiezen uit meerdere opties.",
    prompt: "Waar gaat jullie voorkeur naar uit?",
    options: [{ label: "Optie A" }, { label: "Optie B" }, { label: "Optie C" }],
  },
  {
    kind: "statement",
    group: "interactive",
    type: "multiple",
    icon: "poll",
    title: "Stelling",
    description: "Peil snel of de zaal het eens of oneens is.",
    prompt: "Ik ben het eens met deze stelling.",
    options: [{ label: "Eens" }, { label: "Oneens" }, { label: "Twijfel" }],
  },
  {
    kind: "wordcloud",
    group: "interactive",
    type: "open",
    icon: "open",
    title: "Woordwolk",
    description: "Verzamel korte woorden of reacties.",
    prompt: "Welk woord komt als eerste bij je op?",
    content: { required: true },
  },
  {
    kind: "scale",
    group: "interactive",
    type: "multiple",
    icon: "scale",
    title: "Schaalvraag",
    description: "Laat deelnemers kiezen op een schaal van 1 tot 5.",
    prompt: "Hoe beoordeel je dit onderdeel?",
    options: [{ label: "1" }, { label: "2" }, { label: "3" }, { label: "4" }, { label: "5" }],
  },
];

function optionId() {
  return `opt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function itemDefinition(kind: string) {
  return itemDefinitions.find((definition) => definition.kind === kind) ?? itemDefinitions[0];
}

function itemTitle(question: QuestionResult) {
  return itemDefinition(question.kind).title;
}

function workflowLabel(status: PresentationWorkflowStatus) {
  if (status === "published") {
    return "Gepubliceerd";
  }
  if (status === "completed") {
    return "Afgerond";
  }
  return "Concept";
}

function typeLabel(type: PresentationKind) {
  if (type === "quiz") {
    return "Quiz";
  }
  if (type === "combined") {
    return "Combinatie";
  }
  return "Interactieve presentatie";
}

function saveLabel(state: SaveState) {
  if (state === "pending") {
    return "Wijzigingen worden zo opgeslagen";
  }
  if (state === "saving") {
    return "Wijzigingen opslaan...";
  }
  if (state === "saved") {
    return "Alle wijzigingen opgeslagen";
  }
  if (state === "blocked") {
    return "Wacht op verplichte velden";
  }
  if (state === "error") {
    return "Opslaan mislukt";
  }
  return "Klaar om te bewerken";
}

function iconFor(definition: ItemDefinition) {
  if (definition.icon === "quiz") {
    return <Trophy aria-hidden className="h-5 w-5" />;
  }
  if (definition.icon === "open") {
    return <Pencil aria-hidden className="h-5 w-5" />;
  }
  if (definition.icon === "poll") {
    return <BarChart3 aria-hidden className="h-5 w-5" />;
  }
  if (definition.icon === "image") {
    return <ImageIcon aria-hidden className="h-5 w-5" />;
  }
  if (definition.icon === "scale") {
    return <CircleDot aria-hidden className="h-5 w-5" />;
  }
  return <FileText aria-hidden className="h-5 w-5" />;
}

function isChoiceQuestion(type: QuestionType) {
  return type === "multiple" || type === "quiz";
}

function draftFromQuestion(question: QuestionResult): ItemDraft {
  const content = question.content;
  const options = question.options.length
    ? question.options.map((option) => ({
        id: option.id,
        label: option.label,
        isCorrect: option.isCorrect,
      }))
    : [
        { id: optionId(), label: "Optie A", isCorrect: question.type === "quiz" },
        { id: optionId(), label: "Optie B", isCorrect: false },
      ];

  return {
    id: question.id,
    type: question.type,
    kind: itemDefinition(question.kind).kind,
    prompt: question.prompt,
    description: typeof content.description === "string" ? content.description : "",
    slideBody: typeof content.slideBody === "string" ? content.slideBody : "",
    imageUrl: typeof content.imageUrl === "string" ? content.imageUrl : "",
    required: typeof content.required === "boolean" ? content.required : true,
    timeLimitSeconds:
      typeof content.timeLimitSeconds === "number" && content.timeLimitSeconds > 0
        ? String(content.timeLimitSeconds)
        : "",
    points: typeof content.points === "number" && content.points > 0 ? String(content.points) : "",
    options,
  };
}

function payloadForDefinition(definition: ItemDefinition) {
  const defaultOptions =
    definition.options?.map((option) => ({
      label: option.label,
      isCorrect: Boolean(option.isCorrect),
    })) ?? [];

  return {
    type: definition.type,
    prompt: definition.prompt,
    options: defaultOptions,
    content: {
      kind: definition.kind,
      description: definition.content?.description ?? "",
      slideBody: definition.content?.slideBody ?? "",
      imageUrl: definition.content?.imageUrl ?? "",
      required: definition.content?.required ?? true,
      points: definition.content?.points ? Number(definition.content.points) : null,
      timeLimitSeconds: definition.content?.timeLimitSeconds
        ? Number(definition.content.timeLimitSeconds)
        : null,
    },
  };
}

function validateDraft(draft: ItemDraft | null) {
  const errors: string[] = [];
  if (!draft) {
    return ["Geen onderdeel geselecteerd."];
  }

  if (!draft.prompt.trim()) {
    errors.push(draft.type === "slide" ? "Titel van de slide ontbreekt." : "Vraagstelling ontbreekt.");
  }

  if (isChoiceQuestion(draft.type)) {
    const filledOptions = draft.options.filter((option) => option.label.trim());
    if (filledOptions.length < 2) {
      errors.push("Voeg minimaal twee antwoordopties toe.");
    }
    if (draft.type === "quiz" && filledOptions.filter((option) => option.isCorrect).length !== 1) {
      errors.push("Kies precies een juist antwoord.");
    }
  }

  if (draft.type === "slide" && !draft.prompt.trim() && !draft.slideBody.trim() && !draft.description.trim()) {
    errors.push("Deze slide is nog leeg.");
  }

  return errors;
}

function validatePresentation(payload: PresenterPayload | null) {
  const errors: Record<string, string[]> = {};
  if (!payload) {
    return errors;
  }

  for (const question of payload.questions) {
    const itemErrors: string[] = [];
    if (!question.prompt.trim()) {
      itemErrors.push(question.type === "slide" ? "Titel ontbreekt." : "Vraagstelling ontbreekt.");
    }
    if (isChoiceQuestion(question.type) && question.options.length < 2) {
      itemErrors.push("Te weinig antwoordopties.");
    }
    if (question.type === "quiz" && question.options.filter((option) => option.isCorrect).length !== 1) {
      itemErrors.push("Geen juist antwoord geselecteerd.");
    }
    if (question.type === "slide" && !question.prompt.trim() && !question.description.trim()) {
      itemErrors.push("Lege slide.");
    }
    if (itemErrors.length) {
      errors[question.id] = itemErrors;
    }
  }

  return errors;
}

export default function PresentationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id") ?? "";
  const returnTo = searchParams.get("returnTo") === "beheerder" ? "beheerder" : "moderator";
  const dashboardPath = returnTo === "beheerder" ? "/beheerder" : "/moderator";
  const [payload, setPayload] = useState<PresenterPayload | null>(null);
  const [step, setStep] = useState<WizardStep>(requestedId ? "canvas" : "title");
  const [title, setTitle] = useState("");
  const [presentationType, setPresentationType] = useState<PresentationKind>("interactive");
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(!requestedId);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveCycle, setSaveCycle] = useState(0);
  const [busy, setBusy] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const applyingDraftRef = useRef(false);
  const activeQuestionIdRef = useRef("");
  const lastDraftQuestionIdRef = useRef("");
  const draftRevisionRef = useRef(0);
  const savingDraftRef = useRef(false);
  const queuedSaveRef = useRef(false);

  const activeQuestion = useMemo(
    () => payload?.questions.find((question) => question.id === activeQuestionId) ?? null,
    [activeQuestionId, payload]
  );
  const joinLink = payload ? `${origin}/join/${payload.presentation.code}` : "";
  const screenLink = payload ? `${origin}/screen/${payload.presentation.code}` : "";
  const groupedDefinitions = useMemo(
    () => ({
      quiz: itemDefinitions.filter((definition) => definition.group === "quiz"),
      slides: itemDefinitions.filter((definition) => definition.group === "slides"),
      interactive: itemDefinitions.filter((definition) => definition.group === "interactive"),
    }),
    []
  );

  function wizardPathFor(presentationId: string) {
    const params = new URLSearchParams({ id: presentationId, returnTo });
    return `/moderator/nieuw?${params.toString()}`;
  }

  const applyPayload = useCallback((nextPayload: PresenterPayload, options: { markSaved?: boolean } = {}) => {
    setPayload(nextPayload);
    setTitle(nextPayload.presentation.title);
    setPresentationType(nextPayload.presentation.presentationType);
    if (options.markSaved !== false) {
      setSaveState("saved");
    }
  }, []);

  const loadPresentation = useCallback(async () => {
    if (!requestedId) {
      return;
    }

    setBusy("load");
    setError("");
    try {
      const response = await fetch(`/api/presentations/${requestedId}`, { cache: "no-store" });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Presentatie kon niet worden geladen.");
      }
      applyPayload(data);
      const firstQuestion = data.questions[0] ?? null;
      setActiveQuestionId(firstQuestion?.id ?? "");
      setStep(data.questions.length ? "canvas" : "type");
      setShowAddPanel(!data.questions.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden geladen.");
    } finally {
      setBusy("");
    }
  }, [applyPayload, requestedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPresentation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPresentation]);

  useEffect(() => {
    activeQuestionIdRef.current = activeQuestionId;
  }, [activeQuestionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextDraftQuestionId = activeQuestion?.id ?? "";
      if (nextDraftQuestionId === lastDraftQuestionIdRef.current) {
        return;
      }

      lastDraftQuestionIdRef.current = nextDraftQuestionId;
      if (!activeQuestion) {
        applyingDraftRef.current = true;
        draftRevisionRef.current += 1;
        queuedSaveRef.current = false;
        setDraft(null);
        applyingDraftRef.current = false;
        return;
      }

      applyingDraftRef.current = true;
      draftRevisionRef.current += 1;
      queuedSaveRef.current = false;
      setDraft(draftFromQuestion(activeQuestion));
      setDirty(false);
      applyingDraftRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeQuestion]);

  const patchPresentation = useCallback(
    async (updates: { title?: string; presentationType?: PresentationKind; workflowStatus?: PresentationWorkflowStatus }) => {
      if (!payload) {
        return null;
      }

      const response = await fetch(`/api/presentations/${payload.presentation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Presentatie kon niet worden opgeslagen.");
      }
      applyPayload(data);
      return data;
    },
    [applyPayload, payload]
  );

  const saveDraft = useCallback(
    async (currentDraft: ItemDraft | null) => {
      if (!payload || !currentDraft) {
        return;
      }

      const draftErrors = validateDraft(currentDraft);
      if (draftErrors.length) {
        setSaveState("blocked");
        return;
      }

      if (savingDraftRef.current) {
        queuedSaveRef.current = true;
        setSaveState("pending");
        return;
      }

      savingDraftRef.current = true;
      const revisionAtRequest = draftRevisionRef.current;
      const questionIdAtRequest = currentDraft.id;
      setSaveState("saving");
      setError("");
      try {
        const response = await fetch(`/api/presentations/${payload.presentation.id}/questions`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            questionId: currentDraft.id,
            prompt: currentDraft.prompt,
            options: currentDraft.options.map((option) => ({
              label: option.label,
              isCorrect: option.isCorrect,
            })),
            content: {
              kind: currentDraft.kind,
              description: currentDraft.description,
              slideBody: currentDraft.slideBody,
              imageUrl: currentDraft.imageUrl,
              required: currentDraft.required,
              timeLimitSeconds: currentDraft.timeLimitSeconds ? Number(currentDraft.timeLimitSeconds) : null,
              points: currentDraft.points ? Number(currentDraft.points) : null,
            },
          }),
        });
        const data = (await response.json()) as PresenterPayload | { error: string };
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Onderdeel kon niet worden opgeslagen.");
        }

        applyPayload(data, { markSaved: false });
        const stillEditingSameQuestion = activeQuestionIdRef.current === questionIdAtRequest;
        const noNewerChanges = revisionAtRequest === draftRevisionRef.current;

        if (stillEditingSameQuestion && noNewerChanges) {
          setDirty(false);
          setSaveState("saved");
        } else if (stillEditingSameQuestion) {
          queuedSaveRef.current = true;
          setDirty(true);
          setSaveState("pending");
        }
      } catch (caught) {
        setSaveState("error");
        setError(caught instanceof Error ? caught.message : "Onderdeel kon niet worden opgeslagen.");
      } finally {
        savingDraftRef.current = false;
        if (queuedSaveRef.current && activeQuestionIdRef.current === currentDraft.id) {
          queuedSaveRef.current = false;
          setSaveCycle((current) => current + 1);
        }
      }
    },
    [applyPayload, payload]
  );

  useEffect(() => {
    if (!dirty || applyingDraftRef.current) {
      return;
    }

    setSaveState("pending");
    const timer = window.setTimeout(() => {
      void saveDraft(draft);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, saveCycle, saveDraft]);

  function markDraftChanged() {
    draftRevisionRef.current += 1;
    setSaveState("pending");
    setDirty(true);
  }

  function updateDraft(updates: Partial<ItemDraft>) {
    setDraft((current) => (current ? { ...current, ...updates } : current));
    markDraftChanged();
  }

  function updateOption(optionIdValue: string, updates: Partial<OptionDraft>) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const options = current.options.map((option) =>
        option.id === optionIdValue ? { ...option, ...updates } : option
      );
      return { ...current, options };
    });
    markDraftChanged();
  }

  async function createDraftPresentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Vul eerst een titel in.");
      return;
    }

    if (payload) {
      setBusy("title");
      setError("");
      try {
        await patchPresentation({ title: cleanTitle, presentationType, workflowStatus: payload.presentation.workflowStatus });
        setStep(payload.questions.length ? "canvas" : "type");
        setNotice("Titel opgeslagen");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Titel kon niet worden opgeslagen.");
      } finally {
        setBusy("");
      }
      return;
    }

    setBusy("create");
    setError("");
    try {
      const response = await fetch("/api/presentations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          template: "blank",
          presentationType,
          workflowStatus: "concept",
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Concept kon niet worden aangemaakt.");
      }
      applyPayload(data);
      router.replace(wizardPathFor(data.presentation.id));
      setStep("type");
      setNotice("Concept aangemaakt");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Concept kon niet worden aangemaakt.");
    } finally {
      setBusy("");
    }
  }

  async function choosePresentationType(nextType: PresentationKind) {
    setPresentationType(nextType);
    if (!payload) {
      setStep("canvas");
      return;
    }

    setBusy("type");
    setError("");
    try {
      await patchPresentation({ presentationType: nextType, workflowStatus: "concept" });
      setStep("canvas");
      setShowAddPanel(true);
      setNotice("Type opgeslagen");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Type kon niet worden opgeslagen.");
    } finally {
      setBusy("");
    }
  }

  async function addItem(kind: BuilderKind) {
    if (!payload) {
      return;
    }

    const definition = itemDefinition(kind);
    setBusy(`add-${kind}`);
    setError("");
    try {
      const beforeIds = new Set(payload.questions.map((question) => question.id));
      const response = await fetch(`/api/presentations/${payload.presentation.id}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadForDefinition(definition)),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Onderdeel kon niet worden toegevoegd.");
      }
      applyPayload(data);
      const created = data.questions.find((question) => !beforeIds.has(question.id)) ?? data.questions.at(-1);
      setActiveQuestionId(created?.id ?? "");
      setShowAddPanel(false);
      setValidationErrors({});
      setNotice("Onderdeel toegevoegd");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Onderdeel kon niet worden toegevoegd.");
    } finally {
      setBusy("");
    }
  }

  async function deleteItem(question: QuestionResult) {
    if (!payload) {
      return;
    }
    const confirmed = window.confirm(`Onderdeel verwijderen?\n\n${question.prompt}`);
    if (!confirmed) {
      return;
    }

    setBusy(`delete-${question.id}`);
    setError("");
    try {
      const response = await fetch(
        `/api/presentations/${payload.presentation.id}/questions?questionId=${encodeURIComponent(question.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Onderdeel kon niet worden verwijderd.");
      }
      applyPayload(data);
      setActiveQuestionId(data.questions[0]?.id ?? "");
      setNotice("Onderdeel verwijderd");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Onderdeel kon niet worden verwijderd.");
    } finally {
      setBusy("");
    }
  }

  async function moveItem(questionId: string, direction: "up" | "down") {
    if (!payload) {
      return null;
    }

    const response = await fetch(`/api/presentations/${payload.presentation.id}/questions`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "move", questionId, direction }),
    });
    const data = (await response.json()) as PresenterPayload | { error: string };
    if (!response.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "Volgorde kon niet worden aangepast.");
    }
    applyPayload(data);
    return data;
  }

  async function moveItemTo(questionId: string, targetIndex: number) {
    if (!payload) {
      return;
    }

    setBusy(`move-${questionId}`);
    setError("");
    try {
      let currentPayload = payload;
      let currentIndex = currentPayload.questions.findIndex((question) => question.id === questionId);
      while (currentIndex > targetIndex) {
        const nextPayload = await moveItem(questionId, "up");
        if (!nextPayload) {
          break;
        }
        currentPayload = nextPayload;
        currentIndex -= 1;
      }
      while (currentIndex < targetIndex) {
        const nextPayload = await moveItem(questionId, "down");
        if (!nextPayload) {
          break;
        }
        currentPayload = nextPayload;
        currentIndex += 1;
      }
      setActiveQuestionId(questionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Volgorde kon niet worden aangepast.");
    } finally {
      setBusy("");
      setDraggingId("");
    }
  }

  async function duplicateItem(question: QuestionResult) {
    if (!payload) {
      return;
    }

    setBusy(`duplicate-${question.id}`);
    setError("");
    try {
      const response = await fetch(`/api/presentations/${payload.presentation.id}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: question.type,
          prompt: `${question.prompt} kopie`.slice(0, 180),
          options: question.options.map((option) => ({
            label: option.label,
            isCorrect: option.isCorrect,
          })),
          content: question.content,
        }),
      });
      const data = (await response.json()) as PresenterPayload | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Onderdeel kon niet worden gedupliceerd.");
      }
      applyPayload(data);
      setActiveQuestionId(data.questions.at(-1)?.id ?? "");
      setNotice("Onderdeel gedupliceerd");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Onderdeel kon niet worden gedupliceerd.");
    } finally {
      setBusy("");
    }
  }

  async function finishPresentation() {
    if (dirty) {
      await saveDraft(draft);
    }
    const errors = validatePresentation(payload);
    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      setStep("canvas");
      setError("Controleer de gemarkeerde onderdelen voordat je afrondt.");
      return;
    }

    setBusy("finish");
    setError("");
    try {
      await patchPresentation({ title: title.trim(), presentationType, workflowStatus: "completed" });
      setStep("finish");
      setNotice("Presentatie afgerond");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Presentatie kon niet worden afgerond.");
    } finally {
      setBusy("");
    }
  }

  async function publishPresentation() {
    const errors = validatePresentation(payload);
    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      setStep("canvas");
      setError("Los eerst de validatiefouten op.");
      return;
    }

    setBusy("publish");
    setError("");
    try {
      await patchPresentation({ title: title.trim(), presentationType, workflowStatus: "published" });
      setStep("finish");
      setNotice("Gepubliceerd. De deelnemerslink is klaar.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Publiceren is mislukt.");
    } finally {
      setBusy("");
    }
  }

  async function copyValue(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setNotice(`${label} gekopieerd`);
    window.setTimeout(() => setNotice(""), 1800);
  }

  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: "title", label: "Titel" },
    { id: "type", label: "Type" },
    { id: "canvas", label: "Onderdelen" },
    { id: "preview", label: "Voorbeeld" },
    { id: "finish", label: "Afronden" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-6">
        <header className="sticky top-0 z-20 -mx-4 border-b border-zinc-300 bg-[#f5f5f0]/95 px-4 pb-4 pt-2 backdrop-blur md:-mx-6 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <button
                className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950"
                onClick={() => router.push(dashboardPath)}
                type="button"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
                Terug naar dashboard
              </button>
              <p className="text-xs font-black uppercase text-emerald-800">Nieuwe presentatie maken</p>
              <h1 className="truncate text-2xl font-black md:text-3xl">
                {title.trim() || "Naamloze presentatie"}
              </h1>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
              <span className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold">
                Stap: {steps.find((item) => item.id === step)?.label}
              </span>
              <span className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold">
                {payload?.questions.length ?? 0} onderdelen
              </span>
              <span
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  saveState === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : saveState === "saving"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {saveLabel(saveState)}
              </span>
            </div>
          </div>

          <nav className="mt-4 grid gap-2 sm:grid-cols-5" aria-label="Voortgang">
            {steps.map((item, index) => {
              const active = item.id === step;
              const reached = index <= steps.findIndex((candidate) => candidate.id === step);
              return (
                <button
                  className={`rounded-lg px-3 py-2 text-left text-sm font-black transition ${
                    active
                      ? "bg-zinc-950 text-white"
                      : reached
                        ? "bg-white text-zinc-800 hover:bg-zinc-100"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                  disabled={!payload && item.id !== "title"}
                  key={item.id}
                  onClick={() => setStep(item.id)}
                  type="button"
                >
                  {index + 1}. {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        {notice || error ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${
              error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {error || notice}
          </div>
        ) : null}

        {busy === "load" ? (
          <section className="grid flex-1 place-items-center py-16">
            <div className="inline-flex items-center gap-3 font-bold text-zinc-700">
              <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
              Presentatie laden...
            </div>
          </section>
        ) : null}

        {step === "title" && busy !== "load" ? (
          <section className="grid flex-1 place-items-center py-12">
            <form className="w-full max-w-3xl" onSubmit={createDraftPresentation}>
              <div className="rounded-lg border border-zinc-300 bg-white p-6 shadow-sm md:p-8">
                <p className="text-sm font-black uppercase text-emerald-800">Stap 1</p>
                <label className="mt-3 block text-3xl font-black md:text-5xl" htmlFor="presentation-title">
                  Hoe heet je presentatie?
                </label>
                <input
                  autoFocus
                  className="mt-8 w-full rounded-lg border-2 border-zinc-300 bg-white px-5 py-5 text-2xl font-black outline-none placeholder:text-zinc-300 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  id="presentation-title"
                  maxLength={90}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Kennisquiz Reggeborgh 2026"
                  value={title}
                />
                <button
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-4 text-lg font-black text-white hover:bg-emerald-900 disabled:opacity-60 md:w-auto"
                  disabled={(busy === "create" || busy === "title") || !title.trim()}
                  type="submit"
                >
                  {busy === "create" || busy === "title" ? (
                    <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight aria-hidden className="h-5 w-5" />
                  )}
                  {payload ? "Titel opslaan" : "Maak concept en ga verder"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {step === "type" && payload ? (
          <section className="py-8">
            <div className="mb-6">
              <p className="text-sm font-black uppercase text-emerald-800">Stap 2</p>
              <h2 className="mt-1 text-3xl font-black">Wat wil je maken?</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {presentationTypes.map((type) => {
                const selected = presentationType === type.id;
                return (
                  <button
                    className={`group rounded-lg border p-5 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                      selected
                        ? "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-200"
                        : "border-zinc-300 bg-white hover:border-zinc-500 hover:bg-zinc-50"
                    }`}
                    key={type.id}
                    onClick={() => void choosePresentationType(type.id)}
                    type="button"
                  >
                    <span className={`grid h-12 w-12 place-items-center rounded-lg ${selected ? "bg-emerald-800 text-white" : "bg-zinc-950 text-white"}`}>
                      {type.icon === "quiz" ? <Trophy aria-hidden className="h-6 w-6" /> : type.icon === "combined" ? <Layers aria-hidden className="h-6 w-6" /> : <Monitor aria-hidden className="h-6 w-6" />}
                    </span>
                    <span className="mt-5 block text-2xl font-black">{type.title}</span>
                    <span className="mt-3 block text-sm font-semibold leading-6 text-zinc-600">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === "canvas" && payload ? (
          <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[320px_1fr]">
            <aside className="lg:sticky lg:top-40 lg:self-start">
              <div className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-800">Tijdlijn</p>
                    <h2 className="text-lg font-black">Vragen en slides</h2>
                  </div>
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white hover:bg-emerald-900"
                    onClick={() => setShowAddPanel((current) => !current)}
                    type="button"
                    aria-label="Nieuw onderdeel"
                  >
                    <Plus aria-hidden className="h-5 w-5" />
                  </button>
                </div>
                {!payload.questions.length ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm font-semibold leading-6 text-zinc-600">
                    Nog geen onderdelen. Voeg je eerste vraag of slide toe.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {payload.questions.map((question, index) => {
                      const active = question.id === activeQuestionId;
                      const errors = validationErrors[question.id] ?? [];
                      return (
                        <button
                          className={`rounded-lg border p-3 text-left transition ${
                            active
                              ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                              : errors.length
                                ? "border-rose-300 bg-rose-50"
                                : "border-zinc-200 bg-zinc-50 hover:bg-white"
                          }`}
                          draggable
                          key={question.id}
                          onClick={() => setActiveQuestionId(question.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDragStart={() => setDraggingId(question.id)}
                          onDrop={() => draggingId && void moveItemTo(draggingId, index)}
                          type="button"
                        >
                          <span className="flex items-start gap-2">
                            <GripVertical aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-black uppercase text-zinc-500">
                                {question.position}. {itemTitle(question)}
                              </span>
                              <span className="mt-1 line-clamp-2 block font-black leading-snug">{question.prompt}</span>
                              <span className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${errors.length ? "bg-rose-100 text-rose-800" : "bg-white text-zinc-600"}`}>
                                {errors.length ? "Onvolledig" : "Compleet"}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <div className="flex flex-col gap-5">
              {showAddPanel || !payload.questions.length ? (
                <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-emerald-800">Onderdeel toevoegen</p>
                      <h2 className="text-2xl font-black">Voeg je eerste vraag of slide toe</h2>
                    </div>
                    {payload.questions.length ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
                        onClick={() => setShowAddPanel(false)}
                        type="button"
                      >
                        <X aria-hidden className="h-4 w-4" />
                        Sluit
                      </button>
                    ) : null}
                  </div>
                  {[
                    ["Quizvragen", groupedDefinitions.quiz],
                    ["Presentatieslides", groupedDefinitions.slides],
                    ["Interactieve onderdelen", groupedDefinitions.interactive],
                  ].map(([label, definitions]) => (
                    <div className="mb-5 last:mb-0" key={label as string}>
                      <h3 className="mb-3 text-sm font-black uppercase text-zinc-500">{label as string}</h3>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {(definitions as ItemDefinition[]).map((definition) => (
                          <button
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                            disabled={busy === `add-${definition.kind}`}
                            key={definition.kind}
                            onClick={() => void addItem(definition.kind)}
                            type="button"
                          >
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-950 text-white">
                              {iconFor(definition)}
                            </span>
                            <span className="mt-3 block font-black">{definition.title}</span>
                            <span className="mt-1 block text-sm font-semibold leading-6 text-zinc-600">
                              {definition.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

              {draft ? (
                <section className="rounded-lg border border-zinc-300 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-emerald-800">{itemDefinition(draft.kind).title}</p>
                      <h2 className="text-2xl font-black">Onderdeel bewerken</h2>
                      {validationErrors[draft.id]?.length ? (
                        <p className="mt-2 text-sm font-bold text-rose-700">
                          {validationErrors[draft.id].join(" ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
                        disabled={busy === `duplicate-${draft.id}`}
                        onClick={() => activeQuestion && void duplicateItem(activeQuestion)}
                        type="button"
                      >
                        <Copy aria-hidden className="h-4 w-4" />
                        Dupliceer
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100"
                        disabled={busy === `delete-${draft.id}`}
                        onClick={() => activeQuestion && void deleteItem(activeQuestion)}
                        type="button"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                        Verwijder
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <label className="block">
                      <span className="text-sm font-black uppercase text-zinc-600">
                        {draft.type === "slide" ? "Titel van de slide" : "Vraagstelling"}
                      </span>
                      <input
                        className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                        maxLength={180}
                        onChange={(event) => updateDraft({ prompt: event.target.value })}
                        value={draft.prompt}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-black uppercase text-zinc-600">
                        {draft.type === "slide" ? "Tekst op de slide" : "Optionele toelichting"}
                      </span>
                      <textarea
                        className="mt-2 min-h-28 w-full resize-y rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                        maxLength={draft.type === "slide" ? 900 : 500}
                        onChange={(event) =>
                          draft.type === "slide"
                            ? updateDraft({ slideBody: event.target.value, description: event.target.value })
                            : updateDraft({ description: event.target.value })
                        }
                        placeholder={draft.type === "slide" ? "Korte tekst of kernboodschap" : "Extra uitleg voor deelnemers"}
                        value={draft.type === "slide" ? draft.slideBody : draft.description}
                      />
                    </label>

                    {isChoiceQuestion(draft.type) ? (
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black uppercase text-zinc-600">Antwoordopties</h3>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-50"
                            onClick={() =>
                              updateDraft({
                                options: [
                                  ...draft.options,
                                  { id: optionId(), label: `Optie ${String.fromCharCode(65 + draft.options.length)}`, isCorrect: false },
                                ],
                              })
                            }
                            type="button"
                          >
                            <Plus aria-hidden className="h-4 w-4" />
                            Optie
                          </button>
                        </div>
                        <div className="grid gap-3">
                          {draft.options.map((option, index) => (
                            <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[auto_1fr_auto]" key={option.id}>
                              <div className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-950 font-black text-white">
                                {String.fromCharCode(65 + index)}
                              </div>
                              <input
                                className="min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                                maxLength={90}
                                onChange={(event) => updateOption(option.id, { label: event.target.value })}
                                value={option.label}
                              />
                              <div className="flex gap-2 md:justify-end">
                                {draft.type === "quiz" ? (
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold">
                                    <input
                                      checked={option.isCorrect}
                                      className="h-4 w-4 accent-emerald-700"
                                      name="correct-option"
                                      onChange={() =>
                                        updateDraft({
                                          options: draft.options.map((current) => ({
                                            ...current,
                                            isCorrect: current.id === option.id,
                                          })),
                                        })
                                      }
                                      type="radio"
                                    />
                                    Juist
                                  </label>
                                ) : null}
                                <button
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 disabled:opacity-40"
                                  disabled={draft.options.length <= 2}
                                  onClick={() =>
                                    updateDraft({
                                      options: draft.options.filter((current) => current.id !== option.id),
                                    })
                                  }
                                  type="button"
                                  aria-label="Optie verwijderen"
                                >
                                  <Trash2 aria-hidden className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <summary className="flex cursor-pointer items-center gap-2 font-black">
                        <Settings aria-hidden className="h-4 w-4" />
                        Geavanceerde instellingen
                      </summary>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm font-bold">
                          <input
                            checked={draft.required}
                            className="h-4 w-4 accent-emerald-700"
                            onChange={(event) => updateDraft({ required: event.target.checked })}
                            type="checkbox"
                          />
                          Verplicht onderdeel
                        </label>
                        <label className="block">
                          <span className="text-sm font-bold text-zinc-600">Tijdslimiet in seconden</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            min={0}
                            onChange={(event) => updateDraft({ timeLimitSeconds: event.target.value })}
                            type="number"
                            value={draft.timeLimitSeconds}
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-bold text-zinc-600">Punten</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            min={0}
                            onChange={(event) => updateDraft({ points: event.target.value })}
                            type="number"
                            value={draft.points}
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-bold text-zinc-600">Afbeeldingslink</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            onChange={(event) => updateDraft({ imageUrl: event.target.value })}
                            placeholder="https://..."
                            value={draft.imageUrl}
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === "preview" && payload ? (
          <section className="grid flex-1 place-items-center py-8">
            <div className="w-full max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-white shadow-sm md:p-8">
              {!payload.questions.length ? (
                <div className="py-16 text-center">
                  <h2 className="text-3xl font-black">Nog geen voorbeeld beschikbaar</h2>
                  <p className="mt-3 text-zinc-300">Voeg eerst een vraag of slide toe.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-col gap-3 border-b border-zinc-700 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase text-emerald-300">Voorbeeld deelnemer</p>
                      <h2 className="mt-1 text-2xl font-black">{payload.presentation.title}</h2>
                    </div>
                    <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-zinc-950">
                      {previewIndex + 1}/{payload.questions.length}
                    </span>
                  </div>
                  {(() => {
                    const question = payload.questions[previewIndex];
                    return (
                      <div>
                        <span className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black uppercase text-emerald-950">
                          {itemTitle(question)}
                        </span>
                        <h3 className="mt-4 text-4xl font-black leading-tight">{question.prompt}</h3>
                        {question.description ? (
                          <p className="mt-4 whitespace-pre-line text-lg font-semibold leading-8 text-zinc-200">
                            {question.description}
                          </p>
                        ) : null}
                        {isChoiceQuestion(question.type) ? (
                          <div className="mt-6 grid gap-3">
                            {question.options.map((option, index) => (
                              <button
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-4 text-left font-bold hover:border-emerald-300"
                                key={option.id}
                                type="button"
                              >
                                {String.fromCharCode(65 + index)}. {option.label}
                              </button>
                            ))}
                          </div>
                        ) : question.type === "open" ? (
                          <textarea
                            className="mt-6 min-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                            placeholder="Simuleer een antwoord"
                          />
                        ) : null}
                      </div>
                    );
                  })()}
                  <div className="mt-8 flex justify-between gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold hover:bg-zinc-800 disabled:opacity-40"
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex((current) => Math.max(current - 1, 0))}
                      type="button"
                    >
                      <ArrowLeft aria-hidden className="h-4 w-4" />
                      Vorige
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-3 font-black text-emerald-950 hover:bg-emerald-200 disabled:opacity-40"
                      disabled={previewIndex >= payload.questions.length - 1}
                      onClick={() => setPreviewIndex((current) => Math.min(current + 1, payload.questions.length - 1))}
                      type="button"
                    >
                      Volgende
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        {step === "finish" && payload ? (
          <section className="grid flex-1 place-items-center py-8">
            <div className="w-full max-w-4xl rounded-lg border border-zinc-300 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-black uppercase text-emerald-800">Samenvatting</p>
              <h2 className="mt-2 text-3xl font-black">{payload.presentation.title}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-600">Type</p>
                  <p className="mt-1 text-xl font-black">{typeLabel(payload.presentation.presentationType)}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-600">Onderdelen</p>
                  <p className="mt-1 text-xl font-black">{payload.questions.length}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-600">Status</p>
                  <p className="mt-1 text-xl font-black">{workflowLabel(payload.presentation.workflowStatus)}</p>
                </div>
              </div>

              {payload.presentation.workflowStatus === "published" ? (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-black text-emerald-950">Deelnemerslink</p>
                  <div className="mt-3 flex flex-col gap-2 md:flex-row">
                    <input
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-3 font-mono text-sm"
                      readOnly
                      value={joinLink}
                    />
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-900"
                      onClick={() => void copyValue(joinLink, "Deelnemerslink")}
                      type="button"
                    >
                      <Copy aria-hidden className="h-4 w-4" />
                      Kopieer
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                  onClick={() => setStep("canvas")}
                  type="button"
                >
                  <Pencil aria-hidden className="h-4 w-4" />
                  Terug naar editor
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                  onClick={() => setStep("preview")}
                  type="button"
                >
                  <Eye aria-hidden className="h-4 w-4" />
                  Voorbeeld bekijken
                </button>
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-3 font-black text-white hover:bg-zinc-800"
                  href={`/presenter/${payload.presentation.id}`}
                >
                  <Monitor aria-hidden className="h-4 w-4" />
                  Naar regie
                </a>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-black text-white hover:bg-emerald-900 disabled:opacity-60"
                  disabled={busy === "publish"}
                  onClick={() => void publishPresentation()}
                  type="button"
                >
                  {busy === "publish" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden className="h-4 w-4" />}
                  Publiceren
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {payload ? (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-300 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl gap-2">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-bold"
              onClick={() => setStep(step === "title" ? "title" : step === "type" ? "title" : "canvas")}
              type="button"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Vorige
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-3 text-sm font-black text-white"
              onClick={() =>
                step === "canvas"
                  ? void finishPresentation()
                  : step === "preview"
                    ? setStep("finish")
                    : step === "finish"
                      ? void publishPresentation()
                      : setStep("canvas")
              }
              type="button"
            >
              {step === "finish" ? "Publiceren" : step === "canvas" ? "Afronden" : "Volgende"}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </footer>
      ) : null}

      {payload && step !== "finish" ? (
        <div className="sticky bottom-0 z-20 mt-auto hidden border-t border-zinc-300 bg-[#f5f5f0]/95 py-4 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                onClick={() => void patchPresentation({ title: title.trim(), presentationType, workflowStatus: "concept" })}
                type="button"
              >
                <Save aria-hidden className="h-4 w-4" />
                Opslaan als concept
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                onClick={() => {
                  setPreviewIndex(0);
                  setStep("preview");
                }}
                type="button"
              >
                <Eye aria-hidden className="h-4 w-4" />
                Voorbeeld bekijken
              </button>
              {screenLink ? (
                <a
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                  href={screenLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Monitor aria-hidden className="h-4 w-4" />
                  Groot scherm
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold hover:bg-zinc-50"
                onClick={() => setShowAddPanel(true)}
                type="button"
              >
                <Plus aria-hidden className="h-4 w-4" />
                Nieuw onderdeel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 disabled:opacity-60"
                disabled={busy === "finish"}
                onClick={() => void finishPresentation()}
                type="button"
              >
                <ListChecks aria-hidden className="h-4 w-4" />
                Presentatie afronden
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
