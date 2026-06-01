-- ============================================================
-- Extend Google Sheets sync to patients + tag each payload with
-- its target sheet/tab. Run AFTER 0002_sheets_sync.sql.
-- ============================================================

-- Appointments: add the 'sheet' key so the Apps Script routes it.
create or replace function public.sync_appointment_to_sheet()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  hook_url text;
  pname    text;
  pphone   text;
begin
  select value into hook_url from public.app_config where key = 'sheets_webhook_url';
  if hook_url is null or hook_url like 'PASTE_%' then
    return new;
  end if;

  select full_name, phone into pname, pphone
  from public.patients where id = new.patient_id;

  perform net.http_post(
    url     := hook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'sheet', 'Appointments',
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

-- Patients sync function.
create or replace function public.sync_patient_to_sheet()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  hook_url text;
begin
  select value into hook_url from public.app_config where key = 'sheets_webhook_url';
  if hook_url is null or hook_url like 'PASTE_%' then
    return new;
  end if;

  perform net.http_post(
    url     := hook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'sheet', 'Patients',
      'type', tg_op,
      'record', jsonb_build_object(
        'id', new.id,
        'full_name', new.full_name,
        'phone', new.phone,
        'email', new.email,
        'gender', new.gender,
        'date_of_birth', new.date_of_birth,
        'blood_type', new.blood_type,
        'allergies', new.allergies,
        'created_at', new.created_at
      )
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_patient_sheet_sync on public.patients;
create trigger trg_patient_sheet_sync
  after insert or update on public.patients
  for each row execute function public.sync_patient_to_sheet();
