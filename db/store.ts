import postgres from "postgres";
import {
  isValidGeneralScreenFontSize,
  normalizeGeneralScreenBackgroundColor,
  normalizeGeneralScreenFontFamily,
  normalizeGeneralScreenFontSize,
  normalizeHexColor,
  resolveGeneralScreenFontFamily,
} from "@/lib/generalScreenAppearance";
import {
  QUIZ_LATE_SUBMISSION_GRACE_MS,
  QUIZ_SELECTION_DEADLINE_TOLERANCE_MS,
  buildLiveQuestionContent,
  getQuestionTimingState,
} from "@/lib/questionTiming";

export type QuestionType = "open" | "multiple" | "quiz" | "slide";
export type QuestionStatus = "open" | "closed";
export type ScreenView = "question" | "qr" | "results" | "ranking";
export type ModeratorRole = "admin" | "tester";
export type AppAccountStatus = "pending" | "active" | "deactivated" | "deleted";
export type PresentationKind = "quiz" | "interactive" | "combined";
export type PresentationWorkflowStatus = "concept" | "completed" | "published";

export type PresentationRow = {
  id: string;
  title: string;
  code: string;
  presenter_key: string;
  owner_user_id: string | null;
  owner_email: string | null;
  presentation_type: PresentationKind | null;
  workflow_status: PresentationWorkflowStatus | null;
  published_at: string | null;
  idle_screen_text: string | null;
  general_screen_background_color: string | null;
  general_screen_font_family: string | null;
  general_screen_font_size: number | null;
  active_question_id: string | null;
  screen_question_id: string | null;
  screen_view: ScreenView;
  created_at: string;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  presentation_id: string;
  type: QuestionType;
  prompt: string;
  content_json: string | null;
  status: QuestionStatus;
  position: number;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  position: number;
  is_correct: boolean | null;
};

type ResponseRow = {
  id: string;
  presentation_id: string;
  question_id: string;
  participant_id: string;
  participant_name: string;
  option_id: string | null;
  option_label: string | null;
  text_answer: string | null;
  client_selected_at: string | null;
  client_sequence: number | null;
  created_at: string;
  updated_at: string;
};

type ParticipantProfileRow = {
  id: string;
  presentation_id: string;
  participant_id: string;
  display_name: string;
  is_anonymous: boolean;
  display_index: number;
  created_at: string;
  updated_at: string;
};

type AppAccountRow = {
  id: string;
  email: string;
  role: ModeratorRole;
  status: AppAccountStatus;
  supabase_user_id: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type ModeratorActor = {
  role: ModeratorRole;
  userId: string | null;
  email: string | null;
};

export type QuestionResult = {
  id: string;
  type: QuestionType;
  kind: string;
  prompt: string;
  description: string;
  content: Record<string, unknown>;
  status: QuestionStatus;
  position: number;
  finalized: boolean;
  answerCount: number;
  correctCount: number;
  correctPercentage: number;
  options: Array<{
    id: string;
    label: string;
    position: number;
    isCorrect: boolean;
    count: number;
    percentage: number;
  }>;
  responses: Array<{
    id: string;
    participantName: string;
    optionId: string | null;
    optionLabel: string | null;
    textAnswer: string | null;
    createdAt: string;
  }>;
};

export type LeaderboardEntry = {
  participantId: string;
  label: string;
  rank: number;
  score: number;
  answered: number;
};

export type QuizTotals = {
  total: number;
  finalized: number;
  participants: number;
};

export type PresenterPayload = {
  presentation: {
    id: string;
    title: string;
    code: string;
    presenterKey: string;
    presentationType: PresentationKind;
    workflowStatus: PresentationWorkflowStatus;
    publishedAt: string | null;
    idleScreenText: string;
    generalScreenBackgroundColor: string | null;
    generalScreenFontFamily: ReturnType<typeof resolveGeneralScreenFontFamily> | null;
    generalScreenFontSize: number | null;
    activeQuestionId: string | null;
    screenQuestionId: string | null;
    screenView: ScreenView;
    createdAt: string;
    updatedAt: string;
  };
  questions: QuestionResult[];
  activeQuestion: QuestionResult | null;
  leaderboard: LeaderboardEntry[];
  quizTotals: QuizTotals;
  totals: {
    questions: number;
    answers: number;
    participants: number;
  };
};

export type PublicSessionPayload = {
  presentation: {
    id: string;
    title: string;
    code: string;
    presentationType: PresentationKind;
    workflowStatus: PresentationWorkflowStatus;
    idleScreenText: string;
    generalScreenBackgroundColor: string | null;
    generalScreenFontFamily: ReturnType<typeof resolveGeneralScreenFontFamily> | null;
    generalScreenFontSize: number | null;
  };
  screenView: ScreenView;
  activeQuestion: QuestionResult | null;
  screenQuestion: QuestionResult | null;
  participantLabel: string | null;
  participantResult: {
    questionId: string;
    optionId: string | null;
    optionLabel: string | null;
    optionPosition: number | null;
    isCorrect: boolean | null;
    correctOptionId: string | null;
    correctOptionLabel: string | null;
    correctOptionPosition: number | null;
  } | null;
  leaderboard: LeaderboardEntry[];
  quizTotals: QuizTotals;
  totals: {
    questions: number;
    answers: number;
  };
};

export type ModeratorPresentationSummary = {
  id: string;
  title: string;
  code: string;
  presenterKey: string;
  presentationType: PresentationKind;
  workflowStatus: PresentationWorkflowStatus;
  publishedAt: string | null;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  totals: {
    questions: number;
    slides: number;
    items: number;
    answers: number;
    participants: number;
  };
};

export type ModeratorAccountSummary = {
  id: string;
  email: string;
  role: ModeratorRole;
  status: AppAccountStatus;
  supabaseUserId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  totals: {
    presentations: number;
  };
};

export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

type Database = ReturnType<typeof postgres>;

type OptionInput = {
  label: string;
  isCorrect: boolean;
};

type PresentationTemplate = "default" | "quiz" | "blank";

function normalizePresentationKind(value: unknown): PresentationKind {
  if (value === "quiz" || value === "combined") {
    return value;
  }

  return "interactive";
}

function normalizeWorkflowStatus(value: unknown): PresentationWorkflowStatus {
  if (value === "completed" || value === "published") {
    return value;
  }

  return "concept";
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    presenter_key TEXT NOT NULL,
    owner_user_id TEXT,
    owner_email TEXT,
    presentation_type TEXT NOT NULL DEFAULT 'interactive',
    workflow_status TEXT NOT NULL DEFAULT 'concept',
    published_at TEXT,
    idle_screen_text TEXT,
    general_screen_background_color TEXT,
    general_screen_font_family TEXT,
    general_screen_font_size INTEGER,
    active_question_id TEXT,
    screen_question_id TEXT,
    screen_view TEXT NOT NULL DEFAULT 'question',
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS app_accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'tester',
    status TEXT NOT NULL DEFAULT 'pending',
    supabase_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text),
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    content_json TEXT,
    status TEXT NOT NULL DEFAULT 'closed',
    position INTEGER NOT NULL,
    finalized_at TEXT,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    option_id TEXT REFERENCES question_options(id) ON DELETE SET NULL,
    text_answer TEXT,
    client_selected_at TEXT,
    client_sequence INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS participant_profiles (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    display_index INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS owner_user_id TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS owner_email TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS presentation_type TEXT NOT NULL DEFAULT 'interactive'",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'concept'",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS published_at TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS idle_screen_text TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS general_screen_background_color TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS general_screen_font_family TEXT",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS general_screen_font_size INTEGER",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS screen_view TEXT NOT NULL DEFAULT 'question'",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS screen_question_id TEXT",
  "ALTER TABLE questions ADD COLUMN IF NOT EXISTS finalized_at TEXT",
  "ALTER TABLE questions ADD COLUMN IF NOT EXISTS content_json TEXT",
  "ALTER TABLE question_options ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE responses ADD COLUMN IF NOT EXISTS client_selected_at TEXT",
  "ALTER TABLE responses ADD COLUMN IF NOT EXISTS client_sequence INTEGER NOT NULL DEFAULT 0",
  "CREATE UNIQUE INDEX IF NOT EXISTS presentations_code_idx ON presentations (code)",
  "CREATE INDEX IF NOT EXISTS presentations_owner_idx ON presentations (owner_user_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS app_accounts_email_idx ON app_accounts (email)",
  "CREATE INDEX IF NOT EXISTS app_accounts_supabase_user_idx ON app_accounts (supabase_user_id)",
  "CREATE INDEX IF NOT EXISTS questions_presentation_idx ON questions (presentation_id)",
  "CREATE INDEX IF NOT EXISTS options_question_idx ON question_options (question_id)",
  "CREATE INDEX IF NOT EXISTS responses_presentation_idx ON responses (presentation_id)",
  "CREATE INDEX IF NOT EXISTS responses_question_idx ON responses (question_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS responses_question_participant_idx ON responses (question_id, participant_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS participant_profiles_presentation_participant_idx ON participant_profiles (presentation_id, participant_id)",
  "CREATE INDEX IF NOT EXISTS participant_profiles_presentation_idx ON participant_profiles (presentation_id)",
];

let client: Database | null = null;
let schemaReady: Promise<void> | null = null;

function getDatabaseUrl() {
  return process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
}

function getSql() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new AppError(
      500,
      "Supabase database URL ontbreekt. Zet SUPABASE_DATABASE_URL, DATABASE_URL of POSTGRES_URL in je Vercel environment variables."
    );
  }

  client ??= postgres(databaseUrl, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: Number(process.env.POSTGRES_POOL_SIZE ?? 5),
    prepare: false,
  });

  return client;
}

