import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { SkeletonTable } from '../components/ui/Skeleton';
import ConfirmModal from '../components/ui/ConfirmModal';
import { StatusBadge } from './PatientDetail';

const schema = z.object({
  patient_id: z.string().uuid({ message: 'Select a patient' }),
  scheduled_at: z.string().min(1),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const STATUSES = ['scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'];

export default function Appointments() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [followUp, setFollowUp] = useState(null); // completed appt awaiting follow-up prompt

  async function load() {
    setLoading(true);
    const [a, p] = await Promise.all([
      supabase.from('appointments')
        .select('id, scheduled_at, status, reason, patient_id, patients(full_name)')
        .order('scheduled_at', { ascending: false }),
      supabase.from('patients').select('id, full_name').order('full_name'),
    ]);
    if (a.error) toast.error(a.error.message);
    setRows(a.data || []);
    setPatients(p.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(appt, status) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appt.id);
    if (error) return toast.error(error.message);
    toast.success(t('common.saved'));
    // After completing, prompt for follow-up booking.
    if (status === 'completed') setFollowUp(appt);
    // Entering waiting state adds to waiting list.
    if (status === 'waiting') {
      await supabase.from('waiting_list').insert({ appointment_id: appt.id, patient_id: appt.patient_id });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('nav.appointments')}</h1>
        <button onClick={() => setFormOpen(true)}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
          + {t('common.add')}
        </button>
      </div>

      {loading ? <SkeletonTable rows={6} cols={4} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t('appointment.scheduledAt')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('nav.patients')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('appointment.reason')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('appointment.status')}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(r.scheduled_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.patients?.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.reason || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-end">
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r, e.target.value)}
                      className="cursor-pointer rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{t(`appointment.${s}`)}</option>)}
                    </select>
                    <Link to={`/appointments/${r.id}/summary`} className="ms-3 text-primary hover:underline">
                      {t('appointment.visitSummary')}
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <AppointmentForm
          patients={patients}
          followUpOf={null}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}

      {/* Follow-up booking prompt */}
      <ConfirmModal
        open={!!followUp}
        danger={false}
        title={t('appointment.bookFollowUp')}
        message={t('appointment.bookFollowUp') + '?'}
        confirmLabel={t('common.add')}
        onCancel={() => setFollowUp(null)}
        onConfirm={() => { setFormOpen('followup'); }}
      />
      {formOpen === 'followup' && followUp && (
        <AppointmentForm
          patients={patients}
          followUpOf={followUp}
          onClose={() => { setFormOpen(false); setFollowUp(null); }}
          onSaved={() => { setFormOpen(false); setFollowUp(null); load(); }}
        />
      )}
    </div>
  );
}

function AppointmentForm({ patients, followUpOf, onClose, onSaved }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: followUpOf
      ? { patient_id: followUpOf.patient_id, reason: 'Follow-up' }
      : {},
  });

  async function onSubmit(values) {
    setSaving(true);
    const payload = {
      patient_id: values.patient_id,
      scheduled_at: new Date(values.scheduled_at).toISOString(),
      reason: values.reason || null,
      notes: values.notes || null,
      follow_up_of: followUpOf?.id || null,
    };
    const { error } = await supabase.from('appointments').insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(t('common.saved')); onSaved(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {followUpOf ? t('appointment.bookFollowUp') : t('common.add')}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('nav.patients')}</label>
            <select {...register('patient_id')} className={inputCls} disabled={!!followUpOf}>
              <option value="">—</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {errors.patient_id && <p className="mt-1 text-xs text-red-600">{errors.patient_id.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('appointment.scheduledAt')}</label>
            <input type="datetime-local" {...register('scheduled_at')} className={inputCls} />
            {errors.scheduled_at && <p className="mt-1 text-xs text-red-600">{t('common.required')}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('appointment.reason')}</label>
            <input {...register('reason')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('appointment.notes')}</label>
            <textarea {...register('notes')} rows={2} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
