export type QuestionType = "open" | "multiple" | "quiz" | "slide";
export type ScreenView = "question" | "qr" | "results" | "ranking";
export type ModeratorRole = "admin" | "tester";
export type AppAccountStatus = "pending" | "active" | "deactivated" | "deleted";
export type PresentationKind = "quiz" | "interactive" | "combined";
export type PresentationWorkflowStatus = "concept" | "completed" | "published";
export type GeneralScreenFontFamily =
  | "system"
  | "arial"
  | "verdana"
  | "tahoma"
  | "trebuchet"
  | "georgia"
  | "times"
  | "courier"
  | "impact";

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

export type QuestionResult = {
  id: string;
  type: QuestionType;
  kind: string;
  prompt: string;
  description: string;
  content: Record<string, unknown>;
  status: "open" | "closed";
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
    generalScreenFontFamily: GeneralScreenFontFamily | null;
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
    generalScreenFontFamily: GeneralScreenFontFamily | null;
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
