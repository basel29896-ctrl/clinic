import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { calcAge } from '../utils/age';
import { useAuth } from '../context/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import { SkeletonTable } from '../components/ui/Skeleton';
import { StatusBadge } from './PatientDetail';
import { IconLogout } from '../components/icons';

// Read-only portal for patients. RLS scopes all queries to their own records.
export default function PatientPortal() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [appts, setAppts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      // my_patient_id resolves via RLS; just select own rows.
      const { data: pats } = await supabase.from('patients').select('*').limit(1);
      const me = pats?.[0] || null;
      const [a, pr] = await Promise.all([
        supabase.from('appointments').select('id, scheduled_at, status, reason').order('scheduled_at', { ascending: false }),
        supabase.from('prescriptions').select('*').order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      setPatient(me);
      setAppts(a.data || []);
      setPrescriptions(pr.data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
        <h1 className="font-semibold text-gray-800">{t('app.name')}</h1>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <span className="hidden text-sm text-gray-600 sm:inline">{profile?.full_name}</span>
          <button onClick={signOut}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
            <IconLogout width={18} height={18} />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        {loading ? <SkeletonTable rows={6} /> : (
          <>
            {patient && (
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-4">
                <Info label={t('patient.fullName')} value={patient.full_name} />
                <Info label={t('patient.age')} value={calcAge(patient.date_of_birth)} />
                <Info label={t('patient.bloodType')} value={patient.blood_type} />
                <Info label={t('patient.allergies')} value={patient.allergies} />
              </div>
            )}

            <Section title={t('nav.appointments')}>
              {appts.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-gray-100">
                  {appts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="text-gray-700">{new Date(a.scheduled_at).toLocaleString()} — {a.reason || '—'}</span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Prescriptions">
              {prescriptions.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-gray-100">
                  {prescriptions.map((p) => (
                    <li key={p.id} className="py-3 text-sm text-gray-700">
                      <span className="font-medium">{p.medication}</span> — {p.dosage} · {p.frequency} · {p.duration}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || '—'}</dd>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}
function Empty() {
  const { t } = useTranslation();
  return <p className="py-4 text-center text-sm text-gray-400">{t('common.noData')}</p>;
}
