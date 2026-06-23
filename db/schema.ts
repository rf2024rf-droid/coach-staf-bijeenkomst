import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const presentations = sqliteTable(
  "presentations",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    code: text("code").notNull(),
    presenterKey: text("presenter_key").notNull(),
    activeQuestionId: text("active_question_id"),
    screenQuestionId: text("screen_question_id"),
    screenView: text("screen_view", { enum: ["question", "qr", "results"] })
      .notNull()
      .default("question"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("presentations_code_idx").on(table.code)]
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    presentationId: text("presentation_id")
      .notNull()
      .references(() => presentations.id),
    type: text("type", { enum: ["open", "multiple"] }).notNull(),
    prompt: text("prompt").notNull(),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("closed"),
    position: integer("position").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("questions_presentation_idx").on(table.presentationId)]
);

export const questionOptions = sqliteTable(
  "question_options",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [index("options_question_idx").on(table.questionId)]
);

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    presentationId: text("presentation_id")
      .notNull()
      .references(() => presentations.id),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    participantId: text("participant_id").notNull(),
    participantName: text("participant_name").notNull(),
    optionId: text("option_id").references(() => questionOptions.id),
    textAnswer: text("text_answer"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("responses_presentation_idx").on(table.presentationId),
    index("responses_question_idx").on(table.questionId),
    uniqueIndex("responses_question_participant_idx").on(
      table.questionId,
      table.participantId
    ),
  ]
);
