import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import LanguageToggle from '../components/LanguageToggle';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit({ email, password }) {
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(t('auth.invalid'));
      setSubmitting(false);
      return;
    }
    // Route by role after profile loads.
    const { data } = await supabase.auth.getUser();
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    navigate(prof?.role === 'patient' ? '/patient' : '/', { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gray-100 p-4">
      <div className="absolute end-4 top-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
            C
          </span>
          <h1 className="text-xl font-semibold text-gray-800">{t('app.name')}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{t('common.required')}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{t('common.required')}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {submitting ? t('common.loading') : t('auth.signin')}
          </button>
        </form>
      </div>
    </div>
  );
}
