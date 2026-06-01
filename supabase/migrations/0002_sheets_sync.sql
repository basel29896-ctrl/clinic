-- ============================================================
-- Google Sheets sync for appointments.
-- Posts each appointment INSERT/UPDATE to a Google Apps Script
-- Web App, which appends/updates a row in the linked Sheet.
--
-- Uses pg_net (net.http_post) — async HTTP from Postgres.
-- Run AFTER 0001_init.sql.
-- ============================================================

-- 1. Enable pg_net (Supabase ships it; safe if already enabled).
create extension if not exists pg_net with schema extensions;

-- 2. Config table to hold the Apps Script Web App URL.
--    Keeps the URL out of the function body so you can rotate it.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

alter table public.app_config enable row level security;

drop policy if exists app_config_admin_all on public.app_config;
create policy app_config_admin_all on public.app_config
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. Set your deployment URL here (re-run this line to update it).
--    >>> REPLACE the URL after deploying the Apps Script Web App. <<<
insert into public.app_config (key, value)
values ('sheets_webhook_url', 'https://script.google.com/macros/s/AKfycby5ynB7n8q7qRXDvvahcDGzVG7k-YmhTPiqAxNb8u2FXm9eQ4U9gVRJK_lsqeWeoJ1P/exec')
on conflict (key) do update set value = excluded.value;

-- 4. Trigger function: build a payload (with patient name) and POST it.
create or replace function public.sync_appointment_to_sheet()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  hook_url   text;
  pname      text;
  pphone     text;
begin
  select value into hook_url from public.app_config where key = 'sheets_webhook_url';
  -- No URL configured yet, or placeholder still in place: skip silently.
  if hook_url is null or hook_url like 'PASTE_%' then
    return new;
  end if;

  select full_name, phone into pname, pphone
  from public.patients where id = new.patient_id;

  perform net.http_post(
    url     := hook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'type', tg_op,
      'record', jsonb_build_object(
        'id', new.id,
        'patient_name', pname,
        'phone', pphone,
        'scheduled_at', new.scheduled_at,
        'status', new.status,
        'reason', new.reason,
        'created_at', new.created_at
      )
    )
  );

  return new;
end;
$$;

-- 5. Fire on insert and on update.
drop trigger if exists trg_appt_sheet_sync on public.appointments;
create trigger trg_appt_sheet_sync
  after insert or update on public.appointments
  for each row execute function public.sync_appointment_to_sheet();
