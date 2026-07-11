export const QUIZ_COUNTDOWN_SECONDS = 5;
export const QUIZ_LATE_SUBMISSION_GRACE_MS = 4000;
export const QUIZ_SELECTION_DEADLINE_TOLERANCE_MS = 250;
const QUIZ_COUNTDOWN_MS = QUIZ_COUNTDOWN_SECONDS * 1000;

type QuestionTypeLike = "open" | "multiple" | "quiz" | "slide";

function parseTimestampMs(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getQuizTimeLimitSeconds(content: Record<string, unknown>) {
  const raw = content.timeLimitSeconds;
  const numeric = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

export function buildLiveQuestionContent(
  content: Record<string, unknown>,
  questionType: QuestionTypeLike,
  activatedAtIso: string
) {
  const next = { ...content };
  delete next.liveStartedAt;
  delete next.liveAnswerOpenAt;
  delete next.liveAnswerEndsAt;

  if (questionType !== "quiz") {
    return next;
  }

  const activatedAtMs = parseTimestampMs(activatedAtIso) ?? Date.now();
  const answerOpenAtMs = activatedAtMs + QUIZ_COUNTDOWN_MS;
  const timeLimitSeconds = getQuizTimeLimitSeconds(next);

  next.liveStartedAt = new Date(activatedAtMs).toISOString();
  next.liveAnswerOpenAt = new Date(answerOpenAtMs).toISOString();

  if (timeLimitSeconds) {
    next.liveAnswerEndsAt = new Date(answerOpenAtMs + timeLimitSeconds * 1000).toISOString();
  }

  return next;
}

export function getQuestionTimingState(
  content: Record<string, unknown>,
  questionType: QuestionTypeLike,
  nowMs = Date.now()
) {
  const timeLimitSeconds = getQuizTimeLimitSeconds(content);
  const startedAtMs = parseTimestampMs(content.liveStartedAt);
  const answerOpenAtMs = parseTimestampMs(content.liveAnswerOpenAt);
  const answerEndsAtMs = parseTimestampMs(content.liveAnswerEndsAt);
  const countdownDurationMs = startedAtMs && answerOpenAtMs ? Math.max(answerOpenAtMs - startedAtMs, 1) : QUIZ_COUNTDOWN_MS;
  const countdownRemainingMs =
    questionType === "quiz" && answerOpenAtMs && nowMs < answerOpenAtMs
      ? Math.max(answerOpenAtMs - nowMs, 0)
      : 0;
  const answerDurationMs =
    answerOpenAtMs && answerEndsAtMs ? Math.max(answerEndsAtMs - answerOpenAtMs, 1) : null;
  const answerElapsedMs =
    answerOpenAtMs && nowMs >= answerOpenAtMs ? Math.max(nowMs - answerOpenAtMs, 0) : 0;
  const isCountdown = Boolean(questionType === "quiz" && answerOpenAtMs && nowMs < answerOpenAtMs);
  const isExpired = Boolean(questionType === "quiz" && answerEndsAtMs && nowMs >= answerEndsAtMs);
  const isAnswerOpen = questionType !== "quiz" || (!isCountdown && !isExpired);

  return {
    timeLimitSeconds,
    startedAtMs,
    answerOpenAtMs,
    answerEndsAtMs,
    isCountdown,
    isAnswerOpen,
    isExpired,
    countdownNumber: isCountdown ? Math.max(1, Math.ceil(countdownRemainingMs / 1000)) : 0,
    countdownProgress: isCountdown
      ? Math.min(Math.max((countdownDurationMs - countdownRemainingMs) / countdownDurationMs, 0), 1)
      : isExpired || answerOpenAtMs
        ? 1
        : 0,
    answerProgress:
      answerDurationMs && answerOpenAtMs
        ? Math.min(Math.max(answerElapsedMs / answerDurationMs, 0), 1)
        : 0,
  };
}