export async function ensureSchema() {
  const sql = getSql();

  schemaReady ??= (async () => {
    for (const statement of schemaStatements) {
      await sql.unsafe(statement);
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  await schemaReady;
}

function first<T>(rows: T[]) {
  return rows[0] ?? null;
}

function numberFromDb(value: unknown) {
  return Number(value ?? 0);
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function makePresenterKey() {
  return crypto.randomUUID().replaceAll("-", "");
}

function makeCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultilineText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanPositiveInteger(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return Math.min(Math.floor(numberValue), max);
}

function cleanClientSequence(value: unknown) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.min(Math.floor(numberValue), 1_000_000_000);
}

function parseTimestampMs(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeClientSelectedAt(value: unknown, serverNowMs: number) {
  const parsed = parseTimestampMs(value);
  if (parsed === null || parsed > serverNowMs + 1000) {
    return {
      iso: new Date(serverNowMs).toISOString(),
      ms: serverNowMs,
      fromClient: false,
    };
  }

  return {
    iso: new Date(parsed).toISOString(),
    ms: parsed,
    fromClient: true,
  };
}

function parseQuestionContent(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeQuestionContent(payload: Record<string, unknown>, type: QuestionType) {
  const incoming =
    payload.content && typeof payload.content === "object" && !Array.isArray(payload.content)
      ? (payload.content as Record<string, unknown>)
      : {};
  const kind = cleanText(incoming.kind ?? payload.kind, 50) || type;
  const description = cleanMultilineText(incoming.description ?? payload.description, 500);
  const slideBody = cleanMultilineText(incoming.slideBody ?? payload.slideBody, 900);
  const imageUrl = cleanText(incoming.imageUrl ?? payload.imageUrl, 500);
  const required = incoming.required ?? payload.required;
  const timeLimitSeconds = cleanPositiveInteger(incoming.timeLimitSeconds ?? payload.timeLimitSeconds, 3600);
  const points = cleanPositiveInteger(incoming.points ?? payload.points, 1000);
  const normalized: Record<string, unknown> = { kind };

  if (description) {
    normalized.description = description;
  }
  if (slideBody) {
    normalized.slideBody = slideBody;
  }
  if (imageUrl) {
    normalized.imageUrl = imageUrl;
  }
  if (typeof required === "boolean") {
    normalized.required = required;
  }
  if (timeLimitSeconds !== null) {
    normalized.timeLimitSeconds = timeLimitSeconds;
  }
  if (points !== null) {
    normalized.points = points;
  }

  return JSON.stringify(normalized);
}

function cleanEmail(value: unknown) {
  return cleanText(value, 254).toLowerCase();
}

export function betaMaxAccounts() {
  const configured = Number(process.env.BETA_MAX_ACCOUNTS ?? 5);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 5;
}

export function betaMaxPresentations() {
  const configured = Number(process.env.BETA_MAX_PRESENTATIONS ?? 2);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 2;
}

export function betaMaxQuestions() {
  const configured = Number(process.env.BETA_MAX_QUESTIONS ?? 12);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 12;
}

function isAdminActor(actor?: ModeratorActor | null) {
  return actor?.role === "admin";
}

function ownerMatches(row: PresentationRow, actor?: ModeratorActor | null) {
  return isAdminActor(actor) || Boolean(actor?.userId && row.owner_user_id === actor.userId);
}

function isChoiceQuestion(type: QuestionType) {
  return type === "multiple" || type === "quiz";
}

function normalizeOptionInputs(optionsInput: unknown, type: QuestionType) {
  if (!Array.isArray(optionsInput) || !isChoiceQuestion(type)) {
    return [];
  }

  const options = optionsInput
    .map((option) => {
      if (typeof option === "string") {
        return { label: cleanText(option, 90), isCorrect: false };
      }

      if (option && typeof option === "object") {
        const record = option as { label?: unknown; isCorrect?: unknown };
        return {
          label: cleanText(record.label, 90),
          isCorrect: Boolean(record.isCorrect),
        };
      }

      return { label: "", isCorrect: false };
    })
    .filter((option) => option.label)
    .slice(0, 8);

  if (type === "multiple") {
    return options.map((option) => ({ ...option, isCorrect: false }));
  }

  return options;
}

function validateChoiceOptions(type: QuestionType, options: OptionInput[]) {
  if (!isChoiceQuestion(type)) {
    return;
  }

  if (options.length < 2) {
    throw new AppError(
      400,
      type === "quiz"
        ? "Een quizvraag heeft minimaal twee opties nodig."
        : "Een multiple choice vraag heeft minimaal twee opties nodig."
    );
  }

  if (type === "quiz" && options.filter((option) => option.isCorrect).length !== 1) {
    throw new AppError(400, "Kies precies een juist antwoord voor de quizvraag.");
  }
}

function normalizeCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

function mapPresentation(row: PresentationRow) {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    presenterKey: row.presenter_key,
    presentationType: row.presentation_type ?? "interactive",
    workflowStatus: row.workflow_status ?? "concept",
    publishedAt: row.published_at,
    idleScreenText: row.idle_screen_text || "Sessie Interactief",
    generalScreenBackgroundColor: normalizeHexColor(row.general_screen_background_color),
    generalScreenFontFamily: normalizeGeneralScreenFontFamily(row.general_screen_font_family),
    generalScreenFontSize: normalizeGeneralScreenFontSize(row.general_screen_font_size),
    activeQuestionId: row.active_question_id,
    screenQuestionId: row.screen_question_id,
    screenView: row.screen_view ?? "question",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildQuestions(
  questionRows: QuestionRow[],
  optionRows: OptionRow[],
  responseRows: ResponseRow[]
) {
  return questionRows.map((question) => {
    const content = parseQuestionContent(question.content_json);
    const kind = cleanText(content.kind, 50) || question.type;
    const description = cleanMultilineText(content.description, 500);
    const responses = responseRows.filter((response) => response.question_id === question.id);
    const options = optionRows
      .filter((option) => option.question_id === question.id)
      .map((option) => {
        const count = responses.filter((response) => response.option_id === option.id).length;
        return {
          id: option.id,
          label: option.label,
          position: option.position,
          isCorrect: Boolean(option.is_correct),
          count,
          percentage: responses.length ? Math.round((count / responses.length) * 100) : 0,
        };
      });
    const correctCount =
      question.type === "quiz"
        ? options.filter((option) => option.isCorrect).reduce((total, option) => total + option.count, 0)
        : 0;

    return {
      id: question.id,
      type: question.type,
      kind,
      prompt: question.prompt,
      description,
      content,
      status: question.status,
      position: question.position,
      finalized: Boolean(question.finalized_at),
      answerCount: responses.length,
      correctCount,
      correctPercentage: responses.length ? Math.round((correctCount / responses.length) * 100) : 0,
      options,
      responses: responses.map((response) => ({
        id: response.id,
        participantName: response.participant_name,
        optionId: response.option_id,
        optionLabel: response.option_label,
        textAnswer: response.text_answer,
        createdAt: response.created_at,
      })),
    };
  });
}

function profileDisplayName(profile: ParticipantProfileRow) {
  return profile.display_name || `Deelnemer ${profile.display_index}`;
}

function buildParticipantLabels(responseRows: ResponseRow[], profileRows: ParticipantProfileRow[] = []) {
  const participantLabels = new Map<string, string>();

  for (const profile of [...profileRows].sort(
    (left, right) => left.display_index - right.display_index || left.created_at.localeCompare(right.created_at)
  )) {
    participantLabels.set(profile.participant_id, profileDisplayName(profile));
  }

  const firstSeen = new Map<string, { createdAt: string; label: string }>();

  for (const response of [...responseRows].reverse()) {
    if (!participantLabels.has(response.participant_id) && !firstSeen.has(response.participant_id)) {
      const responseName =
        response.participant_name && response.participant_name !== "Anoniem" ? response.participant_name : "";
      firstSeen.set(response.participant_id, {
        createdAt: response.created_at,
        label: responseName,
      });
    }
  }

  const fallbackStart = participantLabels.size + 1;

  [...firstSeen.entries()]
    .sort((left, right) => left[1].createdAt.localeCompare(right[1].createdAt) || left[0].localeCompare(right[0]))
    .forEach(([participantId, value], index) => {
      participantLabels.set(participantId, value.label || `Deelnemer ${fallbackStart + index}`);
    });

  return participantLabels;
}

function buildLeaderboard(
  questionRows: QuestionRow[],
  optionRows: OptionRow[],
  responseRows: ResponseRow[],
  profileRows: ParticipantProfileRow[] = []
): { leaderboard: LeaderboardEntry[]; quizTotals: QuizTotals; participantLabels: Map<string, string> } {
  const participantLabels = buildParticipantLabels(responseRows, profileRows);
  const quizQuestionIds = new Set(questionRows.filter((question) => question.type === "quiz").map((question) => question.id));
  const finalizedQuizQuestionIds = new Set(
    questionRows
      .filter((question) => question.type === "quiz" && question.finalized_at)
      .map((question) => question.id)
  );
  const correctOptionIds = new Set(
    optionRows.filter((option) => Boolean(option.is_correct)).map((option) => option.id)
  );
  const entryMap = new Map<string, { participantId: string; label: string; score: number; answered: number }>();

  for (const [participantId, label] of participantLabels.entries()) {
    entryMap.set(participantId, { participantId, label, score: 0, answered: 0 });
  }

  for (const response of responseRows) {
    if (!finalizedQuizQuestionIds.has(response.question_id)) {
      continue;
    }

    const entry =
      entryMap.get(response.participant_id) ??
      {
        participantId: response.participant_id,
        label: participantLabels.get(response.participant_id) ?? "Deelnemer",
        score: 0,
        answered: 0,
      };

    entry.answered += 1;
    if (response.option_id && correctOptionIds.has(response.option_id)) {
      entry.score += 1;
    }
    entryMap.set(response.participant_id, entry);
  }

  const sortedEntries = [...entryMap.values()]
    .filter((entry) => entry.answered > 0 || finalizedQuizQuestionIds.size > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, "nl-NL"));

  let previousScore: number | null = null;
  let previousRank = 0;

  const leaderboard = sortedEntries.map((entry, index) => {
    const rank = previousScore === entry.score ? previousRank : index + 1;
    previousScore = entry.score;
    previousRank = rank;
    return { ...entry, rank };
  });

  return {
    leaderboard,
    participantLabels,
    quizTotals: {
      total: quizQuestionIds.size,
      finalized: finalizedQuizQuestionIds.size,
      participants: leaderboard.length,
    },
  };
}

function hideCorrectAnswers(question: QuestionResult | null) {
  if (!question || question.type !== "quiz") {
    return question;
  }

  return {
    ...question,
    correctCount: 0,
    correctPercentage: 0,
    options: question.options.map((option) => ({
      ...option,
      isCorrect: false,
    })),
  };
}

async function fetchPresentationById(id: string) {
  const sql = getSql();
  const rows = await sql<PresentationRow[]>`SELECT * FROM presentations WHERE id = ${id}`;
  return first(rows);
}

async function fetchPresentationByCode(code: string) {
  const sql = getSql();
  const rows = await sql<PresentationRow[]>`SELECT * FROM presentations WHERE code = ${normalizeCode(code)}`;
  return first(rows);
}

async function fetchAccountByEmail(emailInput: unknown) {
  const email = cleanEmail(emailInput);
  if (!email) {
    return null;
  }

  const rows = await getSql()<AppAccountRow[]>`
    SELECT *
    FROM app_accounts
    WHERE email = ${email}
  `;
  return first(rows);
}

async function fetchAccountBySupabaseUserId(supabaseUserIdInput: unknown) {
  const supabaseUserId = cleanText(supabaseUserIdInput, 120);
  if (!supabaseUserId) {
    return null;
  }

  const rows = await getSql()<AppAccountRow[]>`
    SELECT *
    FROM app_accounts
    WHERE supabase_user_id = ${supabaseUserId}
    LIMIT 1
  `;
  return first(rows);
}

async function fetchAccountById(accountIdInput: unknown) {
  const accountId = cleanText(accountIdInput, 120);
  if (!accountId) {
    return null;
  }

  const rows = await getSql()<AppAccountRow[]>`
    SELECT *
    FROM app_accounts
    WHERE id = ${accountId}
  `;
  return first(rows);
}

async function fetchAccountForActor(actor: ModeratorActor) {
  if (!actor.userId && !actor.email) {
    return null;
  }

  const accountByUserId = await fetchAccountBySupabaseUserId(actor.userId);
  if (accountByUserId) {
    return accountByUserId;
  }

  return fetchAccountByEmail(actor.email);
}

function deletedAccountEmail(accountId: string) {
  return `deleted-${accountId}@deleted.local`;
}

async function countTesterAccounts() {
  const rows = await getSql()<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM app_accounts
    WHERE role = 'tester' AND status <> 'deleted'
  `;

  return numberFromDb(first(rows)?.count);
}

export async function assertActorAccountActive(actor: ModeratorActor) {
  await ensureSchema();

  if (isAdminActor(actor)) {
    return actor;
  }

  const account = await fetchAccountForActor(actor);
  if (!account || account.status === "deleted") {
    throw new AppError(401, "Dit gebruikersaccount bestaat niet meer.");
  }

  if (account.status === "deactivated") {
    throw new AppError(403, "Dit gebruikersaccount is tijdelijk gedeactiveerd door de beheerder.");
  }

  if (account.status !== "active") {
    throw new AppError(403, "Activeer eerst je account via de link in je e-mail.");
  }

  return actor;
}

export async function createPendingAccount(emailInput: unknown, supabaseUserIdInput?: unknown) {
  await ensureSchema();

  const email = cleanEmail(emailInput);
  if (!email || !email.includes("@")) {
    throw new AppError(400, "Vul een geldig e-mailadres in.");
  }

  const existing = await fetchAccountByEmail(email);
  if (existing) {
    if (existing.status === "deleted") {
      throw new AppError(403, "Dit account is verwijderd. Neem contact op met de beheerder.");
    }

    if (existing.status === "deactivated") {
      throw new AppError(403, "Dit account is tijdelijk gedeactiveerd door de beheerder.");
    }

    throw new AppError(409, "Er bestaat al een account met dit e-mailadres.");
  }

  const accountCount = await countTesterAccounts();
  const maxAccounts = betaMaxAccounts();
  if (accountCount >= maxAccounts) {
    throw new AppError(403, `Het maximum van ${maxAccounts} gebruikersaccounts is bereikt.`);
  }

  const supabaseUserId = cleanText(supabaseUserIdInput, 120) || null;
  const timestamp = nowIso();
  const rows = await getSql()<AppAccountRow[]>`
    INSERT INTO app_accounts (id, email, role, status, supabase_user_id, created_at, updated_at)
    VALUES (${makeId("acct")}, ${email}, 'tester', 'pending', ${supabaseUserId}, ${timestamp}, ${timestamp})
    RETURNING *
  `;

  return first(rows);
}

export async function updatePendingAccountSupabaseUserId(emailInput: unknown, supabaseUserIdInput: unknown) {
  await ensureSchema();

  const email = cleanEmail(emailInput);
  const supabaseUserId = cleanText(supabaseUserIdInput, 120) || null;

  if (!email) {
    throw new AppError(400, "Account kon niet worden bijgewerkt.");
  }

  const rows = await getSql()<AppAccountRow[]>`
    UPDATE app_accounts
    SET supabase_user_id = ${supabaseUserId}, updated_at = ${nowIso()}
    WHERE email = ${email} AND status = 'pending'
    RETURNING *
  `;

  return first(rows);
}

export async function deletePendingAccount(emailInput: unknown) {
  await ensureSchema();

  const email = cleanEmail(emailInput);
  if (!email) {
    return;
  }

  await getSql()`
    DELETE FROM app_accounts
    WHERE email = ${email} AND status = 'pending'
  `;
}

export async function activateAccount(emailInput: unknown, supabaseUserIdInput: unknown) {
  await ensureSchema();

  const email = cleanEmail(emailInput);
  const supabaseUserId = cleanText(supabaseUserIdInput, 120);

  if (!email || !supabaseUserId) {
    throw new AppError(400, "Account kon niet worden geactiveerd.");
  }

  const existingByEmail = await fetchAccountByEmail(email);
  const existingByUserId = await fetchAccountBySupabaseUserId(supabaseUserId);
  const blockedAccount = [existingByEmail, existingByUserId].find(
    (account) => account?.status === "deleted" || account?.status === "deactivated"
  );

  if (blockedAccount?.status === "deleted") {
    throw new AppError(403, "Dit account is verwijderd. Neem contact op met de beheerder.");
  }

  if (blockedAccount?.status === "deactivated") {
    throw new AppError(403, "Dit gebruikersaccount is tijdelijk gedeactiveerd door de beheerder.");
  }

  const existing = existingByEmail ?? existingByUserId;
  if (!existing) {
    const accountCount = await countTesterAccounts();
    const maxAccounts = betaMaxAccounts();
    if (accountCount >= maxAccounts) {
      throw new AppError(403, `Het maximum van ${maxAccounts} gebruikersaccounts is bereikt.`);
    }
  }

  const timestamp = nowIso();
  const rows = existing
    ? await getSql()<AppAccountRow[]>`
        UPDATE app_accounts
        SET status = 'active',
            email = ${email},
            supabase_user_id = ${supabaseUserId},
            updated_at = ${timestamp},
            last_login_at = ${timestamp}
        WHERE id = ${existing.id}
        RETURNING *
      `
    : await getSql()<AppAccountRow[]>`
        INSERT INTO app_accounts (id, email, role, status, supabase_user_id, created_at, updated_at, last_login_at)
        VALUES (${makeId("acct")}, ${email}, 'tester', 'active', ${supabaseUserId}, ${timestamp}, ${timestamp}, ${timestamp})
        RETURNING *
      `;

  return first(rows);
}

export async function listModeratorAccounts(): Promise<ModeratorAccountSummary[]> {
  await ensureSchema();

  const rows = await getSql()<
    Array<
      AppAccountRow & {
        presentation_count: number;
      }
    >
  >`
    SELECT
      app_accounts.*,
      (
        SELECT COUNT(*)::int
        FROM presentations
        WHERE presentations.owner_user_id = app_accounts.supabase_user_id
      ) AS presentation_count
    FROM app_accounts
    WHERE app_accounts.status <> 'deleted'
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    supabaseUserId: row.supabase_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    totals: {
      presentations: numberFromDb(row.presentation_count),
    },
  }));
}

export async function setModeratorAccountStatus(accountIdInput: unknown, status: Exclude<AppAccountStatus, "deleted">) {
  await ensureSchema();

  if (status !== "active" && status !== "deactivated" && status !== "pending") {
    throw new AppError(400, "Accountstatus is ongeldig.");
  }

  const accountId = cleanText(accountIdInput, 120);
  const account = await fetchAccountById(accountId);
  if (!account || account.status === "deleted") {
    throw new AppError(404, "Account niet gevonden.");
  }

  const rows = await getSql()<AppAccountRow[]>`
    UPDATE app_accounts
    SET status = ${status}, updated_at = ${nowIso()}
    WHERE id = ${account.id}
    RETURNING *
  `;

  return first(rows);
}

async function deletePresentationsForOwner(ownerUserId: string | null) {
  if (!ownerUserId) {
    return 0;
  }

  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    SELECT id
    FROM presentations
    WHERE owner_user_id = ${ownerUserId}
  `;

  if (!rows.length) {
    return 0;
  }

  await sql.begin(async (tx) => {
    for (const row of rows) {
      await tx`DELETE FROM responses WHERE presentation_id = ${row.id}`;
      await tx`
        DELETE FROM question_options
        WHERE question_id IN (
          SELECT id
          FROM questions
          WHERE presentation_id = ${row.id}
        )
      `;
      await tx`DELETE FROM questions WHERE presentation_id = ${row.id}`;
      await tx`DELETE FROM presentations WHERE id = ${row.id}`;
    }
  });

  return rows.length;
}

export async function deleteModeratorAccount(accountIdInput: unknown) {
  await ensureSchema();

  const account = await fetchAccountById(accountIdInput);
  if (!account || account.status === "deleted") {
    throw new AppError(404, "Account niet gevonden.");
  }

  const presentationsDeleted = await deletePresentationsForOwner(account.supabase_user_id);

  await getSql()`
    UPDATE app_accounts
    SET email = ${deletedAccountEmail(account.id)}, status = 'deleted', updated_at = ${nowIso()}
    WHERE id = ${account.id}
  `;

  return { account, presentationsDeleted };
}

export async function deleteOwnAccount(actor: ModeratorActor) {
  await ensureSchema();

  if (isAdminActor(actor)) {
    throw new AppError(403, "Het beheerderaccount kan hier niet worden verwijderd.");
  }

  const account = await fetchAccountForActor(actor);
  if (!account || account.status === "deleted") {
    throw new AppError(404, "Account niet gevonden.");
  }

  const presentationsDeleted = await deletePresentationsForOwner(account.supabase_user_id);

  await getSql()`
    UPDATE app_accounts
    SET email = ${deletedAccountEmail(account.id)}, status = 'deleted', updated_at = ${nowIso()}
    WHERE id = ${account.id}
  `;

  return { account, presentationsDeleted };
}

export async function getModeratorUsage(actor: ModeratorActor | null) {
  await ensureSchema();

  const accountCount = await countTesterAccounts();
  const presentationRows =
    actor?.role === "tester" && actor.userId
      ? await getSql()<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM presentations
          WHERE owner_user_id = ${actor.userId}
        `
      : await getSql()<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM presentations
        `;

  return {
    accountCount,
    presentationCount: numberFromDb(first(presentationRows)?.count),
    maxAccounts: betaMaxAccounts(),
    maxPresentations: actor?.role === "tester" ? betaMaxPresentations() : null,
    maxQuestions: actor?.role === "tester" ? betaMaxQuestions() : null,
  };
}

async function fetchQuestion(questionId: string) {
  const sql = getSql();
  const rows = await sql<QuestionRow[]>`SELECT * FROM questions WHERE id = ${questionId}`;
  return first(rows);
}

async function fetchParticipantProfile(presentationId: string, participantId: string) {
  const rows = await getSql()<ParticipantProfileRow[]>`
    SELECT *
    FROM participant_profiles
    WHERE presentation_id = ${presentationId} AND participant_id = ${participantId}
  `;

  return first(rows);
}

async function fetchParticipantProfiles(presentationId: string) {
  return getSql()<ParticipantProfileRow[]>`
    SELECT *
    FROM participant_profiles
    WHERE presentation_id = ${presentationId}
    ORDER BY display_index ASC, created_at ASC
  `;
}

async function getNextParticipantDisplayIndex(presentationId: string) {
  const rows = await getSql()<{ next_index: number }[]>`
    SELECT COALESCE(MAX(display_index), 0) + 1 AS next_index
    FROM participant_profiles
    WHERE presentation_id = ${presentationId}
  `;

  return numberFromDb(first(rows)?.next_index) || 1;
}

async function upsertParticipantProfile(
  presentationId: string,
  participantIdInput: unknown,
  displayNameInput: unknown,
  anonymousInput: unknown
) {
  const participantId = cleanText(participantIdInput, 80);
  if (!participantId) {
    throw new AppError(400, "Deelnemer kon niet worden herkend. Scan de QR-code opnieuw.");
  }

  const sql = getSql();
  const existing = await fetchParticipantProfile(presentationId, participantId);
  const isAnonymous = anonymousInput !== false;
  const typedName = cleanText(displayNameInput, 60);

  if (!isAnonymous && !typedName) {
    throw new AppError(400, "Vul een naam in of kies voor anoniem deelnemen.");
  }

  const displayIndex = existing?.display_index ?? (await getNextParticipantDisplayIndex(presentationId));
  const displayName = isAnonymous ? `Deelnemer ${displayIndex}` : typedName;
  const timestamp = nowIso();
  const rows = existing
    ? await sql<ParticipantProfileRow[]>`
        UPDATE participant_profiles
        SET display_name = ${displayName},
            is_anonymous = ${isAnonymous},
            display_index = ${displayIndex},
            updated_at = ${timestamp}
        WHERE id = ${existing.id}
        RETURNING *
      `
    : await sql<ParticipantProfileRow[]>`
        INSERT INTO participant_profiles (
          id,
          presentation_id,
          participant_id,
          display_name,
          is_anonymous,
          display_index,
          created_at,
          updated_at
        )
        VALUES (
          ${makeId("ptc")},
          ${presentationId},
          ${participantId},
          ${displayName},
          ${isAnonymous},
          ${displayIndex},
          ${timestamp},
          ${timestamp}
        )
        RETURNING *
      `;
  const profile = first(rows);

  await sql`
    UPDATE responses
    SET participant_name = ${displayName}, updated_at = ${timestamp}
    WHERE presentation_id = ${presentationId} AND participant_id = ${participantId}
  `;

  return profile;
}

async function getNextPosition(presentationId: string) {
  const sql = getSql();
  const rows = await sql<{ next_position: number }[]>`
    SELECT COALESCE(MAX(position), 0) + 1 AS next_position
    FROM questions
    WHERE presentation_id = ${presentationId}
  `;

  return numberFromDb(first(rows)?.next_position) || 1;
}

async function normalizeQuestionPositions(presentationId: string) {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    SELECT id
    FROM questions
    WHERE presentation_id = ${presentationId}
    ORDER BY position ASC, created_at ASC
  `;

  if (!rows.length) {
    return;
  }

  const timestamp = nowIso();
  await sql.begin(async (tx) => {
    for (const [index, row] of rows.entries()) {
      await tx`
        UPDATE questions
        SET position = ${index + 1}, updated_at = ${timestamp}
        WHERE id = ${row.id}
      `;
    }
  });
}

async function assertPresenter(presentationId: string, presenterKey: string) {
  await ensureSchema();

  const presentation = await fetchPresentationById(presentationId);
  if (!presentation) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

  if (!presenterKey || presenterKey !== presentation.presenter_key) {
    throw new AppError(401, "Beheersleutel ongeldig of ontbreekt.");
  }

  return presentation;
}

async function insertQuestion(
  presentationId: string,
  type: QuestionType,
  prompt: string,
  options: OptionInput[],
  openImmediately: boolean,
  contentJson: string | null = null
) {
  const sql = getSql();
  const id = makeId("q");
  const position = await getNextPosition(presentationId);
  const status: QuestionStatus = openImmediately ? "open" : "closed";
  const timestamp = nowIso();
  const insertContentJson = openImmediately
    ? JSON.stringify(buildLiveQuestionContent(parseQuestionContent(contentJson), type, timestamp))
    : contentJson;

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO questions (id, presentation_id, type, prompt, content_json, status, position, created_at, updated_at)
      VALUES (${id}, ${presentationId}, ${type}, ${prompt}, ${insertContentJson}, ${status}, ${position}, ${timestamp}, ${timestamp})
    `;

    if (isChoiceQuestion(type)) {
      for (const [index, option] of options.entries()) {
        await tx`
          INSERT INTO question_options (id, question_id, label, position, is_correct)
          VALUES (${makeId("opt")}, ${id}, ${option.label}, ${index + 1}, ${option.isCorrect})
        `;
      }
    }

    if (openImmediately) {
      await tx`
        UPDATE presentations
        SET active_question_id = ${id}, screen_question_id = ${id}, screen_view = 'question', updated_at = ${timestamp}
        WHERE id = ${presentationId}
      `;
    }
  });

  return id;
}

export async function createPresentation(
  titleInput: unknown,
  templateInput: unknown = "default",
  actor: ModeratorActor = { role: "admin", userId: null, email: null },
  options: { presentationType?: unknown; workflowStatus?: unknown } = {}
) {
  await ensureSchema();

  const sql = getSql();
  const title = cleanText(titleInput, 90) || "Sessie Interactief";
  const template: PresentationTemplate =
    templateInput === "quiz" ? "quiz" : templateInput === "blank" ? "blank" : "default";
  const presentationType =
    template === "quiz" ? "quiz" : normalizePresentationKind(options.presentationType);
  const workflowStatus =
    options.workflowStatus === "completed" || options.workflowStatus === "published"
      ? normalizeWorkflowStatus(options.workflowStatus)
      : template === "blank"
        ? "concept"
        : "published";
  const id = makeId("prs");
  const presenterKey = makePresenterKey();
  const timestamp = nowIso();
  const publishedAt = workflowStatus === "published" ? timestamp : null;
  let code = makeCode();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const existing = await fetchPresentationByCode(code);
    if (!existing) {
      break;
    }
    code = makeCode();
  }

  if (!isAdminActor(actor)) {
    if (!actor.userId || !actor.email) {
      throw new AppError(401, "Log opnieuw in om een presentatie aan te maken.");
    }

    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM presentations
      WHERE owner_user_id = ${actor.userId}
    `;
    const currentCount = numberFromDb(first(rows)?.count);
    const maxPresentations = betaMaxPresentations();

    if (currentCount >= maxPresentations) {
      throw new AppError(403, `Je kunt maximaal ${maxPresentations} presentaties of quizzen aanmaken.`);
    }
  }

  await sql`
    INSERT INTO presentations (
      id,
      title,
      code,
      presenter_key,
      owner_user_id,
      owner_email,
      presentation_type,
      workflow_status,
      published_at,
      active_question_id,
      screen_question_id,
      screen_view,
      created_at,
      updated_at
    )
    VALUES (
      ${id},
      ${title},
      ${code},
      ${presenterKey},
      ${actor.userId},
      ${actor.email},
      ${presentationType},
      ${workflowStatus},
      ${publishedAt},
      NULL,
      NULL,
      'question',
      ${timestamp},
      ${timestamp}
    )
  `;

  if (template === "blank") {
    return getPresenterPayload(id, presenterKey);
  }

  if (template === "quiz") {
    await insertQuestion(
      id,
      "quiz",
      "Voorbeeld quizvraag: welk antwoord is juist?",
      [
        { label: "Antwoord A", isCorrect: true },
        { label: "Antwoord B", isCorrect: false },
        { label: "Antwoord C", isCorrect: false },
        { label: "Antwoord D", isCorrect: false },
      ],
      true
    );
  } else {
    await insertQuestion(id, "open", "Wat wil je vandaag zeker bespreken?", [], true);
    await insertQuestion(
      id,
      "multiple",
      "Waar wil je vandaag de meeste focus op leggen?",
      ["Wedstrijdanalyse", "Training", "Spelersontwikkeling", "Teamafspraken"].map((label) => ({
        label,
        isCorrect: false,
      })),
      false
    );
  }

  return getPresenterPayload(id, presenterKey);
}

export async function getPresenterPayload(presentationId: string, presenterKey: string): Promise<PresenterPayload> {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const sql = getSql();

  const [questionRows, optionRows, responseRows, participantRows, profileRows] = await Promise.all([
    sql<QuestionRow[]>`
      SELECT *
      FROM questions
      WHERE presentation_id = ${presentationId}
      ORDER BY position ASC, created_at ASC
    `,
    sql<OptionRow[]>`
      SELECT question_options.*
      FROM question_options
      INNER JOIN questions ON questions.id = question_options.question_id
      WHERE questions.presentation_id = ${presentationId}
      ORDER BY question_options.position ASC
    `,
    sql<ResponseRow[]>`
      SELECT responses.*, question_options.label AS option_label
      FROM responses
      LEFT JOIN question_options ON question_options.id = responses.option_id
      WHERE responses.presentation_id = ${presentationId}
      ORDER BY responses.created_at DESC
    `,
    sql<{ count: number }[]>`
      SELECT COUNT(DISTINCT participant_id)::int AS count
      FROM responses
      WHERE presentation_id = ${presentationId}
    `,
    fetchParticipantProfiles(presentationId),
  ]);

  const questions = buildQuestions(questionRows, optionRows, responseRows);
  const { leaderboard, quizTotals } = buildLeaderboard(questionRows, optionRows, responseRows, profileRows);

  return {
    presentation: mapPresentation(presentation),
    questions,
    activeQuestion:
      questions.find((question) => question.id === presentation.active_question_id && question.status === "open") ??
      null,
    leaderboard,
    quizTotals,
    totals: {
      questions: questions.length,
      answers: responseRows.length,
      participants: Math.max(profileRows.length, numberFromDb(first(participantRows)?.count)),
    },
  };
}

export async function getPresenterKeyForModerator(
  presentationId: string,
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
) {
  await ensureSchema();

  const presentation = await fetchPresentationById(presentationId);
  if (!presentation) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

  if (!ownerMatches(presentation, actor)) {
    throw new AppError(403, "Je hebt geen toegang tot deze presentatie.");
  }

  return presentation.presenter_key;
}

export async function updatePresentationSettings(
  presentationId: string,
  presenterKey: string,
  payload: {
    idleScreenText?: unknown;
    generalScreenBackgroundColor?: unknown;
    generalScreenFontFamily?: unknown;
    generalScreenFontSize?: unknown;
    title?: unknown;
    presentationType?: unknown;
    workflowStatus?: unknown;
  }
) {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const title = payload.title === undefined ? presentation.title : cleanText(payload.title, 90);
  if (!title) {
    throw new AppError(400, "Titel is verplicht.");
  }

  const idleScreenText =
    payload.idleScreenText === undefined
      ? presentation.idle_screen_text
      : cleanText(payload.idleScreenText, 90) || null;
  let generalScreenBackgroundColor =
    payload.generalScreenBackgroundColor === undefined
      ? normalizeHexColor(presentation.general_screen_background_color)
      : normalizeGeneralScreenBackgroundColor(payload.generalScreenBackgroundColor);
  if (
    payload.generalScreenBackgroundColor !== undefined &&
    payload.generalScreenBackgroundColor !== null &&
    String(payload.generalScreenBackgroundColor).trim() &&
    !normalizeHexColor(payload.generalScreenBackgroundColor)
  ) {
    throw new AppError(400, "Gebruik een geldige HEX-kleur, bijvoorbeeld #00963E.");
  }
  generalScreenBackgroundColor ??= null;
  const generalScreenFontFamily =
    payload.generalScreenFontFamily === undefined
      ? normalizeGeneralScreenFontFamily(presentation.general_screen_font_family)
      : normalizeGeneralScreenFontFamily(payload.generalScreenFontFamily);
  if (
    payload.generalScreenFontFamily !== undefined &&
    payload.generalScreenFontFamily !== null &&
    String(payload.generalScreenFontFamily).trim() &&
    resolveGeneralScreenFontFamily(payload.generalScreenFontFamily) !== payload.generalScreenFontFamily
  ) {
    throw new AppError(400, "Kies een bekend lettertype uit de lijst.");
  }
  const generalScreenFontSize =
    payload.generalScreenFontSize === undefined
      ? normalizeGeneralScreenFontSize(presentation.general_screen_font_size)
      : normalizeGeneralScreenFontSize(payload.generalScreenFontSize);
  if (!isValidGeneralScreenFontSize(payload.generalScreenFontSize)) {
    throw new AppError(400, "Kies een geldige lettergrootte.");
  }
  const presentationType =
    payload.presentationType === undefined
      ? presentation.presentation_type ?? "interactive"
      : normalizePresentationKind(payload.presentationType);
  const workflowStatus =
    payload.workflowStatus === undefined
      ? presentation.workflow_status ?? "concept"
      : normalizeWorkflowStatus(payload.workflowStatus);
  const publishedAt =
    workflowStatus === "published"
      ? presentation.published_at ?? nowIso()
      : workflowStatus === "concept"
        ? null
        : presentation.published_at;

  await getSql()`
    UPDATE presentations
    SET
      title = ${title},
      idle_screen_text = ${idleScreenText},
      general_screen_background_color = ${generalScreenBackgroundColor},
      general_screen_font_family = ${generalScreenFontFamily},
      general_screen_font_size = ${generalScreenFontSize},
      presentation_type = ${presentationType},
      workflow_status = ${workflowStatus},
      published_at = ${publishedAt},
      updated_at = ${nowIso()}
    WHERE id = ${presentationId}
  `;

  return getPresenterPayload(presentationId, presenterKey);
}

export async function addQuestion(
  presentationId: string,
  presenterKey: string,
  payload: Record<string, unknown>,
  limits: { maxQuestions?: number | null } = {}
) {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const type: QuestionType =
    payload.type === "multiple"
      ? "multiple"
      : payload.type === "quiz"
        ? "quiz"
        : payload.type === "slide"
          ? "slide"
          : "open";
  const prompt = cleanText(payload.prompt, 180);

  if (!prompt) {
    throw new AppError(400, type === "slide" ? "Titel van de slide is verplicht." : "Vraagtekst is verplicht.");
  }

  const options = normalizeOptionInputs(payload.options, type);
  validateChoiceOptions(type, options);
  const contentJson = normalizeQuestionContent(payload, type);

  const maxQuestions = limits.maxQuestions ?? (presentation.owner_user_id ? betaMaxQuestions() : null);
  if (maxQuestions) {
    const rows = await getSql()<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM questions
      WHERE presentation_id = ${presentationId}
    `;
    const currentCount = numberFromDb(first(rows)?.count);

    if (currentCount >= maxQuestions) {
      throw new AppError(403, `Je kunt maximaal ${maxQuestions} vragen in deze presentatie aanmaken.`);
    }
  }

  const openImmediately =
    !presentation.active_question_id && (presentation.workflow_status ?? "published") === "published";
  await insertQuestion(presentation.id, type, prompt, options, openImmediately, contentJson);
  return getPresenterPayload(presentationId, presenterKey);
}

export async function deleteQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string
) {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const question = await fetchQuestion(questionId);

  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }

  const sql = getSql();
  const timestamp = nowIso();
  const isActiveQuestion = presentation.active_question_id === questionId;
  const isScreenQuestion = presentation.screen_question_id === questionId;

  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM responses
      WHERE presentation_id = ${presentationId} AND question_id = ${questionId}
    `;
    await tx`DELETE FROM question_options WHERE question_id = ${questionId}`;
    await tx`
      DELETE FROM questions
      WHERE id = ${questionId} AND presentation_id = ${presentationId}
    `;

    if (isActiveQuestion || isScreenQuestion) {
      await tx`
        UPDATE presentations
        SET
          active_question_id = CASE WHEN active_question_id = ${questionId} THEN NULL ELSE active_question_id END,
          screen_question_id = CASE WHEN screen_question_id = ${questionId} THEN NULL ELSE screen_question_id END,
          screen_view = CASE WHEN active_question_id = ${questionId} OR screen_question_id = ${questionId} THEN 'question' ELSE screen_view END,
          updated_at = ${timestamp}
        WHERE id = ${presentationId}
      `;
    }
  });

  await normalizeQuestionPositions(presentationId);
  return getPresenterPayload(presentationId, presenterKey);
}

