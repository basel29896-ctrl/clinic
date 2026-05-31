import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { SkeletonTable } from '../components/ui/Skeleton';

export default function PatientDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [appts, setAppts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  async function loadDocs() {
    const { data } = await supabase
      .from('documents').select('*').eq('patient_id', id).order('uploaded_at', { ascending: false });
    setDocs(data || []);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, a, pr] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).single(),
        supabase.from('appointments').select('id, scheduled_at, status, reason').eq('patient_id', id).order('scheduled_at', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      setPatient(p.data);
      setAppts(a.data || []);
      setPrescriptions(pr.data || []);
      await loadDocs();
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('clinic-docs').upload(path, file);
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('documents').insert({
        patient_id: id,
        storage_path: path,
        label: file.name,
        type: 'other',
        uploaded_by: u.user?.id,
      });
      if (insErr) throw insErr;
      toast.success(t('common.saved'));
      loadDocs();
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function openDoc(path) {
    const { data, error } = await supabase.storage.from('clinic-docs').createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, '_blank');
  }

  if (loading) return <SkeletonTable rows={6} />;
  if (!patient) return <p className="text-gray-500">{t('common.noData')}</p>;

  return (
    <div className="space-y-6">
      <Link to="/patients" className="text-sm text-primary hover:underline">← {t('nav.patients')}</Link>
      <h1 className="text-2xl font-bold text-gray-800">{patient.full_name}</h1>

      {/* Profile */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-4">
        <Info label={t('patient.phone')} value={patient.phone} />
        <Info label={t('patient.email')} value={patient.email} />
        <Info label={t('patient.gender')} value={patient.gender && t(`patient.${patient.gender}`)} />
        <Info label={t('patient.age')} value={patient.age} />
        <Info label={t('patient.bloodType')} value={patient.blood_type} />
        <Info label={t('patient.allergies')} value={patient.allergies} />
        <Info label={t('patient.dob')} value={patient.date_of_birth} />
        <Info label={t('patient.address')} value={patient.address} />
      </div>

      {/* Appointments */}
      <Section title={t('nav.appointments')}>
        {appts.length === 0 ? <Empty /> : (
          <ul className="divide-y divide-gray-100">
            {appts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-gray-700">{new Date(a.scheduled_at).toLocaleString()} — {a.reason || '—'}</span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  <Link to={`/appointments/${a.id}/summary`} className="text-primary hover:underline">
                    {t('appointment.visitSummary')}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Prescriptions */}
      <Section title="Prescriptions">
        {prescriptions.length === 0 ? <Empty /> : (
          <ul className="divide-y divide-gray-100">
            {prescriptions.map((p) => (
              <li key={p.id} className="py-3 text-sm text-gray-700">
                <span className="font-medium">{p.medication}</span> — {p.dosage} · {p.frequency} · {p.duration}
                {p.instructions && <span className="text-gray-500"> ({p.instructions})</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Documents */}
      <Section
        title="Documents"
        action={
          <label className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
            {uploading ? t('common.loading') : `+ ${t('common.add')}`}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        }
      >
        {docs.length === 0 ? <Empty /> : (
          <ul className="divide-y divide-gray-100">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-gray-700">{d.label} <span className="text-gray-400">· {d.type}</span></span>
                <button onClick={() => openDoc(d.storage_path)} className="cursor-pointer text-primary hover:underline">
                  {t('common.openDoc')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
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

function Section({ title, action, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  const { t } = useTranslation();
  return <p className="py-4 text-center text-sm text-gray-400">{t('common.noData')}</p>;
}

const STATUS_CLS = {
  scheduled: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[status] || 'bg-gray-100 text-gray-600'}`}>
      {t(`appointment.${status}`)}
    </span>
  );
}
