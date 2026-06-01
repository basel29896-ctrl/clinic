# Google Sheets Sync — Setup

Auto-syncs every appointment (new or status change) into a Google Sheet.
Flow: `appointments` row change → Postgres trigger (`pg_net`) → Apps Script Web App → Sheet row (upsert by appointment id).

No Google API keys or service accounts. One-way: **DB → Sheet**.

---

## 1. Create the Sheet + Apps Script

1. Create a new Google Sheet (any name).
2. **Extensions → Apps Script**.
3. Delete the starter code. Paste the full contents of `Code.gs` (this folder).
4. **Save** (disk icon).

## 2. Deploy as Web App

1. Top-right **Deploy → New deployment**.
2. Gear icon → select type **Web app**.
3. Settings:
   - **Description**: clinic sync
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**  ← required so Supabase can POST without auth
4. **Deploy** → authorize (pick your Google account → Advanced → Allow).
5. Copy the **Web app URL** (ends in `/exec`).

> Re-deploying later: use **Manage deployments → edit → Version: New version**, so the URL stays the same.

## 3. Wire up Supabase

1. SQL Editor → run the full `supabase/migrations/0002_sheets_sync.sql`.
2. Paste your Web App URL — run this with your real URL:
   ```sql
   update public.app_config
   set value = 'https://script.google.com/macros/s/XXXX/exec'
   where key = 'sheets_webhook_url';
   ```

## 4. Test

Create or update an appointment in the app (or directly):
```sql
update public.appointments set status = 'completed'
where id = (select id from public.appointments limit 1);
```
Check the Sheet — an `Appointments` tab appears with a row. Status changes update the same row (matched by `id`).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No rows appear | URL still placeholder | re-run the `update app_config` with real `/exec` URL |
| Nothing syncs | Apps Script access not "Anyone" | redeploy with correct access |
| Check delivery | inspect HTTP calls | `select * from net._http_response order by created desc limit 5;` |
| Auth error in Apps Script logs | "Execute as" wrong | set to **Me** |

## Notes

- One-way only. Editing the Sheet does NOT change the database.
- To also sync deletions, add a separate `after delete` trigger that posts `{type:'DELETE', record:{id}}` and have `doPost` remove the matching row.
- Payload includes patient name/phone via a join in the trigger — no extra lookup needed in the Sheet.
