import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconDashboard,
  IconCalendar,
  IconUsers,
  IconClock,
  IconChart,
  IconReport,
} from './icons';

const items = [
  { to: '/', key: 'dashboard', Icon: IconDashboard, end: true },
  { to: '/appointments', key: 'appointments', Icon: IconCalendar },
  { to: '/patients', key: 'patients', Icon: IconUsers },
  { to: '/waiting', key: 'waiting', Icon: IconClock },
  { to: '/analytics', key: 'analytics', Icon: IconChart },
  { to: '/reports', key: 'reports', Icon: IconReport },
];

export default function Sidebar({ collapsed, onNavigate }) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Main navigation"
      className={`flex h-full flex-col border-e border-gray-200 bg-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-white font-bold">
          C
        </span>
        {!collapsed && (
          <span className="truncate font-semibold text-gray-800">{t('app.name')}</span>
        )}
      </div>

      <ul className="flex-1 space-y-1 px-2 py-2">
        {items.map(({ to, key, Icon, end }) => (
          <li key={key}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon width={20} height={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{t(`nav.${key}`)}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
