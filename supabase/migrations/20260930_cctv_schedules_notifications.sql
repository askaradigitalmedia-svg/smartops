create table if not exists public.camera_schedules (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  snapshot_time time not null,
  task text not null default 'hitung' check (task in ('hitung', 'progress', 'keamanan')),
  note text not null default '',
  enabled boolean not null default true,
  last_run_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (camera_id, snapshot_time)
);

create table if not exists public.notification_settings (
  id smallint primary key default 1 check (id = 1),
  email_enabled boolean not null default false,
  email_recipients text[] not null default '{}',
  telegram_enabled boolean not null default false,
  telegram_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_settings (id)
values (1)
on conflict (id) do nothing;

create index if not exists camera_schedules_due_idx
  on public.camera_schedules (enabled, snapshot_time, last_run_date);

