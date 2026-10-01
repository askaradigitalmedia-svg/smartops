-- Temporary policies for the current SmartOps dashboard, which still uses
-- NEXT_PUBLIC_SUPABASE_ANON_KEY directly from the browser.
-- Replace these policies with authenticated admin-only policies after
-- Supabase Auth is implemented.

alter table public.camera_schedules enable row level security;
alter table public.notification_settings enable row level security;

grant select, insert, update, delete on table public.camera_schedules to anon, authenticated;
grant select, insert, update, delete on table public.notification_settings to anon, authenticated;

drop policy if exists "smartops schedules select" on public.camera_schedules;
drop policy if exists "smartops schedules insert" on public.camera_schedules;
drop policy if exists "smartops schedules update" on public.camera_schedules;
drop policy if exists "smartops schedules delete" on public.camera_schedules;

create policy "smartops schedules select"
on public.camera_schedules
for select
to anon, authenticated
using (true);

create policy "smartops schedules insert"
on public.camera_schedules
for insert
to anon, authenticated
with check (true);

create policy "smartops schedules update"
on public.camera_schedules
for update
to anon, authenticated
using (true)
with check (true);

create policy "smartops schedules delete"
on public.camera_schedules
for delete
to anon, authenticated
using (true);

drop policy if exists "smartops notifications select" on public.notification_settings;
drop policy if exists "smartops notifications insert" on public.notification_settings;
drop policy if exists "smartops notifications update" on public.notification_settings;

create policy "smartops notifications select"
on public.notification_settings
for select
to anon, authenticated
using (true);

create policy "smartops notifications insert"
on public.notification_settings
for insert
to anon, authenticated
with check (id = 1);

create policy "smartops notifications update"
on public.notification_settings
for update
to anon, authenticated
using (id = 1)
with check (id = 1);
