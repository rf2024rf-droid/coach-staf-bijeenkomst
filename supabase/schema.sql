create table if not exists presentations (
  id text primary key,
  title text not null,
  code text not null unique,
  presenter_key text not null,
  owner_user_id text,
  owner_email text,
  presentation_type text not null default 'interactive',
  workflow_status text not null default 'concept',
  published_at text,
  idle_screen_text text,
  active_question_id text,
  screen_question_id text,
  screen_view text not null default 'question',
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text)
);

create table if not exists app_accounts (
  id text primary key,
  email text not null unique,
  role text not null default 'tester',
  status text not null default 'pending',
  supabase_user_id text,
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text),
  last_login_at text
);

create table if not exists questions (
  id text primary key,
  presentation_id text not null references presentations(id) on delete cascade,
  type text not null,
  prompt text not null,
  content_json text,
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

create table if not exists participant_profiles (
  id text primary key,
  presentation_id text not null references presentations(id) on delete cascade,
  participant_id text not null,
  display_name text not null,
  is_anonymous boolean not null default true,
  display_index integer not null,
  created_at text not null default (now()::text),
  updated_at text not null default (now()::text)
);

alter table presentations add column if not exists owner_user_id text;
alter table presentations add column if not exists owner_email text;
alter table presentations add column if not exists presentation_type text not null default 'interactive';
alter table presentations add column if not exists workflow_status text not null default 'concept';
alter table presentations add column if not exists published_at text;
alter table presentations add column if not exists idle_screen_text text;
alter table presentations add column if not exists screen_view text not null default 'question';
alter table presentations add column if not exists screen_question_id text;
alter table questions add column if not exists finalized_at text;
alter table questions add column if not exists content_json text;
alter table question_options add column if not exists is_correct boolean not null default false;

create unique index if not exists presentations_code_idx on presentations (code);
create index if not exists presentations_owner_idx on presentations (owner_user_id);
create unique index if not exists app_accounts_email_idx on app_accounts (email);
create index if not exists app_accounts_supabase_user_idx on app_accounts (supabase_user_id);
create index if not exists questions_presentation_idx on questions (presentation_id);
create index if not exists options_question_idx on question_options (question_id);
create index if not exists responses_presentation_idx on responses (presentation_id);
create index if not exists responses_question_idx on responses (question_id);
create unique index if not exists responses_question_participant_idx
  on responses (question_id, participant_id);
create unique index if not exists participant_profiles_presentation_participant_idx
  on participant_profiles (presentation_id, participant_id);
create index if not exists participant_profiles_presentation_idx
  on participant_profiles (presentation_id);
