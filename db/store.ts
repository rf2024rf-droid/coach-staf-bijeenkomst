import { env } from "cloudflare:workers";

export type QuestionType = "open" | "multiple";
export type QuestionStatus = "open" | "closed";
export type ScreenView = "question" | "qr" | "results";

export type PresentationRow = {
  id: string;
  title: string;
  code: string;
  presenter_key: string;
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
  status: QuestionStatus;
  position: number;
  created_at: string;
  updated_at: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  position: number;
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
  created_at: string;
  updated_at: string;
};

export type QuestionResult = {
  id: string;
  type: QuestionType;
  prompt: string;
  status: QuestionStatus;
  position: number;
  answerCount: number;
  options: Array<{
    id: string;
    label: string;
    position: number;
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

export type PresenterPayload = {
  presentation: {
    id: string;
    title: string;
    code: string;
    presenterKey: string;
    activeQuestionId: string | null;
    screenQuestionId: string | null;
    screenView: ScreenView;
    createdAt: string;
    updatedAt: string;
  };
  questions: QuestionResult[];
  activeQuestion: QuestionResult | null;
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
  };
  screenView: ScreenView;
  activeQuestion: QuestionResult | null;
  screenQuestion: QuestionResult | null;
  totals: {
    questions: number;
    answers: number;
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

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    presenter_key TEXT NOT NULL,
    active_question_id TEXT,
    screen_question_id TEXT,
    screen_view TEXT NOT NULL DEFAULT 'question',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'closed',
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (presentation_id) REFERENCES presentations(id)
  )`,
  `CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    label TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    option_id TEXT,
    text_answer TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (presentation_id) REFERENCES presentations(id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (option_id) REFERENCES question_options(id)
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS presentations_code_idx ON presentations (code)",
  "CREATE INDEX IF NOT EXISTS questions_presentation_idx ON questions (presentation_id)",
  "CREATE INDEX IF NOT EXISTS options_question_idx ON question_options (question_id)",
  "CREATE INDEX IF NOT EXISTS responses_presentation_idx ON responses (presentation_id)",
  "CREATE INDEX IF NOT EXISTS responses_question_idx ON responses (question_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS responses_question_participant_idx ON responses (question_id, participant_id)",
];

let schemaReady: Promise<void> | null = null;

export function getD1() {
  if (!env.DB) {
    throw new AppError(
      500,
      "D1 database binding `DB` is niet beschikbaar. Controleer .openai/hosting.json."
    );
  }

  return env.DB;
}

export async function ensureSchema() {
  const db = getD1();

  schemaReady ??= (async () => {
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

    const columns = await db
      .prepare("PRAGMA table_info(presentations)")
      .all<{ name: string }>();
    const columnNames = new Set((columns.results ?? []).map((column) => column.name));

    if (!columnNames.has("screen_view")) {
      await db
        .prepare("ALTER TABLE presentations ADD COLUMN screen_view TEXT NOT NULL DEFAULT 'question'")
        .run();
    }

    if (!columnNames.has("screen_question_id")) {
      await db
        .prepare("ALTER TABLE presentations ADD COLUMN screen_question_id TEXT")
        .run();
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  await schemaReady;
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

function normalizeCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

function mapPresentation(row: PresentationRow) {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    presenterKey: row.presenter_key,
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
    const responses = responseRows.filter((response) => response.question_id === question.id);
    const options = optionRows
      .filter((option) => option.question_id === question.id)
      .map((option) => {
        const count = responses.filter((response) => response.option_id === option.id).length;
        return {
          id: option.id,
          label: option.label,
          position: option.position,
          count,
          percentage: responses.length ? Math.round((count / responses.length) * 100) : 0,
        };
      });

    return {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      status: question.status,
      position: question.position,
      answerCount: responses.length,
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

async function fetchPresentationById(id: string) {
  const db = getD1();
  return db
    .prepare("SELECT * FROM presentations WHERE id = ?")
    .bind(id)
    .first<PresentationRow>();
}

async function fetchPresentationByCode(code: string) {
  const db = getD1();
  return db
    .prepare("SELECT * FROM presentations WHERE code = ?")
    .bind(normalizeCode(code))
    .first<PresentationRow>();
}

async function fetchQuestion(questionId: string) {
  const db = getD1();
  return db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .bind(questionId)
    .first<QuestionRow>();
}

async function getNextPosition(presentationId: string) {
  const db = getD1();
  const row = await db
    .prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM questions WHERE presentation_id = ?")
    .bind(presentationId)
    .first<{ next_position: number }>();

  return row?.next_position ?? 1;
}

async function normalizeQuestionPositions(presentationId: string) {
  const db = getD1();
  const rows = await db
    .prepare("SELECT id FROM questions WHERE presentation_id = ? ORDER BY position ASC, created_at ASC")
    .bind(presentationId)
    .all<{ id: string }>();

  const updates = (rows.results ?? []).map((row, index) =>
    db
      .prepare("UPDATE questions SET position = ?, updated_at = ? WHERE id = ?")
      .bind(index + 1, nowIso(), row.id)
  );

  if (updates.length) {
    await db.batch(updates);
  }
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
  optionLabels: string[],
  openImmediately: boolean
) {
  const db = getD1();
  const id = makeId("q");
  const position = await getNextPosition(presentationId);
  const status: QuestionStatus = openImmediately ? "open" : "closed";
  const timestamp = nowIso();

  await db
    .prepare(
      "INSERT INTO questions (id, presentation_id, type, prompt, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, presentationId, type, prompt, status, position, timestamp, timestamp)
    .run();

  if (type === "multiple") {
    await db.batch(
      optionLabels.map((label, index) =>
        db
          .prepare("INSERT INTO question_options (id, question_id, label, position) VALUES (?, ?, ?, ?)")
          .bind(makeId("opt"), id, label, index + 1)
      )
    );
  }

  if (openImmediately) {
    await db
      .prepare("UPDATE presentations SET active_question_id = ?, updated_at = ? WHERE id = ?")
      .bind(id, timestamp, presentationId)
      .run();
  }

  return id;
}

export async function createPresentation(titleInput: unknown) {
  await ensureSchema();

  const db = getD1();
  const title = cleanText(titleInput, 90) || "Coach Staf Bijeenkomst";
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

  await db
    .prepare(
      "INSERT INTO presentations (id, title, code, presenter_key, active_question_id, screen_question_id, screen_view, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, NULL, 'question', ?, ?)"
    )
    .bind(id, title, code, presenterKey, timestamp, timestamp)
    .run();

  await insertQuestion(id, "open", "Wat wil je vandaag zeker bespreken?", [], true);
  await insertQuestion(
    id,
    "multiple",
    "Waar wil je vandaag de meeste focus op leggen?",
    ["Wedstrijdanalyse", "Training", "Spelersontwikkeling", "Teamafspraken"],
    false
  );

  return getPresenterPayload(id, presenterKey);
}

export async function getPresenterPayload(presentationId: string, presenterKey: string): Promise<PresenterPayload> {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const db = getD1();

  const [questionResult, optionResult, responseResult, participantResult] = await Promise.all([
    db
      .prepare("SELECT * FROM questions WHERE presentation_id = ? ORDER BY position ASC, created_at ASC")
      .bind(presentationId)
      .all<QuestionRow>(),
    db
      .prepare(
        "SELECT question_options.* FROM question_options INNER JOIN questions ON questions.id = question_options.question_id WHERE questions.presentation_id = ? ORDER BY question_options.position ASC"
      )
      .bind(presentationId)
      .all<OptionRow>(),
    db
      .prepare(
        "SELECT responses.*, question_options.label AS option_label FROM responses LEFT JOIN question_options ON question_options.id = responses.option_id WHERE responses.presentation_id = ? ORDER BY responses.created_at DESC"
      )
      .bind(presentationId)
      .all<ResponseRow>(),
    db
      .prepare("SELECT COUNT(DISTINCT participant_id) AS count FROM responses WHERE presentation_id = ?")
      .bind(presentationId)
      .first<{ count: number }>(),
  ]);

  const questions = buildQuestions(
    questionResult.results ?? [],
    optionResult.results ?? [],
    responseResult.results ?? []
  );

  return {
    presentation: mapPresentation(presentation),
    questions,
    activeQuestion:
      questions.find((question) => question.id === presentation.active_question_id && question.status === "open") ??
      null,
    totals: {
      questions: questions.length,
      answers: responseResult.results?.length ?? 0,
      participants: participantResult?.count ?? 0,
    },
  };
}

export async function addQuestion(
  presentationId: string,
  presenterKey: string,
  payload: { type?: unknown; prompt?: unknown; options?: unknown }
) {
  const presentation = await assertPresenter(presentationId, presenterKey);
  const type = payload.type === "multiple" ? "multiple" : "open";
  const prompt = cleanText(payload.prompt, 180);

  if (!prompt) {
    throw new AppError(400, "Vraagtekst is verplicht.");
  }

  const options =
    Array.isArray(payload.options) && type === "multiple"
      ? payload.options.map((option) => cleanText(option, 90)).filter(Boolean).slice(0, 8)
      : [];

  if (type === "multiple" && options.length < 2) {
    throw new AppError(400, "Een multiple choice vraag heeft minimaal twee opties nodig.");
  }

  await insertQuestion(presentation.id, type, prompt, options, !presentation.active_question_id);
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

  const db = getD1();
  const timestamp = nowIso();
  const isActiveQuestion = presentation.active_question_id === questionId;
  const isScreenQuestion = presentation.screen_question_id === questionId;
  const operations = [
    db
      .prepare("DELETE FROM responses WHERE presentation_id = ? AND question_id = ?")
      .bind(presentationId, questionId),
    db
      .prepare("DELETE FROM question_options WHERE question_id = ?")
      .bind(questionId),
    db
      .prepare("DELETE FROM questions WHERE id = ? AND presentation_id = ?")
      .bind(questionId, presentationId),
  ];

  if (isActiveQuestion || isScreenQuestion) {
    operations.push(
      db
        .prepare(
          "UPDATE presentations SET active_question_id = CASE WHEN active_question_id = ? THEN NULL ELSE active_question_id END, screen_question_id = CASE WHEN screen_question_id = ? THEN NULL ELSE screen_question_id END, screen_view = CASE WHEN active_question_id = ? OR screen_question_id = ? THEN 'question' ELSE screen_view END, updated_at = ? WHERE id = ?"
        )
        .bind(questionId, questionId, questionId, questionId, timestamp, presentationId)
    );
  }

  await db.batch(operations);
  await normalizeQuestionPositions(presentationId);
  return getPresenterPayload(presentationId, presenterKey);
}

export async function updateQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string,
  payload: { prompt?: unknown; options?: unknown }
) {
  await assertPresenter(presentationId, presenterKey);
  const question = await fetchQuestion(questionId);

  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }

  const prompt = cleanText(payload.prompt, 180);
  if (!prompt) {
    throw new AppError(400, "Vraagtekst is verplicht.");
  }

  const optionLabels =
    question.type === "multiple" && Array.isArray(payload.options)
      ? payload.options.map((option) => cleanText(option, 90)).filter(Boolean).slice(0, 8)
      : [];

  if (question.type === "multiple" && optionLabels.length < 2) {
    throw new AppError(400, "Een multiple choice vraag heeft minimaal twee opties nodig.");
  }

  const db = getD1();
  const timestamp = nowIso();
  const operations = [
    db
      .prepare("UPDATE questions SET prompt = ?, updated_at = ? WHERE id = ? AND presentation_id = ?")
      .bind(prompt, timestamp, questionId, presentationId),
  ];

  if (question.type === "multiple") {
    const currentOptions = await db
      .prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY position ASC")
      .bind(questionId)
      .all<OptionRow>();
    const current = currentOptions.results ?? [];

    optionLabels.forEach((label, index) => {
      const existing = current[index];
      if (existing) {
        operations.push(
          db
            .prepare("UPDATE question_options SET label = ?, position = ? WHERE id = ?")
            .bind(label, index + 1, existing.id)
        );
      } else {
        operations.push(
          db
            .prepare("INSERT INTO question_options (id, question_id, label, position) VALUES (?, ?, ?, ?)")
            .bind(makeId("opt"), questionId, label, index + 1)
        );
      }
    });

    current.slice(optionLabels.length).forEach((removed) => {
      operations.push(
        db
          .prepare("DELETE FROM responses WHERE question_id = ? AND option_id = ?")
          .bind(questionId, removed.id),
        db.prepare("DELETE FROM question_options WHERE id = ?").bind(removed.id)
      );
    });
  }

  await db.batch(operations);
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

  const db = getD1();
  const target =
    direction === "up"
      ? await db
          .prepare(
            "SELECT * FROM questions WHERE presentation_id = ? AND position < ? ORDER BY position DESC LIMIT 1"
          )
          .bind(presentationId, question.position)
          .first<QuestionRow>()
      : await db
          .prepare(
            "SELECT * FROM questions WHERE presentation_id = ? AND position > ? ORDER BY position ASC LIMIT 1"
          )
          .bind(presentationId, question.position)
          .first<QuestionRow>();

  if (!target) {
    return getPresenterPayload(presentationId, presenterKey);
  }

  const timestamp = nowIso();
  await db.batch([
    db
      .prepare("UPDATE questions SET position = ?, updated_at = ? WHERE id = ?")
      .bind(target.position, timestamp, question.id),
    db
      .prepare("UPDATE questions SET position = ?, updated_at = ? WHERE id = ?")
      .bind(question.position, timestamp, target.id),
  ]);

  return getPresenterPayload(presentationId, presenterKey);
}

export async function setActiveQuestion(
  presentationId: string,
  presenterKey: string,
  questionId: string | null
) {
  await assertPresenter(presentationId, presenterKey);
  const db = getD1();
  const timestamp = nowIso();

  if (!questionId) {
    await db.batch([
      db
        .prepare("UPDATE questions SET status = 'closed', updated_at = ? WHERE presentation_id = ?")
        .bind(timestamp, presentationId),
      db
        .prepare("UPDATE presentations SET active_question_id = NULL, screen_question_id = NULL, screen_view = 'question', updated_at = ? WHERE id = ?")
        .bind(timestamp, presentationId),
    ]);

    return getPresenterPayload(presentationId, presenterKey);
  }

  const question = await fetchQuestion(questionId);
  if (!question || question.presentation_id !== presentationId) {
    throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
  }

  await db.batch([
    db
      .prepare("UPDATE questions SET status = 'closed', updated_at = ? WHERE presentation_id = ?")
      .bind(timestamp, presentationId),
    db
      .prepare("UPDATE questions SET status = 'open', updated_at = ? WHERE id = ?")
      .bind(timestamp, questionId),
      db
        .prepare("UPDATE presentations SET active_question_id = ?, screen_question_id = ?, screen_view = 'question', updated_at = ? WHERE id = ?")
        .bind(questionId, questionId, timestamp, presentationId),
  ]);

  return getPresenterPayload(presentationId, presenterKey);
}

export async function setScreenView(
  presentationId: string,
  presenterKey: string,
  screenView: ScreenView,
  questionId: string | null = null
) {
  await assertPresenter(presentationId, presenterKey);

  if (screenView !== "question" && screenView !== "qr" && screenView !== "results") {
    throw new AppError(400, "Ongeldige schermweergave.");
  }

  if (screenView === "results") {
    if (!questionId) {
      throw new AppError(400, "Kies een vraag om resultaten te tonen.");
    }

    const question = await fetchQuestion(questionId);
    if (!question || question.presentation_id !== presentationId) {
      throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
    }
  }

  await getD1()
    .prepare("UPDATE presentations SET screen_view = ?, screen_question_id = ?, updated_at = ? WHERE id = ?")
    .bind(screenView, screenView === "results" ? questionId : null, nowIso(), presentationId)
    .run();

  return getPresenterPayload(presentationId, presenterKey);
}

export async function resetAnswers(
  presentationId: string,
  presenterKey: string,
  questionId: string | null
) {
  await assertPresenter(presentationId, presenterKey);
  const db = getD1();

  if (questionId) {
    const question = await fetchQuestion(questionId);
    if (!question || question.presentation_id !== presentationId) {
      throw new AppError(404, "Vraag niet gevonden in deze presentatie.");
    }

    await db
      .prepare("DELETE FROM responses WHERE presentation_id = ? AND question_id = ?")
      .bind(presentationId, questionId)
      .run();
  } else {
    await db.prepare("DELETE FROM responses WHERE presentation_id = ?").bind(presentationId).run();
  }

  return getPresenterPayload(presentationId, presenterKey);
}

export async function getPublicSession(codeInput: string): Promise<PublicSessionPayload> {
  await ensureSchema();

  const presentation = await fetchPresentationByCode(codeInput);
  if (!presentation) {
    throw new AppError(404, "Sessie niet gevonden.");
  }

  const db = getD1();
  const [questionResult, optionResult, responseResult] = await Promise.all([
    db
      .prepare("SELECT * FROM questions WHERE presentation_id = ? ORDER BY position ASC, created_at ASC")
      .bind(presentation.id)
      .all<QuestionRow>(),
    db
      .prepare(
        "SELECT question_options.* FROM question_options INNER JOIN questions ON questions.id = question_options.question_id WHERE questions.presentation_id = ? ORDER BY question_options.position ASC"
      )
      .bind(presentation.id)
      .all<OptionRow>(),
    db
      .prepare(
        "SELECT responses.*, question_options.label AS option_label FROM responses LEFT JOIN question_options ON question_options.id = responses.option_id WHERE responses.presentation_id = ? ORDER BY responses.created_at DESC LIMIT 250"
      )
      .bind(presentation.id)
      .all<ResponseRow>(),
  ]);

  const questions = buildQuestions(
    questionResult.results ?? [],
    optionResult.results ?? [],
    responseResult.results ?? []
  );

  return {
    presentation: {
      id: presentation.id,
      title: presentation.title,
      code: presentation.code,
    },
    screenView: presentation.screen_view ?? "question",
    activeQuestion:
      questions.find((question) => question.id === presentation.active_question_id && question.status === "open") ??
      null,
    screenQuestion:
      questions.find((question) => question.id === presentation.screen_question_id) ??
      null,
    totals: {
      questions: questions.length,
      answers: responseResult.results?.length ?? 0,
    },
  };
}

export async function submitAnswer(
  codeInput: string,
  payload: {
    participantId?: unknown;
    participantName?: unknown;
    optionId?: unknown;
    textAnswer?: unknown;
  }
) {
  await ensureSchema();

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

  const participantId = cleanText(payload.participantId, 80) || makeId("guest");
  const participantName = cleanText(payload.participantName, 50) || "Deelnemer";
  let optionId: string | null = null;
  let textAnswer: string | null = null;

  if (question.type === "multiple") {
    optionId = cleanText(payload.optionId, 80);
    if (!optionId) {
      throw new AppError(400, "Kies een antwoordoptie.");
    }

    const option = await getD1()
      .prepare("SELECT id FROM question_options WHERE id = ? AND question_id = ?")
      .bind(optionId, question.id)
      .first<{ id: string }>();

    if (!option) {
      throw new AppError(400, "Deze antwoordoptie hoort niet bij de actieve vraag.");
    }
  } else {
    textAnswer = cleanText(payload.textAnswer, 280);
    if (!textAnswer) {
      throw new AppError(400, "Vul een antwoord in.");
    }
  }

  const db = getD1();
  const timestamp = nowIso();

  await db.batch([
    db
      .prepare("DELETE FROM responses WHERE question_id = ? AND participant_id = ?")
      .bind(question.id, participantId),
    db
      .prepare(
        "INSERT INTO responses (id, presentation_id, question_id, participant_id, participant_name, option_id, text_answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        makeId("rsp"),
        presentation.id,
        question.id,
        participantId,
        participantName,
        optionId,
        textAnswer,
        timestamp,
        timestamp
      ),
  ]);

  return getPublicSession(presentation.code);
}

export function errorPayload(error: unknown) {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message } };
  }

  const message = error instanceof Error ? error.message : "Onverwachte fout.";
  return { status: 500, body: { error: message } };
}
