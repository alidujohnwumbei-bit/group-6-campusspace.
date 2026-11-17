import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import { isAdminProfile } from '../services/campusService';
import type { UserProfile } from '../types';
import type { DashboardTab } from './OverviewView';

interface DashboardLayoutProps {
  profile: UserProfile;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenBookingModal: () => void;
  onLogout: () => Promise<void>;
  openEmergencyCount: number;
  pendingAdminCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  children: ReactNode;
}

const BASE_NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rooms', label: 'Venues & Search', icon: Building2 },
  { id: 'calendar', label: 'Availability Calendar', icon: Calendar },
  { id: 'bookings', label: 'My Bookings', icon: CalendarClock },
  { id: 'emergency', label: 'Emergency Dispatch', icon: AlertTriangle },
  { id: 'av', label: 'AV & Audio Gear', icon: Mic },
  { id: 'account', label: 'My Account', icon: UserCog },
];

export function DashboardLayout({
  profile,
  activeTab,
  onSelectTab,
  onOpenBookingModal,
  onLogout,
  openEmergencyCount,
  pendingAdminCount,
  darkMode,
  onToggleDarkMode,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = isAdminProfile(profile);
  const navItems = isAdmin
    ? [
        { id: 'admin' as DashboardTab, label: 'Admin Dashboard', icon: ShieldCheck },
        ...BASE_NAV_ITEMS,
      ]
    : BASE_NAV_ITEMS;

  const currentLabel =
    navItems.find((item) => item.id === activeTab)?.label ?? 'Dashboard';

  function handleNavClick(tab: DashboardTab) {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <span className="text-base font-bold tracking-tight text-[#0B2D5B] dark:text-white whitespace-nowrap shrink-0">
              CampusSpace UCC
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="p-4 space-y-1" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAdminItem = item.id === 'admin';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? isAdminItem
                        ? 'bg-[#0B2D5B] text-amber-300'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-[#0B2D5B] dark:text-blue-300'
                      : isAdminItem
                        ? 'text-[#0B2D5B] dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'emergency' && openEmergencyCount > 0 && (
                    <span className="font-mono text-xs text-red-600 dark:text-red-400 font-bold">
                      {openEmergencyCount}
                    </span>
                  )}
                  {item.id === 'admin' && pendingAdminCount > 0 && (
                    <span className="font-mono text-xs text-amber-600 dark:text-amber-300 font-bold">
                      {pendingAdminCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => handleNavClick('account')}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {profile.fullName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 capitalize">
              {profile.role} · <span className="font-mono">{profile.uccId}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline">CampusSpace UCC</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {currentLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenBookingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Request Venue</span>
            </button>

            <button
              type="button"
              onClick={() => void onLogout()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
