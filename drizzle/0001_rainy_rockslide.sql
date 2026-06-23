CREATE INDEX `options_question_idx` ON `question_options` (`question_id`);--> statement-breakpoint
CREATE INDEX `questions_presentation_idx` ON `questions` (`presentation_id`);--> statement-breakpoint
CREATE INDEX `responses_presentation_idx` ON `responses` (`presentation_id`);--> statement-breakpoint
CREATE INDEX `responses_question_idx` ON `responses` (`question_id`);