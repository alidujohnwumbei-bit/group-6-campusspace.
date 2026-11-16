import { Component, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Ban, Loader2, LogOut } from 'lucide-react';
import { auth } from './firebase';
import { INITIAL_UCC_ROOMS } from './data/seedRooms';
import {
  getUserProfile,
  seedInitialVenuesIfEmpty,
  subscribeActivityLogs,
  subscribeAllBookings,
  subscribeAllUsers,
  subscribeAvLogs,
  subscribeEmergencies,
  subscribeMyBookings,
  subscribeVenues,
  subscribeVenueSchedules,
} from './services/campusService';
import type {
  ActivityLog,
  AvLog,
  Booking,
  Classroom,
  EmergencyRequest,
  UserProfile,
  VenueSchedule,
} from './types';
import { AuthPortal } from './components/AuthPortal';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewView, type DashboardTab } from './components/OverviewView';
import { RoomsView } from './components/RoomsView';
import { CalendarView } from './components/CalendarView';
import { BookingsView } from './components/BookingsView';
import { EmergencyView } from './components/EmergencyView';
import { AvGearView } from './components/AvGearView';
import { AccountView } from './components/AccountView';
import { AdminDashboard } from './components/AdminDashboard';
import { BookingModal } from './components/BookingModal';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function readTabFromPathname(): DashboardTab {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.toLowerCase();
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  return 'overview';
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [venues, setVenues] = useState<Classroom[]>([]);
  const [schedules, setSchedules] = useState<VenueSchedule[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [avLogs, setAvLogs] = useState<AvLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<DashboardTab>(() => readTabFromPathname());
  const [bookingModalState, setBookingModalState] = useState<{
    room: Classroom | null;
    date?: string;
  } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('campusspace_theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('campusspace_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('campusspace_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    function handlePopState() {
      const next = readTabFromPathname();
      if (next === 'admin' && profile && profile.role !== 'admin') {
        window.history.replaceState({}, '', '/');
        setActiveTab('overview');
        return;
      }
      setActiveTab(next);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [profile]);

  function navigateTab(tab: DashboardTab) {
    if (tab === 'admin') {
      if (profile?.role !== 'admin') {
        if (window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
        setActiveTab('overview');
        return;
      }
      if (window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      }
    } else if (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
      window.history.pushState({}, '', '/');
    }
    setActiveTab(tab);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setAuthReady(true);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const existingProfile = await getUserProfile(user.uid);
        setProfile(existingProfile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setProfile(null);
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Guard /admin route: redirect non-admins immediately to home "/"
  useEffect(() => {
    if (!profile) return;
    const onAdminPath =
      window.location.pathname.toLowerCase() === '/admin' ||
      window.location.pathname.toLowerCase().startsWith('/admin/');
    if ((onAdminPath || activeTab === 'admin') && profile.role !== 'admin') {
      window.history.replaceState({}, '', '/');
      setActiveTab('overview');
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !profile || profile.disabled) {
      setVenues([]);
      setSchedules([]);
      setMyBookings([]);
      setAllBookings([]);
      setAllUsers([]);
      setActivityLogs([]);
      setEmergencies([]);
      setAvLogs([]);
      return;
    }

    let cancelled = false;
    setDataLoading(true);

    if (profile.role === 'admin') {
      void seedInitialVenuesIfEmpty(firebaseUser.uid).catch((err) => {
        console.error('Venue seed check error:', err);
      });
    }

    const unsubVenues = subscribeVenues((data) => {
      if (!cancelled) {
        setVenues(data);
        setDataLoading(false);
      }
    });
    const unsubSchedules = subscribeVenueSchedules((data) => {
      if (!cancelled) setSchedules(data);
    });
    const unsubMyBookings = subscribeMyBookings(firebaseUser.uid, (data) => {
      if (!cancelled) setMyBookings(data);
    });
    const unsubEmergencies = subscribeEmergencies((data) => {
      if (!cancelled) setEmergencies(data);
    });
    const unsubLogs = subscribeAvLogs((data) => {
      if (!cancelled) setAvLogs(data);
    });

    let unsubAllBookings = () => {};
    let unsubAllUsers = () => {};
    let unsubActivity = () => {};
    if (profile.role === 'admin') {
      unsubAllBookings = subscribeAllBookings((data) => {
        if (!cancelled) setAllBookings(data);
      });
      unsubAllUsers = subscribeAllUsers((data) => {
        if (!cancelled) setAllUsers(data);
      });
      unsubActivity = subscribeActivityLogs((data) => {
        if (!cancelled) setActivityLogs(data);
      });
    }

    return () => {
      cancelled = true;
      unsubVenues();
      unsubSchedules();
      unsubMyBookings();
      unsubEmergencies();
      unsubLogs();
      unsubAllBookings();
      unsubAllUsers();
      unsubActivity();
    };
  }, [authReady, firebaseUser, profile]);

  async function handleLogout() {
    await signOut(auth);
    setProfile(null);
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    setActiveTab('overview');
  }

  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin text-[#0B2D5B] dark:text-blue-400" />
        <p className="text-xs font-medium">Loading CampusSpace UCC...</p>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return (
      <AppErrorBoundary>
        <AuthPortal
          pendingGoogleUser={firebaseUser && !profile ? firebaseUser : null}
          onAuthComplete={(createdProfile) => {
            setProfile(createdProfile);
            if (window.location.pathname === '/admin' && createdProfile.role !== 'admin') {
              window.history.replaceState({}, '', '/');
              setActiveTab('overview');
            }
          }}
          onCancelPendingGoogle={() => {
            setFirebaseUser(null);
            setProfile(null);
          }}
        />
      </AppErrorBoundary>
    );
  }

  if (profile.disabled) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-center">
          <Ban className="h-8 w-8 text-red-600 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Account Disabled
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Your CampusSpace UCC account ({profile.email}) has been disabled by an administrator. Contact the CampusSpace Admin Office for reactivation.
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    );
  }

  const isFallbackCatalog = !dataLoading && venues.length === 0;
  const effectiveVenues: Classroom[] = isFallbackCatalog
    ? INITIAL_UCC_ROOMS.map((r) => ({ ...r, updatedBy: 'system' }))
    : venues;

  const openEmergencyCount = emergencies.filter((e) => e.status !== 'Resolved').length;
  const pendingAdminCount =
    profile.role === 'admin'
      ? allBookings.filter((b) => b.status === 'pending').length
      : 0;

  return (
    <AppErrorBoundary>
      <DashboardLayout
        profile={profile}
        activeTab={activeTab}
        onSelectTab={navigateTab}
        onOpenBookingModal={() => setBookingModalState({ room: null })}
        onLogout={handleLogout}
        openEmergencyCount={openEmergencyCount}
        pendingAdminCount={pendingAdminCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      >
        {activeTab === 'overview' && (
          <OverviewView
            profile={profile}
            rooms={effectiveVenues}
            bookings={myBookings}
            emergencies={emergencies}
            loading={dataLoading}
            onNavigate={navigateTab}
            onOpenBookingModal={(room) => setBookingModalState({ room: room ?? null })}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            rooms={effectiveVenues}
            schedules={schedules}
            profile={profile}
            isFallbackCatalog={isFallbackCatalog}
            onBookRoom={(room, date) => setBookingModalState({ room, date })}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            rooms={effectiveVenues}
            schedules={schedules}
            onRequestSlot={(room, date) => {
              if (!isFallbackCatalog) {
                setBookingModalState({ room, date });
              }
            }}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            bookings={myBookings}
            profile={profile}
            onNewBooking={() => setBookingModalState({ room: null })}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyView
            rooms={effectiveVenues}
            emergencies={emergencies}
            profile={profile}
          />
        )}

        {activeTab === 'av' && (
          <AvGearView
            rooms={effectiveVenues}
            avLogs={avLogs}
            profile={profile}
          />
        )}

        {activeTab === 'account' && (
          <AccountView
            profile={profile}
            onProfileUpdated={setProfile}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'admin' && profile.role === 'admin' && (
          <AdminDashboard
            profile={profile}
            venues={effectiveVenues}
            schedules={schedules}
            allBookings={allBookings}
            allUsers={allUsers}
            activityLogs={activityLogs}
          />
        )}

        {bookingModalState !== null && (
          <BookingModal
            rooms={effectiveVenues}
            initialRoom={bookingModalState.room}
            initialDate={bookingModalState.date}
            profile={profile}
            onClose={() => setBookingModalState(null)}
            onBooked={() => navigateTab('bookings')}
          />
        )}
      </DashboardLayout>
    </AppErrorBoundary>
  );
}
