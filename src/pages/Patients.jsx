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

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  blood_type: z.string().optional(),
  allergies: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export default function Patients() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, email, gender, age, blood_type')
      .order('full_name');
    if (error) toast.error(error.message);
    else setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').includes(search)
  );

  async function handleDelete() {
    const { error } = await supabase.from('patients').delete().eq('id', toDelete.id);
    if (error) toast.error(error.message);
    else { toast.success(t('common.deleted')); load(); }
    setToDelete(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{t('nav.patients')}</h1>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          + {t('common.add')}
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('common.search')}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-start text-gray-600">
              <tr>
                <Th>{t('patient.fullName')}</Th>
                <Th>{t('patient.phone')}</Th>
                <Th>{t('patient.gender')}</Th>
                <Th>{t('patient.age')}</Th>
                <Th>{t('patient.bloodType')}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link to={`/patients/${r.id}`} className="hover:text-primary">{r.full_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.gender ? t(`patient.${r.gender}`) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.age ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.blood_type || '—'}</td>
                  <td className="px-4 py-3 text-end">
                    <button onClick={() => { setEditing(r); setFormOpen(true); }}
                      className="cursor-pointer text-primary hover:underline">{t('common.edit')}</button>
                    <button onClick={() => setToDelete(r)}
                      className="ms-3 cursor-pointer text-red-600 hover:underline">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <PatientForm
          schema={schema}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}

      <ConfirmModal
        open={!!toDelete}
        message={t('common.confirmDelete')}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-start font-semibold">{children}</th>;
}

function PatientForm({ schema, editing, onClose, onSaved }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: editing || {} });

  async function onSubmit(values) {
    setSaving(true);
    // Strip empty strings so optional cols stay null.
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
    );
    const res = editing
      ? await supabase.from('patients').update(payload).eq('id', editing.id)
      : await supabase.from('patients').insert(payload);
    if (res.error) toast.error(res.error.message);
    else { toast.success(t('common.saved')); onSaved(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {editing ? t('common.edit') : t('common.add')} — {t('nav.patients')}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <Field label={t('patient.fullName')} error={errors.full_name} full>
            <input {...register('full_name')} className={inputCls} />
          </Field>
          <Field label={t('patient.phone')}><input {...register('phone')} className={inputCls} /></Field>
          <Field label={t('patient.email')} error={errors.email}><input {...register('email')} className={inputCls} /></Field>
          <Field label={t('patient.gender')}>
            <select {...register('gender')} className={inputCls}>
              <option value="">—</option>
              <option value="male">{t('patient.male')}</option>
              <option value="female">{t('patient.female')}</option>
              <option value="other">{t('patient.other')}</option>
            </select>
          </Field>
          <Field label={t('patient.dob')}><input type="date" {...register('date_of_birth')} className={inputCls} /></Field>
          <Field label={t('patient.bloodType')}><input {...register('blood_type')} className={inputCls} /></Field>
          <Field label={t('patient.allergies')}><input {...register('allergies')} className={inputCls} /></Field>
          <Field label={t('patient.address')} full><input {...register('address')} className={inputCls} /></Field>
          <Field label={t('patient.notes')} full><textarea {...register('notes')} rows={2} className={inputCls} /></Field>

          <div className="col-span-2 mt-2 flex justify-end gap-3">
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

function Field({ label, children, error, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </div>
  );
}
