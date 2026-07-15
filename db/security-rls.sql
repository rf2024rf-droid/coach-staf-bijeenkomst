-- Enable Row Level Security on application tables exposed through Supabase's public schema.
-- No public policies are added intentionally: the app reads and writes through its own Next.js API.

alter table public.presentations enable row level security;
alter table public.app_accounts enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.responses enable row level security;
alter table public.participant_profiles enable row level security;
