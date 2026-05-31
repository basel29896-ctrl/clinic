import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import StatCard from '../components/ui/StatCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { IconUsers, IconCalendar, IconClock, IconCheck } from '../components/icons';

const COLORS = ['#0EA5E9', '#0284C7', '#7DD3FC', '#0369A1', '#BAE6FD', '#94A3B8'];

export default function Dashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ patients: 0, today: 0, waiting: 0, completed: 0 });
  const [byStatus, setByStatus] = useState([]);
  const [trend, setTrend] = useState([]);
  const [byGender, setByGender] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const now = new Date();
        const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const start30 = new Date(now); start30.setDate(start30.getDate() - 30);

        const [patientsRes, apptsRes] = await Promise.all([
          supabase.from('patients').select('id, gender'),
          supabase.from('appointments').select('id, status, scheduled_at'),
        ]);
        if (patientsRes.error) throw patientsRes.error;
        if (apptsRes.error) throw apptsRes.error;

        const patients = patientsRes.data || [];
        const appts = apptsRes.data || [];

        const today = appts.filter((a) => {
          const d = new Date(a.scheduled_at);
          return d >= startToday && d < endToday;
        }).length;
        const waiting = appts.filter((a) => a.status === 'waiting').length;
        const completed = appts.filter(
          (a) => a.status === 'completed' && new Date(a.scheduled_at) >= startMonth
        ).length;

        // Group by status
        const statusMap = {};
        appts.forEach((a) => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
        const statusData = Object.entries(statusMap).map(([k, v]) => ({
          name: t(`appointment.${k}`), value: v,
        }));

        // 30-day trend
        const days = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date(start30); d.setDate(d.getDate() + i);
          days[d.toISOString().slice(0, 10)] = 0;
        }
        appts.forEach((a) => {
          const key = new Date(a.scheduled_at).toISOString().slice(0, 10);
          if (key in days) days[key] += 1;
        });
        const trendData = Object.entries(days).map(([date, count]) => ({
          date: date.slice(5), count,
        }));

        // Gender split
        const genderMap = {};
        patients.forEach((p) => {
          const g = p.gender || 'other';
          genderMap[g] = (genderMap[g] || 0) + 1;
        });
        const genderData = Object.entries(genderMap).map(([k, v]) => ({
          name: t(`patient.${k}`), value: v,
        }));

        if (!active) return;
        setKpis({ patients: patients.length, today, waiting, completed });
        setByStatus(statusData);
        setTrend(trendData);
        setByGender(genderData);
      } catch (e) {
        console.error('Dashboard load failed:', e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [t]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('dashboard.totalPatients')} value={kpis.patients} icon={<IconUsers width={22} height={22} />} />
        <StatCard label={t('dashboard.todayAppointments')} value={kpis.today} icon={<IconCalendar width={22} height={22} />} />
        <StatCard label={t('dashboard.waiting')} value={kpis.waiting} icon={<IconClock width={22} height={22} />} />
        <StatCard label={t('dashboard.completedThisMonth')} value={kpis.completed} icon={<IconCheck width={22} height={22} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={t('dashboard.apptsByStatus')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.patientsByGender')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byGender} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {byGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.apptsTrend')} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0EA5E9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}