export async function updateQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string,
  payload: Record<string, unknown>
) {
  await assertPresenter(presentationId, presenterKey);
  const question = await fetchQuestion(questionId);

  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }

  const prompt = cleanText(payload.prompt, 180);
  if (!prompt) {
    throw new AppError(400, question.type === "slide" ? "Titel van de slide is verplicht." : "Vraagtekst is verplicht.");
  }

  const optionInputs = normalizeOptionInputs(payload.options, question.type);
  validateChoiceOptions(question.type, optionInputs);
  const contentJson = normalizeQuestionContent(
    payload.content === undefined ? { ...payload, content: parseQuestionContent(question.content_json) } : payload,
    question.type
  );

  const sql = getSql();
  const timestamp = nowIso();
  const current =
    isChoiceQuestion(question.type)
      ? await sql<OptionRow[]>`
          SELECT *
          FROM question_options
          WHERE question_id = ${questionId}
          ORDER BY position ASC
        `
      : [];

  await sql.begin(async (tx) => {
    await tx`
      UPDATE questions
      SET prompt = ${prompt}, content_json = ${contentJson}, updated_at = ${timestamp}
      WHERE id = ${questionId} AND presentation_id = ${presentationId}
    `;

    if (isChoiceQuestion(question.type)) {
      for (const [index, option] of optionInputs.entries()) {
        const existing = current[index];
        if (existing) {
          await tx`
            UPDATE question_options
            SET label = ${option.label}, position = ${index + 1}, is_correct = ${option.isCorrect}
            WHERE id = ${existing.id}
          `;
        } else {
          await tx`
            INSERT INTO question_options (id, question_id, label, position, is_correct)
            VALUES (${makeId("opt")}, ${questionId}, ${option.label}, ${index + 1}, ${option.isCorrect})
          `;
        }
      }

      for (const removed of current.slice(optionInputs.length)) {
        await tx`
          DELETE FROM responses
          WHERE question_id = ${questionId} AND option_id = ${removed.id}
        `;
        await tx`DELETE FROM question_options WHERE id = ${removed.id}`;
      }
    }
  });

  return getPresenterPayload(presentationId, presenterKey);
}

