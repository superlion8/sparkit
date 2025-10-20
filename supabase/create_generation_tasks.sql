create table if not exists public.generation_tasks (
  id uuid primary key default uuid_generate_v4(),
  task_id text not null,
  task_type text not null,
  username text,
  email text,
  task_time timestamptz not null default now(),
  prompt text,
  input_image_url text,
  input_video_url text,
  output_image_url text,
  output_video_url text,
  created_at timestamptz not null default now()
);

alter table public.generation_tasks
  enable row level security;

create policy generation_tasks_insert_policy
  on public.generation_tasks
  for insert
  with check (true);
