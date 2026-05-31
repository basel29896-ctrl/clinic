import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { SkeletonTable } from '../components/ui/Skeleton';

// Printable per-appointment visit summary.
export default function VisitSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: a } = await supabase
        .from('appointments')
        .select('*, patients(full_name, phone, age, gender, blood_type, allergies)')
        .eq('id', id).single();
      const { data: pr } = await supabase
        .from('prescriptions').select('*').eq('appointment_id', id);
      if (!active) return;
      setAppt(a);
      setPrescriptions(pr || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <SkeletonTable rows={5} />;
  if (!appt) return <p className="text-gray-500">{t('common.noData')}</p>;

  const p = appt.patients;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="cursor-pointer text-sm text-primary hover:underline">← Back</button>
        <button onClick={() => window.print()}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
          {t('common.print')}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 print:border-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold text-gray-800">{t('appointment.visitSummary')}</h1>
          <span className="text-sm text-gray-500">{new Date(appt.scheduled_at).toLocaleString()}</span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Row label={t('patient.fullName')} value={p?.full_name} />
          <Row label={t('patient.phone')} value={p?.phone} />
          <Row label={t('patient.age')} value={p?.age} />
          <Row label={t('patient.gender')} value={p?.gender && t(`patient.${p.gender}`)} />
          <Row label={t('patient.bloodType')} value={p?.blood_type} />
          <Row label={t('patient.allergies')} value={p?.allergies} />
          <Row label={t('appointment.status')} value={t(`appointment.${appt.status}`)} />
          <Row label={t('appointment.reason')} value={appt.reason} />
        </dl>

        {appt.notes && (
          <div className="mt-6">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t('appointment.notes')}</h2>
            <p className="text-sm text-gray-600">{appt.notes}</p>
          </div>
        )}

        {prescriptions.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Prescriptions</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-start text-gray-500">
                <tr>
                  <th className="py-2 text-start">Medication</th>
                  <th className="py-2 text-start">Dosage</th>
                  <th className="py-2 text-start">Frequency</th>
                  <th className="py-2 text-start">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td className="py-2 text-gray-700">{rx.medication}</td>
                    <td className="py-2 text-gray-600">{rx.dosage}</td>
                    <td className="py-2 text-gray-600">{rx.frequency}</td>
                    <td className="py-2 text-gray-600">{rx.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-800">{value || '—'}</dd>
    </div>
  );
}
