export type QuestionType = "open" | "multiple" | "quiz";
export type ScreenView = "question" | "qr" | "results";

export type QuestionResult = {
  id: string;
  type: QuestionType;
  prompt: string;
  status: "open" | "closed";
  position: number;
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
    idleScreenText: string;
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
    idleScreenText: string;
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