export async function moveQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string,
  direction: "up" | "down"
) {
  await assertPresenter(presentationId, presenterKey);
  const question = await fetchQuestion(questionId);

  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }

  const sql = getSql();
  const target =
    direction === "up"
      ? first(
          await sql<QuestionRow[]>`
            SELECT *
            FROM questions
            WHERE presentation_id = ${presentationId} AND position < ${question.position}
            ORDER BY position DESC
            LIMIT 1
          `
        )
      : first(
          await sql<QuestionRow[]>`
            SELECT *
            FROM questions
            WHERE presentation_id = ${presentationId} AND position > ${question.position}
            ORDER BY position ASC
            LIMIT 1
          `
        );

  if (!target) {
    return getPresenterPayload(presentationId, presenterKey);
  }

  const timestamp = nowIso();
  await sql.begin(async (tx) => {
    await tx`
      UPDATE questions
      SET position = ${target.position}, updated_at = ${timestamp}
      WHERE id = ${question.id}
    `;
    await tx`
      UPDATE questions
      SET position = ${question.position}, updated_at = ${timestamp}
      WHERE id = ${target.id}
    `;
  });

  return getPresenterPayload(presentationId, presenterKey);
}

export async function setActiveQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string | null
) {
  await assertPresenter(presentationId, presenterKey);
  const sql = getSql();
  const timestamp = nowIso();

  if (!questionId) {
    await sql.begin(async (tx) => {
      await tx`
        UPDATE questions
        SET status = 'closed', updated_at = ${timestamp}
        WHERE presentation_id = ${presentationId}
      `;
      await tx`
        UPDATE presentations
        SET active_question_id = NULL, screen_question_id = NULL, screen_view = 'question', updated_at = ${timestamp}
        WHERE id = ${presentationId}
      `;
    });

    return getPresenterPayload(presentationId, presenterKey);
  }

  const question = await fetchQuestion(questionId);
  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }
  const liveContentJson = JSON.stringify(
    buildLiveQuestionContent(parseQuestionContent(question.content_json), question.type, timestamp)
  );

  await sql.begin(async (tx) => {
    await tx`
      UPDATE questions
      SET status = 'closed', updated_at = ${timestamp}
      WHERE presentation_id = ${presentationId}
    `;
    await tx`
      UPDATE questions
      SET
        status = 'open',
        content_json = ${liveContentJson},
        finalized_at = CASE WHEN type = 'quiz' THEN NULL ELSE finalized_at END,
        updated_at = ${timestamp}
      WHERE id = ${questionId}
    `;
    await tx`
      UPDATE presentations
      SET active_question_id = ${questionId}, screen_question_id = ${questionId}, screen_view = 'question', updated_at = ${timestamp}
      WHERE id = ${presentationId}
    `;
  });

  return getPresenterPayload(presentationId, presenterKey);
}

