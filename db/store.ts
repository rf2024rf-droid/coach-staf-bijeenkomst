import postgres from "postgres";

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

export type ModeratorPresentationSummary = {
  id: string;
  title: string;
  code: string;
  presenterKey: string;
  createdAt: string;
  updatedAt: string;
  totals: {
    questions: number;
    answers: number;
    participants: number;
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

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    presenter_key TEXT NOT NULL,
    active_question_id TEXT,
    screen_question_id TEXT,
    screen_view TEXT NOT NULL DEFAULT 'question',
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'closed',
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    option_id TEXT REFERENCES question_options(id) ON DELETE SET NULL,
    text_answer TEXT,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT NOT NULL DEFAULT (now()::text)
  )`,
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS screen_view TEXT NOT NULL DEFAULT 'question'",
  "ALTER TABLE presentations ADD COLUMN IF NOT EXISTS screen_question_id TEXT",
  "CREATE UNIQUE INDEX IF NOT EXISTS presentations_code_idx ON presentations (code)",
  "CREATE INDEX IF NOT EXISTS questions_presentation_idx ON questions (presentation_id)",
  "CREATE INDEX IF NOT EXISTS options_question_idx ON question_options (question_id)",
  "CREATE INDEX IF NOT EXISTS responses_presentation_idx ON responses (presentation_id)",
  "CREATE INDEX IF NOT EXISTS responses_question_idx ON responses (question_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS responses_question_participant_idx ON responses (question_id, participant_id)",
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
  const sql = getSql();
  const rows = await sql<PresentationRow[]>`SELECT * FROM presentations WHERE id = ${id}`;
  return first(rows);
}

async function fetchPresentationByCode(code: string) {
  const sql = getSql();
  const rows = await sql<PresentationRow[]>`SELECT * FROM presentations WHERE code = ${normalizeCode(code)}`;
  return first(rows);
}

async function fetchQuestion(questionId: string) {
  const sql = getSql();
  const rows = await sql<QuestionRow[]>`SELECT * FROM questions WHERE id = ${questionId}`;
  return first(rows);
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
  optionLabels: string[],
  openImmediately: boolean
) {
  const sql = getSql();
  const id = makeId("q");
  const position = await getNextPosition(presentationId);
  const status: QuestionStatus = openImmediately ? "open" : "closed";
  const timestamp = nowIso();

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO questions (id, presentation_id, type, prompt, status, position, created_at, updated_at)
      VALUES (${id}, ${presentationId}, ${type}, ${prompt}, ${status}, ${position}, ${timestamp}, ${timestamp})
    `;

    if (type === "multiple") {
      for (const [index, label] of optionLabels.entries()) {
        await tx`
          INSERT INTO question_options (id, question_id, label, position)
          VALUES (${makeId("opt")}, ${id}, ${label}, ${index + 1})
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

export async function createPresentation(titleInput: unknown) {
  await ensureSchema();

  const sql = getSql();
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

  await sql`
    INSERT INTO presentations (id, title, code, presenter_key, active_question_id, screen_question_id, screen_view, created_at, updated_at)
    VALUES (${id}, ${title}, ${code}, ${presenterKey}, NULL, NULL, 'question', ${timestamp}, ${timestamp})
  `;

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
  const sql = getSql();

  const [questionRows, optionRows, responseRows, participantRows] = await Promise.all([
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
  ]);

  const questions = buildQuestions(questionRows, optionRows, responseRows);

  return {
    presentation: mapPresentation(presentation),
    questions,
    activeQuestion:
      questions.find((question) => question.id === presentation.active_question_id && question.status === "open") ??
      null,
    totals: {
      questions: questions.length,
      answers: responseRows.length,
      participants: numberFromDb(first(participantRows)?.count),
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

  const sql = getSql();
  const timestamp = nowIso();
  const current =
    question.type === "multiple"
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
      SET prompt = ${prompt}, updated_at = ${timestamp}
      WHERE id = ${questionId} AND presentation_id = ${presentationId}
    `;

    if (question.type === "multiple") {
      for (const [index, label] of optionLabels.entries()) {
        const existing = current[index];
        if (existing) {
          await tx`
            UPDATE question_options
            SET label = ${label}, position = ${index + 1}
            WHERE id = ${existing.id}
          `;
        } else {
          await tx`
            INSERT INTO question_options (id, question_id, label, position)
            VALUES (${makeId("opt")}, ${questionId}, ${label}, ${index + 1})
          `;
        }
      }

      for (const removed of current.slice(optionLabels.length)) {
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

  await sql.begin(async (tx) => {
    await tx`
      UPDATE questions
      SET status = 'closed', updated_at = ${timestamp}
      WHERE presentation_id = ${presentationId}
    `;
    await tx`
      UPDATE questions
      SET status = 'open', updated_at = ${timestamp}
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

  await getSql()`
    UPDATE presentations
    SET screen_view = ${screenView}, screen_question_id = ${screenView === "results" ? questionId : null}, updated_at = ${nowIso()}
    WHERE id = ${presentationId}
  `;

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
  } else {
    await sql`DELETE FROM responses WHERE presentation_id = ${presentationId}`;
  }

  return getPresenterPayload(presentationId, presenterKey);
}

export async function getPublicSession(codeInput: string): Promise<PublicSessionPayload> {
  await ensureSchema();

  const presentation = await fetchPresentationByCode(codeInput);
  if (!presentation) {
    throw new AppError(404, "Sessie niet gevonden.");
  }

  const sql = getSql();
  const [questionRows, optionRows, responseRows] = await Promise.all([
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
      LIMIT 250
    `,
  ]);

  const questions = buildQuestions(questionRows, optionRows, responseRows);

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
      answers: responseRows.length,
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
  const participantName = "Anoniem";
  let optionId: string | null = null;
  let textAnswer: string | null = null;

  if (question.type === "multiple") {
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
  const timestamp = nowIso();

  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM responses
      WHERE question_id = ${question.id} AND participant_id = ${participantId}
    `;
    await tx`
      INSERT INTO responses (id, presentation_id, question_id, participant_id, participant_name, option_id, text_answer, created_at, updated_at)
      VALUES (${makeId("rsp")}, ${presentation.id}, ${question.id}, ${participantId}, ${participantName}, ${optionId}, ${textAnswer}, ${timestamp}, ${timestamp})
    `;
  });

  return getPublicSession(presentation.code);
}

export async function listModeratorPresentations(): Promise<ModeratorPresentationSummary[]> {
  await ensureSchema();

  const rows = await getSql()<
    Array<
      PresentationRow & {
        question_count: number;
        answer_count: number;
        participant_count: number;
      }
    >
  >`
    SELECT
      presentations.*,
      (SELECT COUNT(*)::int FROM questions WHERE questions.presentation_id = presentations.id) AS question_count,
      (SELECT COUNT(*)::int FROM responses WHERE responses.presentation_id = presentations.id) AS answer_count,
      (
        SELECT COUNT(DISTINCT participant_id)::int
        FROM responses
        WHERE responses.presentation_id = presentations.id
      ) AS participant_count
    FROM presentations
    ORDER BY updated_at DESC, created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    code: row.code,
    presenterKey: row.presenter_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totals: {
      questions: numberFromDb(row.question_count),
      answers: numberFromDb(row.answer_count),
      participants: numberFromDb(row.participant_count),
    },
  }));
}

export async function renamePresentation(presentationId: string, titleInput: unknown) {
  await ensureSchema();

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

export async function deletePresentation(presentationId: string) {
  await ensureSchema();

  const presentation = await fetchPresentationById(presentationId);
  if (!presentation) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

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

export async function duplicatePresentation(presentationId: string) {
  await ensureSchema();

  const original = await fetchPresentationById(presentationId);
  if (!original) {
    throw new AppError(404, "Presentatie niet gevonden.");
  }

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

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO presentations (id, title, code, presenter_key, active_question_id, screen_question_id, screen_view, created_at, updated_at)
      VALUES (${id}, ${newTitle}, ${code}, ${presenterKey}, NULL, NULL, 'question', ${timestamp}, ${timestamp})
    `;

    for (const question of questions) {
      const newQuestionId = makeId("q");
      questionIdMap.set(question.id, newQuestionId);
      await tx`
        INSERT INTO questions (id, presentation_id, type, prompt, status, position, created_at, updated_at)
        VALUES (
          ${newQuestionId},
          ${id},
          ${question.type},
          ${question.prompt},
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
          INSERT INTO question_options (id, question_id, label, position)
          VALUES (${makeId("opt")}, ${newQuestionId}, ${option.label}, ${option.position})
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
