import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import LanguageToggle from './LanguageToggle';
import { useAuth } from '../context/AuthContext';
import { IconMenu, IconLogout } from './icons';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <button
              className="cursor-pointer rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu width={20} height={20} />
            </button>
            <button
              className="hidden cursor-pointer rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:block"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
            >
              <IconMenu width={20} height={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <span className="hidden text-sm text-gray-600 sm:inline">
              {profile?.full_name}
            </span>
            <button
              onClick={signOut}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <IconLogout width={18} height={18} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