export async function resetPresentationFlow(
  presentationId: string,
  presenterKey: string
) {
  await assertPresenter(presentationId, presenterKey);
  const sql = getSql();
  const timestamp = nowIso();

  await sql.begin(async (tx) => {
    await tx`
      UPDATE questions
      SET
        status = 'closed',
        finalized_at = CASE WHEN type = 'quiz' THEN NULL ELSE finalized_at END,
        updated_at = ${timestamp}
      WHERE presentation_id = ${presentationId}
    `;
    await tx`
      UPDATE presentations
      SET active_question_id = NULL, screen_question_id = NULL, screen_view = 'question', updated_at = ${timestamp}
      WHERE id = ${presentationId}
    `;
  });

  return getPresenterPayload(presentationId, presenterKey);
}

export async function setScreenView(
  presentationId: string,
  presenterKey: string,
  screenView: ScreenView,
  questionId: string | null = null
) {
  await assertPresenter(presentationId, presenterKey);

  if (screenView !== "question" && screenView !== "qr" && screenView !== "results" && screenView !== "ranking") {
    throw new AppError(400, "Ongeldige schermweergave.");
  }

  let resultsQuestion: QuestionRow | null = null;
  if (screenView === "results") {
    if (!questionId) {
      throw new AppError(400, "Kies een vraag om resultaten te tonen.");
    }

    const question = await fetchQuestion(questionId);
    if (!question || question.presentation_id !== presentationId) {
      throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
    }
    resultsQuestion = question;
  }

  const sql = getSql();
  const timestamp = nowIso();

  if (screenView === "results" && resultsQuestion?.type === "quiz") {
    await sql.begin(async (tx) => {
      await tx`
        UPDATE questions
        SET status = 'closed', finalized_at = COALESCE(finalized_at, ${timestamp}), updated_at = ${timestamp}
        WHERE id = ${resultsQuestion.id}
      `;
      await tx`
        UPDATE presentations
        SET
          active_question_id = CASE WHEN active_question_id = ${resultsQuestion.id} THEN NULL ELSE active_question_id END,
          screen_view = ${screenView},
          screen_question_id = ${questionId},
          updated_at = ${timestamp}
        WHERE id = ${presentationId}
      `;
    });
  } else {
    await sql`
      UPDATE presentations
      SET screen_view = ${screenView}, screen_question_id = ${screenView === "results" ? questionId : null}, updated_at = ${timestamp}
      WHERE id = ${presentationId}
    `;
  }

  return getPresenterPayload(presentationId, presenterKey);
}

