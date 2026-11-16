import { Component, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './firebase';
import {
  getUserProfile,
  seedInitialRoomsIfEmpty,
  subscribeAvLogs,
  subscribeBookings,
  subscribeEmergencies,
  subscribeRooms,
} from './services/campusService';
import type {
  AvLog,
  Booking,
  Classroom,
  EmergencyRequest,
  UserProfile,
} from './types';
import { AuthPortal } from './components/AuthPortal';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewView, type DashboardTab } from './components/OverviewView';
import { RoomsView } from './components/RoomsView';
import { BookingsView } from './components/BookingsView';
import { EmergencyView } from './components/EmergencyView';
import { AvGearView } from './components/AvGearView';
import { AccountView } from './components/AccountView';
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
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

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [avLogs, setAvLogs] = useState<AvLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [bookingModalRoom, setBookingModalRoom] = useState<Classroom | null | undefined>(undefined);
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

  useEffect(() => {
    if (!authReady || !firebaseUser || !profile) {
      setRooms([]);
      setBookings([]);
      setEmergencies([]);
      setAvLogs([]);
      return;
    }

    let cancelled = false;
    setDataLoading(true);

    void seedInitialRoomsIfEmpty(firebaseUser.uid).catch((err) => {
      console.error('Seed check error:', err);
    });

    const unsubRooms = subscribeRooms((data) => {
      if (!cancelled) {
        setRooms(data);
        setDataLoading(false);
      }
    });
    const unsubBookings = subscribeBookings((data) => {
      if (!cancelled) setBookings(data);
    });
    const unsubEmergencies = subscribeEmergencies((data) => {
      if (!cancelled) setEmergencies(data);
    });
    const unsubLogs = subscribeAvLogs((data) => {
      if (!cancelled) setAvLogs(data);
    });

    return () => {
      cancelled = true;
      unsubRooms();
      unsubBookings();
      unsubEmergencies();
      unsubLogs();
    };
  }, [authReady, firebaseUser, profile]);

  async function handleLogout() {
    await signOut(auth);
    setProfile(null);
    setActiveTab('overview');
  }

  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin text-blue-700 dark:text-blue-400" />
        <p className="text-xs font-medium">Loading CampusSpace UCC...</p>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return (
      <AppErrorBoundary>
        <AuthPortal
          pendingGoogleUser={firebaseUser && !profile ? firebaseUser : null}
          onAuthComplete={(createdProfile) => setProfile(createdProfile)}
          onCancelPendingGoogle={() => {
            setFirebaseUser(null);
            setProfile(null);
          }}
        />
      </AppErrorBoundary>
    );
  }

  const openEmergencyCount = emergencies.filter((e) => e.status !== 'Resolved').length;

  return (
    <AppErrorBoundary>
      <DashboardLayout
        profile={profile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenBookingModal={() => setBookingModalRoom(null)}
        onLogout={handleLogout}
        openEmergencyCount={openEmergencyCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      >
        {activeTab === 'overview' && (
          <OverviewView
            profile={profile}
            rooms={rooms}
            bookings={bookings}
            emergencies={emergencies}
            loading={dataLoading}
            onNavigate={setActiveTab}
            onOpenBookingModal={(room) => setBookingModalRoom(room ?? null)}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            rooms={rooms}
            onBookRoom={(room) => setBookingModalRoom(room)}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            bookings={bookings}
            profile={profile}
            onNewBooking={() => setBookingModalRoom(null)}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyView
            rooms={rooms}
            emergencies={emergencies}
            profile={profile}
          />
        )}

        {activeTab === 'av' && (
          <AvGearView
            rooms={rooms}
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

        {bookingModalRoom !== undefined && (
          <BookingModal
            rooms={rooms}
            initialRoom={bookingModalRoom}
            profile={profile}
            onClose={() => setBookingModalRoom(undefined)}
            onBooked={() => setActiveTab('bookings')}
          />
        )}
      </DashboardLayout>
    </AppErrorBoundary>
  );
}
