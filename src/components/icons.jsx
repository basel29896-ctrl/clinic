// Minimal inline SVG icon set (Heroicons outline, 24x24). No emojis.
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconDashboard = (p) => (<svg {...base} {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>);
export const IconCalendar = (p) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
export const IconUsers = (p) => (<svg {...base} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
export const IconClock = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>);
export const IconChart = (p) => (<svg {...base} {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/></svg>);
export const IconReport = (p) => (<svg {...base} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>);
export const IconLogout = (p) => (<svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>);
export const IconMenu = (p) => (<svg {...base} {...p}><path d="M3 12h18M3 6h18M3 18h18"/></svg>);
export const IconCheck = (p) => (<svg {...base} {...p}><path d="M20 6L9 17l-5-5"/></svg>);
