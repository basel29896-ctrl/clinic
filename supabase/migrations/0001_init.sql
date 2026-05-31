-- ============================================================
-- Single-Doctor Clinic — Initial Migration
-- Postgres / Supabase. RLS enabled on all tables.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('admin', 'patient');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_type as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum
    ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum ('lab_result', 'scan', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type waiting_status as enum ('waiting', 'called', 'served', 'left');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 1. profiles  (mirror of auth.users + role)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  email       text,
  role        user_role not null default 'patient',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2. patients
-- ============================================================
create table if not exists public.patients (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete set null,
  full_name     text not null,
  phone         text,
  email         text,
  gender        gender_type,
  date_of_birth date,
  address       text,
  blood_type    text,
  allergies     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint dob_not_future check (date_of_birth is null or date_of_birth <= current_date)
);

alter table public.patients
  add column if not exists age int
  generated always as (
    case when date_of_birth is null then null
    else date_part('year', age(date_of_birth))::int end
  ) stored;

-- ============================================================
-- 3. appointments
-- ============================================================
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  scheduled_at  timestamptz not null,
  status        appointment_status not null default 'scheduled',
  reason        text,
  notes         text,
  follow_up_of  uuid references public.appointments(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 4. prescriptions
-- ============================================================
create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references public.appointments(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  medication      text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 5. documents  (Storage object pointers)
-- ============================================================
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  appointment_id  uuid references public.appointments(id) on delete set null,
  type            document_type not null default 'other',
  label           text,
  storage_path    text not null,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  uploaded_at     timestamptz not null default now()
);

-- ============================================================
-- 6. waiting_list
-- ============================================================
create table if not exists public.waiting_list (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references public.appointments(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  status          waiting_status not null default 'waiting',
  checked_in_at   timestamptz not null default now(),
  called_at       timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_patients_profile      on public.patients(profile_id);
create index if not exists idx_patients_full_name     on public.patients(full_name);
create index if not exists idx_appts_patient          on public.appointments(patient_id);
create index if not exists idx_appts_scheduled_at     on public.appointments(scheduled_at);
create index if not exists idx_appts_status           on public.appointments(status);
create index if not exists idx_appts_followup         on public.appointments(follow_up_of);
create index if not exists idx_presc_patient          on public.prescriptions(patient_id);
create index if not exists idx_presc_appt             on public.prescriptions(appointment_id);
create index if not exists idx_docs_patient           on public.documents(patient_id);
create index if not exists idx_docs_appt              on public.documents(appointment_id);
create index if not exists idx_wait_status            on public.waiting_list(status);
create index if not exists idx_wait_patient           on public.waiting_list(patient_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','patients','appointments'] loop
    execute format('drop trigger if exists trg_%s_updated on public.%I;', t, t);
    execute format(
      'create trigger trg_%s_updated before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================
-- New-user hook: auto-create profile row
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helpers (SECURITY DEFINER avoids RLS recursion)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_patient_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.patients where profile_id = auth.uid() limit 1;
$$;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.patients      enable row level security;
alter table public.appointments  enable row level security;
alter table public.prescriptions enable row level security;
alter table public.documents     enable row level security;
alter table public.waiting_list  enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'patient');

-- ---------- patients ----------
drop policy if exists patients_admin_all on public.patients;
create policy patients_admin_all on public.patients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists patients_self_read on public.patients;
create policy patients_self_read on public.patients
  for select using (profile_id = auth.uid());

-- ---------- appointments ----------
drop policy if exists appts_admin_all on public.appointments;
create policy appts_admin_all on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists appts_self_read on public.appointments;
create policy appts_self_read on public.appointments
  for select using (patient_id = public.my_patient_id());

-- ---------- prescriptions ----------
drop policy if exists presc_admin_all on public.prescriptions;
create policy presc_admin_all on public.prescriptions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists presc_self_read on public.prescriptions;
create policy presc_self_read on public.prescriptions
  for select using (patient_id = public.my_patient_id());

-- ---------- documents ----------
drop policy if exists docs_admin_all on public.documents;
create policy docs_admin_all on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists docs_self_read on public.documents;
create policy docs_self_read on public.documents
  for select using (patient_id = public.my_patient_id());

-- ---------- waiting_list ----------
drop policy if exists wait_admin_all on public.waiting_list;
create policy wait_admin_all on public.waiting_list
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists wait_self_read on public.waiting_list;
create policy wait_self_read on public.waiting_list
  for select using (patient_id = public.my_patient_id());

-- ============================================================
-- Storage bucket for documents + policies
-- ============================================================
insert into storage.buckets (id, name, public)
values ('clinic-docs', 'clinic-docs', false)
on conflict (id) do nothing;

drop policy if exists docs_storage_admin on storage.objects;
create policy docs_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'clinic-docs' and public.is_admin())
  with check (bucket_id = 'clinic-docs' and public.is_admin());
