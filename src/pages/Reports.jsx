import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

// Report definitions: which table + how to flatten each row.
const REPORTS = {
  appointments: {
    label: 'Appointments',
    table: 'appointments',
    select: 'scheduled_at, status, reason, notes, patients(full_name, phone)',
    dateCol: 'scheduled_at',
    columns: ['Date', 'Patient', 'Phone', 'Status', 'Reason'],
    map: (r) => ({
      Date: new Date(r.scheduled_at).toLocaleString(),
      Patient: r.patients?.full_name ?? '',
      Phone: r.patients?.phone ?? '',
      Status: r.status,
      Reason: r.reason ?? '',
    }),
  },
  patients: {
    label: 'Patients',
    table: 'patients',
    select: 'full_name, phone, email, gender, age, blood_type, created_at',
    dateCol: 'created_at',
    columns: ['Name', 'Phone', 'Email', 'Gender', 'Age', 'Blood Type'],
    map: (r) => ({
      Name: r.full_name,
      Phone: r.phone ?? '',
      Email: r.email ?? '',
      Gender: r.gender ?? '',
      Age: r.age ?? '',
      'Blood Type': r.blood_type ?? '',
    }),
  },
};

export default function Reports() {
  const { t } = useTranslation();
  const [type, setType] = useState('appointments');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchRows() {
    const cfg = REPORTS[type];
    let q = supabase.from(cfg.table).select(cfg.select);
    if (from) q = q.gte(cfg.dateCol, new Date(from).toISOString());
    if (to) {
      const end = new Date(to); end.setDate(end.getDate() + 1);
      q = q.lt(cfg.dateCol, end.toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(cfg.map);
  }

  async function handleExcel() {
    setLoading(true);
    try {
      const rows = await fetchRows();
      if (rows.length === 0) return toast.error(t('common.noData'));
      exportToExcel(rows, `${type}-report`, REPORTS[type].label);
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(e.message || t('common.error'));
    } finally { setLoading(false); }
  }

  async function handlePDF() {
    setLoading(true);
    try {
      const rows = await fetchRows();
      if (rows.length === 0) return toast.error(t('common.noData'));
      const cfg = REPORTS[type];
      exportToPDF({
        title: `${cfg.label} Report`,
        columns: cfg.columns,
        rows: rows.map((r) => cfg.columns.map((c) => String(r[c] ?? ''))),
        filename: `${type}-report`,
      });
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(e.message || t('common.error'));
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('nav.reports')}</h1>

      <div className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Report Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(REPORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleExcel} disabled={loading}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
            {t('common.exportExcel')}
          </button>
          <button onClick={handlePDF} disabled={loading}
            className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60">
            {t('common.exportPDF')}
          </button>
        </div>
      </div>
    </div>
  );
}