export async function resetAnswers(
  presentationId: string,
  presenterKey: string,
  questionId: string | null
) {
  await assertPresenter(presentationId, presenterKey);
  const sql = getSql();

  if (questionId) {
    const question = await fetchQuestion(questionId);
    if (!question || question.presentation_id !== presentationId) {
      throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
    }

    await sql`
      DELETE FROM responses
      WHERE presentation_id = ${presentationId} AND question_id = ${questionId}
    `;
    await sql`
      UPDATE questions
      SET finalized_at = NULL, status = 'closed', updated_at = ${nowIso()}
      WHERE presentation_id = ${presentationId} AND id = ${questionId} AND type = 'quiz'
    `;
  } else {
    await sql`DELETE FROM responses WHERE presentation_id = ${presentationId}`;
    await sql`
      UPDATE questions
      SET finalized_at = NULL, status = 'closed', updated_at = ${nowIso()}
      WHERE presentation_id = ${presentationId} AND type = 'quiz'
    `;
  }

  return getPresenterPayload(presentationId, presenterKey);
}

export async function getPublicSession(codeInput: string, participantIdInput?: unknown): Promise<PublicSessionPayload> {
  await ensureSchema();

  const presentation = await fetchPresentationByCode(codeInput);
  if (!presentation) {
    throw new AppError(404, "Sessie niet gevonden.");
  }

  const sql = getSql();
  const [questionRows, optionRows, responseRows, profileRows] = await Promise.all([
    sql<QuestionRow[]>`
      SELECT *
      FROM questions
      WHERE presentation_id = ${presentation.id}
      ORDER BY position ASC, created_at ASC
    `,
    sql<OptionRow[]>`
      SELECT question_options.*
      FROM question_options
      INNER JOIN questions ON questions.id = question_options.question_id
      WHERE questions.presentation_id = ${presentation.id}
      ORDER BY question_options.position ASC
    `,
    sql<ResponseRow[]>`
      SELECT responses.*, question_options.label AS option_label
      FROM responses
      LEFT JOIN question_options ON question_options.id = responses.option_id
      WHERE responses.presentation_id = ${presentation.id}
      ORDER BY responses.created_at DESC
    `,
    fetchParticipantProfiles(presentation.id),
  ]);

  const questions = buildQuestions(questionRows, optionRows, responseRows);
  const { leaderboard, quizTotals, participantLabels } = buildLeaderboard(
    questionRows,
    optionRows,
    responseRows,
    profileRows
  );
  const activeQuestion =
    questions.find((question) => question.id === presentation.active_question_id && question.status === "open") ??
    null;
  const screenQuestion = questions.find((question) => question.id === presentation.screen_question_id) ?? null;
  const participantId = cleanText(participantIdInput, 80);
  const participantLabel = participantId ? participantLabels.get(participantId) ?? null : null;
  const correctOption =
    presentation.screen_view === "results" && screenQuestion?.type === "quiz"
      ? screenQuestion.options.find((option) => option.isCorrect) ?? null
      : null;
  const participantResponse =
    participantId && screenQuestion?.type === "quiz" && presentation.screen_view === "results"
      ? responseRows.find(
          (response) => response.question_id === screenQuestion.id && response.participant_id === participantId
        ) ?? null
      : null;
  const participantOption =
    participantResponse?.option_id && screenQuestion
      ? screenQuestion.options.find((option) => option.id === participantResponse.option_id) ?? null
      : null;
  const participantResult =
    screenQuestion?.type === "quiz" && presentation.screen_view === "results" && participantResponse
      ? {
          questionId: screenQuestion.id,
          optionId: participantResponse.option_id,
          optionLabel: participantOption?.label ?? participantResponse.option_label,
          optionPosition: participantOption?.position ?? null,
          isCorrect: participantOption ? participantOption.isCorrect : null,
          correctOptionId: correctOption?.id ?? null,
          correctOptionLabel: correctOption?.label ?? null,
          correctOptionPosition: correctOption?.position ?? null,
        }
      : null;

  return {
    presentation: {
      id: presentation.id,
      title: presentation.title,
      code: presentation.code,
      presentationType: presentation.presentation_type ?? "interactive",
      workflowStatus: presentation.workflow_status ?? "concept",
      idleScreenText: presentation.idle_screen_text || "Sessie Interactief",
      generalScreenBackgroundColor: normalizeHexColor(presentation.general_screen_background_color),
      generalScreenFontFamily: normalizeGeneralScreenFontFamily(presentation.general_screen_font_family),
      generalScreenFontSize: normalizeGeneralScreenFontSize(presentation.general_screen_font_size),
    },
    screenView: presentation.screen_view ?? "question",
    activeQuestion: hideCorrectAnswers(activeQuestion),
    screenQuestion: presentation.screen_view === "results" ? screenQuestion : hideCorrectAnswers(screenQuestion),
    participantLabel,
    participantResult,
    leaderboard,
    quizTotals,
    totals: {
      questions: questions.length,
      answers: responseRows.length,
    },
  };
}

