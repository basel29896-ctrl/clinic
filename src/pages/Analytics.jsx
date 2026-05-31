import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { calcAge } from '../utils/age';
import { SkeletonTable } from '../components/ui/Skeleton';

const COLORS = ['#0EA5E9', '#0284C7', '#7DD3FC', '#0369A1', '#BAE6FD', '#38BDF8'];

export default function Analytics() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('appointments');
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, p] = await Promise.all([
        supabase.from('appointments').select('status, scheduled_at, reason'),
        supabase.from('patients').select('gender, date_of_birth, created_at'),
      ]);
      if (!active) return;
      setAppts(a.data || []);
      setPatients(p.data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // ---- Appointment analytics ----
  const byMonth = useMemo(() => {
    const m = {};
    appts.forEach((a) => {
      const key = new Date(a.scheduled_at).toISOString().slice(0, 7);
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).sort().map(([month, count]) => ({ month, count }));
  }, [appts]);

  const byStatus = useMemo(() => {
    const m = {};
    appts.forEach((a) => { m[a.status] = (m[a.status] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: t(`appointment.${k}`), value: v }));
  }, [appts, t]);

  // ---- Patient analytics ----
  const ageBuckets = useMemo(() => {
    const buckets = { '0-17': 0, '18-34': 0, '35-49': 0, '50-64': 0, '65+': 0 };
    patients.forEach((p) => {
      const a = calcAge(p.date_of_birth);
      if (a == null) return;
      if (a < 18) buckets['0-17']++;
      else if (a < 35) buckets['18-34']++;
      else if (a < 50) buckets['35-49']++;
      else if (a < 65) buckets['50-64']++;
      else buckets['65+']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [patients]);

  const growth = useMemo(() => {
    const m = {};
    patients.forEach((p) => {
      const key = new Date(p.created_at).toISOString().slice(0, 7);
      m[key] = (m[key] || 0) + 1;
    });
    let cum = 0;
    return Object.entries(m).sort().map(([month, n]) => { cum += n; return { month, total: cum }; });
  }, [patients]);

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('nav.analytics')}</h1>

      <div className="flex gap-2">
        {['appointments', 'patients'].map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === tk ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t(`nav.${tk}`)}
          </button>
        ))}
      </div>

      {tab === 'appointments' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={t('dashboard.apptsByStatus')}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Appointments per Month">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Age Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Patient Growth (Cumulative)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#0EA5E9" fill="#BAE6FD" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}
