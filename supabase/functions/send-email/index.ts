// Supabase Edge Function: send-email
// Deno runtime. Sends transactional email (e.g. appointment reminders,
// follow-up prompts) via Resend. Set secrets in the Supabase dashboard:
//   supabase secrets set RESEND_API_KEY=... CLINIC_FROM_EMAIL=...
//
// Deploy:
//   supabase functions deploy send-email
//
// Invoke from the client:
//   supabase.functions.invoke('send-email', { body: { to, subject, html } })

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('CLINIC_FROM_EMAIL') ?? 'clinic@example.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { to, subject, html } = (await req.json()) as EmailPayload;
    if (!to || !subject || !html) {
      return json({ error: 'Missing required fields: to, subject, html' }, 400);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.message ?? 'Email provider error' }, res.status);
    }

    return json({ success: true, id: data?.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