export async function registerParticipant(
  codeInput: string,
  payload: {
    participantId?: unknown;
    displayName?: unknown;
    anonymous?: unknown;
  }
) {
  await ensureSchema();

  const presentation = await fetchPresentationByCode(codeInput);
  if (!presentation) {
    throw new AppError(404, "Sessie niet gevonden.");
  }

  const participantId = cleanText(payload.participantId, 80);
  await upsertParticipantProfile(
    presentation.id,
    participantId,
    payload.displayName,
    payload.anonymous !== false
  );

  return getPublicSession(presentation.code, participantId);
}

export async function submitAnswer(
  codeInput: string,
  payload: {
    participantId?: unknown;
    participantName?: unknown;
    optionId?: unknown;
    textAnswer?: unknown;
    clientSelectedAt?: unknown;
    clientSequence?: unknown;
  }
) {
  const serverReceivedAtMs = Date.now();
  await ensureSchema();
  const clientSelectedAt = normalizeClientSelectedAt(payload.clientSelectedAt, serverReceivedAtMs);
  const clientSequence = cleanClientSequence(payload.clientSequence);

  const presentation = await fetchPresentationByCode(codeInput);
  if (!presentation) {
    throw new AppError(404, "Sessie niet gevonden.");
  }

  if (!presentation.active_question_id) {
    throw new AppError(409, "Er staat nu geen vraag open.");
  }

  const question = await fetchQuestion(presentation.active_question_id);
  if (!question || question.status !== "open") {
    throw new AppError(409, "Deze vraag is gesloten.");
  }

  if (question.type === "slide") {
    throw new AppError(409, "Dit onderdeel vraagt geen antwoord.");
  }

  if (question.type === "quiz" && question.finalized_at) {
    throw new AppError(409, "Deze quizvraag is al afgesloten voor de puntentelling.");
  }

  if (question.type === "quiz") {
    const timing = getQuestionTimingState(parseQuestionContent(question.content_json), question.type, serverReceivedAtMs);
    if (timing.isCountdown) {
      throw new AppError(409, "De quizvraag start zo. Wacht tot de aftelperiode klaar is.");
    }
    if (timing.isExpired) {
      const arrivedWithinGrace = Boolean(
        timing.answerEndsAtMs && serverReceivedAtMs <= timing.answerEndsAtMs + QUIZ_LATE_SUBMISSION_GRACE_MS
      );
      const selectedBeforeDeadline = Boolean(
        timing.answerEndsAtMs &&
          clientSelectedAt.fromClient &&
          clientSelectedAt.ms <= timing.answerEndsAtMs + QUIZ_SELECTION_DEADLINE_TOLERANCE_MS
      );

      if (!arrivedWithinGrace || !selectedBeforeDeadline) {
        throw new AppError(409, "De tijd is voorbij. Deze quizvraag is gesloten voor deelnemers.");
      }
    }
  }

  if (
    question.type === "quiz" &&
    presentation.screen_view === "results" &&
    presentation.screen_question_id === question.id
  ) {
    throw new AppError(409, "De quizresultaten staan live. Je antwoord kan nu niet meer worden aangepast.");
  }

  const participantId = cleanText(payload.participantId, 80) || makeId("guest");
  const fallbackName = cleanText(payload.participantName, 60);
  const participantProfile =
    (await fetchParticipantProfile(presentation.id, participantId)) ??
    (await upsertParticipantProfile(
      presentation.id,
      participantId,
      fallbackName,
      fallbackName ? false : true
    ));
  const participantName = participantProfile?.display_name ?? (fallbackName || "Anoniem");
  let optionId: string | null = null;
  let textAnswer: string | null = null;

  if (isChoiceQuestion(question.type)) {
    optionId = cleanText(payload.optionId, 80);
    if (!optionId) {
      throw new AppError(400, "Kies een antwoordoptie.");
    }

    const option = first(
      await getSql()<{ id: string }[]>`
        SELECT id
        FROM question_options
        WHERE id = ${optionId} AND question_id = ${question.id}
      `
    );

    if (!option) {
      throw new AppError(400, "Deze antwoordoptie hoort niet bij de actieve vraag.");
    }
  } else {
    textAnswer = cleanText(payload.textAnswer, 280);
    if (!textAnswer) {
      throw new AppError(400, "Vul een antwoord in.");
    }
  }

  const sql = getSql();
  const timestamp = new Date(serverReceivedAtMs).toISOString();

  await sql.begin(async (tx) => {
    const existingResponse = first(
      await tx<Pick<ResponseRow, "client_selected_at" | "client_sequence" | "updated_at">[]>`
        SELECT client_selected_at, client_sequence, updated_at
        FROM responses
        WHERE question_id = ${question.id} AND participant_id = ${participantId}
        FOR UPDATE
      `
    );

    if (isChoiceQuestion(question.type) && existingResponse) {
      const existingSelectedAtMs =
        parseTimestampMs(existingResponse.client_selected_at) ?? parseTimestampMs(existingResponse.updated_at) ?? 0;
      const existingSequence = numberFromDb(existingResponse.client_sequence);
      const incomingIsOlder =
        clientSelectedAt.ms < existingSelectedAtMs ||
        (clientSelectedAt.ms === existingSelectedAtMs && clientSequence <= existingSequence);

      if (incomingIsOlder) {
        return;
      }
    }

    await tx`
      DELETE FROM responses
      WHERE question_id = ${question.id} AND participant_id = ${participantId}
    `;
    await tx`
      INSERT INTO responses (
        id,
        presentation_id,
        question_id,
        participant_id,
        participant_name,
        option_id,
        text_answer,
        client_selected_at,
        client_sequence,
        created_at,
        updated_at
      )
      VALUES (
        ${makeId("rsp")},
        ${presentation.id},
        ${question.id},
        ${participantId},
        ${participantName},
        ${optionId},
        ${textAnswer},
        ${clientSelectedAt.iso},
        ${clientSequence},
        ${timestamp},
        ${timestamp}
      )
    `;
  });

  return getPublicSession(presentation.code, participantId);
}

