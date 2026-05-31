import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { SkeletonTable } from '../components/ui/Skeleton';

const NEXT_STATUS = { waiting: 'called', called: 'served' };

export default function WaitingList() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('waiting_list')
      .select('id, status, checked_in_at, called_at, patients(full_name, phone)')
      .in('status', ['waiting', 'called'])
      .order('checked_in_at');
    if (error) toast.error(error.message);
    else setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function advance(row) {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    const patch = { status: next };
    if (next === 'called') patch.called_at = new Date().toISOString();
    const { error } = await supabase.from('waiting_list').update(patch).eq('id', row.id);
    if (error) toast.error(error.message);
    else { toast.success(t('common.saved')); load(); }
  }

  async function remove(row) {
    const { error } = await supabase.from('waiting_list').update({ status: 'left' }).eq('id', row.id);
    if (error) toast.error(error.message);
    else load();
  }

  if (loading) return <SkeletonTable rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('nav.waiting')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, i) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                {i + 1}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                r.status === 'called' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {t(`appointment.${r.status === 'called' ? 'in_progress' : 'waiting'}`)}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-800">{r.patients?.full_name}</h3>
            <p className="text-sm text-gray-500">{r.patients?.phone || '—'}</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(r.checked_in_at).toLocaleTimeString()}
            </p>
            <div className="mt-4 flex gap-2">
              {NEXT_STATUS[r.status] && (
                <button onClick={() => advance(r)}
                  className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600">
                  {r.status === 'waiting' ? 'Call' : 'Serve'}
                </button>
              )}
              <button onClick={() => remove(r)}
                className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100">
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="col-span-full py-8 text-center text-gray-400">{t('common.noData')}</p>
        )}
      </div>
    </div>
  );
}
