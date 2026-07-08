create table if not exists presentations (
  id text primary key,
  title text not null,
  code text not null unique,
  presenter_key text not null,
  active_question_id text,
  screen_question_id text,
  screen_view text not null default 'question',
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text)
);

create table if not exists questions (
  id text primary key,
  presentation_id text not null references presentations(id) on delete cascade,
  type text not null,
  prompt text not null,
  status text not null default 'closed',
  position integer not null,
  finalized_at text,
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text)
);

create table if not exists question_options (
  id text primary key,
  question_id text not null references questions(id) on delete cascade,
  label text not null,
  position integer not null,
  is_correct boolean not null default false
);

create table if not exists responses (
  id text primary key,
  presentation_id text not null references presentations(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  participant_id text not null,
  participant_name text not null,
  option_id text references question_options(id) on delete set null,
  text_answer text,
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text)
);

alter table presentations add column if not exists screen_view text not null default 'question';
alter table presentations add column if not exists screen_question_id text;
alter table questions add column if not exists finalized_at text;
alter table question_options add column if not exists is_correct boolean not null default false;

create unique index if not exists presentations_code_idx on presentations (code);
create index if not exists questions_presentation_idx on questions (presentation_id);
create index if not exists options_question_idx on question_options (question_id);
create index if not exists responses_presentation_idx on responses (presentation_id);
create index if not exists responses_question_idx on responses (question_id);
create unique index if not exists responses_question_participant_idx
  on responses (question_id, participant_id);