export async function listModeratorPresentations(
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
): Promise<ModeratorPresentationSummary[]> {
  await ensureSchema();
  const ownerFilter = isAdminActor(actor) ? null : actor.userId ?? "__missing_user__";

  const rows = await getSql()<
    Array<
      PresentationRow & {
        question_count: number;
        slide_count: number;
        item_count: number;
        answer_count: number;
        participant_count: number;
      }
    >
  >`
    SELECT
      presentations.*,
      (SELECT COUNT(*)::int FROM questions WHERE questions.presentation_id = presentations.id AND questions.type <> 'slide') AS question_count,
      (SELECT COUNT(*)::int FROM questions WHERE questions.presentation_id = presentations.id AND questions.type = 'slide') AS slide_count,
      (SELECT COUNT(*)::int FROM questions WHERE questions.presentation_id = presentations.id) AS item_count,
      (SELECT COUNT(*)::int FROM responses WHERE responses.presentation_id = presentations.id) AS answer_count,
      GREATEST(
        (
          SELECT COUNT(*)::int
          FROM participant_profiles
          WHERE participant_profiles.presentation_id = presentations.id
        ),
        (
          SELECT COUNT(DISTINCT participant_id)::int
          FROM responses
          WHERE responses.presentation_id = presentations.id
        )
      ) AS participant_count
    FROM presentations
    WHERE ${ownerFilter}::text IS NULL OR presentations.owner_user_id = ${ownerFilter}
    ORDER BY updated_at DESC, created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    code: row.code,
    presenterKey: row.presenter_key,
    presentationType: row.presentation_type ?? "interactive",
    workflowStatus: row.workflow_status ?? "concept",
    publishedAt: row.published_at,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totals: {
      questions: numberFromDb(row.question_count),
      slides: numberFromDb(row.slide_count),
      items: numberFromDb(row.item_count),
      answers: numberFromDb(row.answer_count),
      participants: numberFromDb(row.participant_count),
    },
  }));
}

async function assertPresentationAccess(
  presentationId: string,
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
) {
  await ensureSchema();

  const presentation = await fetchPresentationById(presentationId);
  if (!presentation) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

  if (!ownerMatches(presentation, actor)) {
    throw new AppError(403, "Je hebt geen toegang tot deze presentatie.");
  }

  return presentation;
}

export async function renamePresentation(
  presentationId: string,
  titleInput: unknown,
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
) {
  await assertPresentationAccess(presentationId, actor);

  const title = cleanText(titleInput, 90);
  if (!title) {
    throw new AppError(400, "Titel is verplicht.");
  }

  const rows = await getSql()<PresentationRow[]>`
    UPDATE presentations
    SET title = ${title}, updated_at = ${nowIso()}
    WHERE id = ${presentationId}
    RETURNING *
  `;

  if (!rows.length) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

  return first(rows);
}

export async function deletePresentation(
  presentationId: string,
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
) {
  await assertPresentationAccess(presentationId, actor);
  const sql = getSql();

  await sql.begin(async (tx) => {
    await tx`DELETE FROM responses WHERE presentation_id = ${presentationId}`;
    await tx`
      DELETE FROM question_options
      WHERE question_id IN (
        SELECT id
        FROM questions
        WHERE presentation_id = ${presentationId}
      )
    `;
    await tx`DELETE FROM questions WHERE presentation_id = ${presentationId}`;
    await tx`DELETE FROM presentations WHERE id = ${presentationId}`;
  });
}

export async function duplicatePresentation(
  presentationId: string,
  actor: ModeratorActor = { role: "admin", userId: null, email: null }
) {
  await ensureSchema();

  const original = await assertPresentationAccess(presentationId, actor);

  const sql = getSql();
  const questions = await sql<QuestionRow[]>`
    SELECT *
    FROM questions
    WHERE presentation_id = ${presentationId}
    ORDER BY position ASC, created_at ASC
  `;
  const options = await sql<OptionRow[]>`
    SELECT question_options.*
    FROM question_options
    INNER JOIN questions ON questions.id = question_options.question_id
    WHERE questions.presentation_id = ${presentationId}
    ORDER BY question_options.position ASC
  `;
  const id = makeId("prs");
  const presenterKey = makePresenterKey();
  const timestamp = nowIso();
  let code = makeCode();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const existing = await fetchPresentationByCode(code);
    if (!existing) {
      break;
    }
    code = makeCode();
  }

  const newTitle = `${original.title} kopie`.slice(0, 90);
  const questionIdMap = new Map<string, string>();
  const duplicateOwnerUserId = isAdminActor(actor) ? null : original.owner_user_id;
  const duplicateOwnerEmail = isAdminActor(actor) ? null : original.owner_email;

  if (!isAdminActor(actor)) {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM presentations
      WHERE owner_user_id = ${actor.userId}
    `;
    const currentCount = numberFromDb(first(rows)?.count);
    const maxPresentations = betaMaxPresentations();

    if (currentCount >= maxPresentations) {
      throw new AppError(403, `Je kunt maximaal ${maxPresentations} presentaties of quizzen aanmaken.`);
    }
  }

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO presentations (
        id,
        title,
        code,
        presenter_key,
        owner_user_id,
        owner_email,
        presentation_type,
        workflow_status,
        published_at,
        idle_screen_text,
        general_screen_background_color,
        general_screen_font_family,
        general_screen_font_size,
        active_question_id,
        screen_question_id,
        screen_view,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${newTitle},
        ${code},
        ${presenterKey},
        ${duplicateOwnerUserId},
        ${duplicateOwnerEmail},
        ${original.presentation_type ?? "interactive"},
        ${original.workflow_status ?? "concept"},
        ${original.published_at},
        ${original.idle_screen_text},
        ${normalizeHexColor(original.general_screen_background_color)},
        ${normalizeGeneralScreenFontFamily(original.general_screen_font_family)},
        ${normalizeGeneralScreenFontSize(original.general_screen_font_size)},
        NULL,
        NULL,
        'question',
        ${timestamp},
        ${timestamp}
      )
    `;

    for (const question of questions) {
      const newQuestionId = makeId("q");
      questionIdMap.set(question.id, newQuestionId);
      await tx`
        INSERT INTO questions (id, presentation_id, type, prompt, content_json, status, position, created_at, updated_at)
        VALUES (
          ${newQuestionId},
          ${id},
          ${question.type},
          ${question.prompt},
          ${question.content_json},
          'closed',
          ${question.position},
          ${timestamp},
          ${timestamp}
        )
      `;
    }

    for (const option of options) {
      const newQuestionId = questionIdMap.get(option.question_id);
      if (newQuestionId) {
        await tx`
          INSERT INTO question_options (id, question_id, label, position, is_correct)
          VALUES (${makeId("opt")}, ${newQuestionId}, ${option.label}, ${option.position}, ${Boolean(option.is_correct)})
        `;
      }
    }
  });

  return getPresenterPayload(id, presenterKey);
}

export function errorPayload(error: unknown) {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message } };
  }

  const message = error instanceof Error ? error.message : "Onverwachte fout.";
  return { status: 500, body: { error: message } };
}
