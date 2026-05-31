# Clinic Manager

Single-doctor medical clinic web app. Admin/receptionist console + read-only patient portal.

**Stack:** React + Vite + Tailwind · Supabase (Postgres, Auth, Storage, Edge Functions) · Recharts · xlsx · jsPDF · i18next (Arabic/English).

---

## Features

- Role-based access: **admin** (full CRUD) + **patient** (read-only `/patient` portal), enforced by RLS via `profiles.role`.
- Overview dashboard: KPIs + charts (status bar, gender pie, 30-day trend).
- Appointment & patient analytics dashboards.
- Patient CRUD with profile, appointment history, prescriptions, document upload (Supabase Storage).
- Appointment booking with status workflow; **follow-up booking prompt** after completing a visit.
- Waiting list management (check-in → call → serve).
- Printable per-appointment **visit summary**.
- Report generator with date range → export **Excel** + **PDF**.
- Age auto-calculated from `date_of_birth` (Postgres generated column).
- Bilingual Arabic/English toggle with RTL support.
- React Hook Form + Zod validation, react-hot-toast, loading skeletons, confirmation modals.

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` — tables, indexes, triggers, RLS policies, storage bucket.
   - `supabase/seed.sql` — 5 patients + 10 appointments (optional demo data).
3. Create the admin login:
   - **Authentication → Users → Add user** (email + password). Confirm the user.
   - The `handle_new_user` trigger creates a `profiles` row (default role `patient`). Promote it:
     ```sql
     update public.profiles set role = 'admin' where email = 'admin@clinic.test';
     ```
4. (Optional) Link a patient login to a patient record so the portal shows data:
   ```sql
   update public.patients
   set profile_id = (select id from public.profiles where email = 'ahmed@example.com')
   where email = 'ahmed@example.com';
   ```
5. Storage bucket `clinic-docs` is created by the migration (private, admin-only).

### Email Edge Function (optional)

```bash
supabase login
supabase link --project-ref <your-ref>
supabase secrets set RESEND_API_KEY=<key> CLINIC_FROM_EMAIL=clinic@yourdomain.com
supabase functions deploy send-email
```

---

## 2. Environment Variables

Copy `.env.example` → `.env` and fill in:

| Var | Where | Description |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | client (.env) | Project URL |
| `VITE_SUPABASE_ANON_KEY` | client (.env) | Anon public key |
| `RESEND_API_KEY` | Supabase secrets | Email provider key (Edge Function) |
| `CLINIC_FROM_EMAIL` | Supabase secrets | Verified sender address |

> Only `VITE_`-prefixed vars reach the browser. Email secrets stay server-side in the Edge Function.

---

## 3. Local Development

```bash
npm install
cp .env.example .env   # then edit values
npm run dev            # http://localhost:5173
```

Build / preview:

```bash
npm run build
npm run preview
```

---

## 4. Deploy (Vercel)

1. Import the repo in Vercel.
2. Set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Framework preset: **Vite**. `vercel.json` handles SPA routing rewrites.
4. Deploy.

---

## Project Structure

```
supabase/
  migrations/0001_init.sql   # schema + RLS
  seed.sql                   # demo data
  functions/send-email/      # Deno Edge Function
src/
  lib/supabaseClient.js
  context/AuthContext.jsx
  components/                # Layout, Sidebar, ui/*, icons
  pages/                     # Dashboard, Appointments, Patients, etc.
  utils/                     # exportToExcel, exportToPDF, age
  i18n/                      # en.json, ar.json
```

---

## Notes / Deviations

- Date range in the report generator uses two native `<input type="date">` fields instead of `react-daterange-picker` (zero extra dependency, fully accessible). Swap in the library if preferred.
- Appointments use a sortable list view with a booking modal rather than a full month-grid calendar. The schema (`scheduled_at`) supports a calendar view if you add one.
- Patient portal reads own records via RLS (`my_patient_id()`); no client-side filtering needed.
