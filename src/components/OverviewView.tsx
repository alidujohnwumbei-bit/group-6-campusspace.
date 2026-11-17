import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  DoorOpen,
  Mic,
  Plus,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { isAdminProfile } from '../services/campusService';
import {
  CAMPUS_ZONES,
  type Booking,
  type Classroom,
  type EmergencyRequest,
  type UserProfile,
} from '../types';
import { BookingStatusBadge, StatusLabel } from './StatusLabel';

export type DashboardTab =
  | 'overview'
  | 'rooms'
  | 'calendar'
  | 'bookings'
  | 'emergency'
  | 'av'
  | 'account'
  | 'admin';

interface OverviewViewProps {
  profile: UserProfile;
  rooms: Classroom[];
  bookings: Booking[];
  emergencies: EmergencyRequest[];
  loading: boolean;
  onNavigate: (tab: DashboardTab) => void;
  onOpenBookingModal: (room?: Classroom) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OverviewView({
  profile,
  rooms,
  bookings,
  emergencies,
  loading,
  onNavigate,
  onOpenBookingModal,
}: OverviewViewProps) {
  const totalRooms = rooms.length;
  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  const reservedCount = rooms.filter((r) => r.status === 'Reserved').length;
  const emergencyRoomsCount = rooms.filter((r) => r.status === 'Emergency').length;

  const avReadyCount = rooms.filter(
    (r) => r.micStatus === 'Ready' && r.speakerStatus === 'Operational'
  ).length;
  const avReadyPct = totalRooms > 0 ? Math.round((avReadyCount / totalRooms) * 100) : 0;

  const openEmergencies = emergencies.filter((e) => e.status !== 'Resolved');
  const avAttentionRooms = rooms.filter(
    (r) =>
      r.micStatus === 'Low Battery' ||
      r.micStatus === 'Faulty' ||
      r.speakerStatus === 'Faulty' ||
      r.speakerStatus === 'Maintenance' ||
      r.micBattery < 30
  );

  const recentBookings = bookings.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="lg:col-span-5 h-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Strip */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="capitalize font-semibold text-[#0B2D5B] dark:text-amber-300">
              {profile.role}
            </span>
            <span aria-hidden="true">·</span>
            <span>{profile.department}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{profile.uccId}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getGreeting()}, {profile.fullName}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Live snapshot across {totalRooms} University of Cape Coast lecture halls and instructional audio units.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isAdminProfile(profile) && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('emergency')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Emergency Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBookingModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Request Venue</span>
          </button>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Available Now</span>
            <DoorOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {availableCount}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              / {totalRooms} venues
            </span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Open for booking requests
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Occupied Classes</span>
            <Radio className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {occupiedCount}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              in session
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Active lectures currently underway
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Reserved &amp; Emergency</span>
            <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {reservedCount}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              reserved · {emergencyRoomsCount} alert
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {openEmergencies.length} open emergency tickets
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>AV Gear Readiness</span>
            <Mic className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {avReadyPct}%
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {avReadyCount}/{totalRooms} venues
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {avAttentionRooms.length} venues need battery or speaker service
          </p>
        </div>
      </section>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Campus Zone Utilization + Live Venue Snapshot */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Campus Zone Occupancy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Venue availability distribution across UCC academic zones
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Availability Calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {CAMPUS_ZONES.map((zone) => {
                const zoneRooms = rooms.filter((r) => r.campusZone === zone);
                const total = zoneRooms.length;
                const avail = zoneRooms.filter((r) => r.status === 'Available').length;
                const active = total - avail;
                const pct = total > 0 ? Math.round((active / total) * 100) : 0;

                return (
                  <div key={zone} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {zone}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {avail} free · {active} busy / {total} total ({pct}% utilized)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0B2D5B] dark:bg-blue-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Live Venue Snapshot
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Current status and wireless mic battery levels
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('rooms')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                All Venues
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">Venue</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Course / Assignment</th>
                    <th className="py-3 px-4 text-right">Mic</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {rooms.slice(0, 6).map((room) => (
                    <tr
                      key={room.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {room.code}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {room.campusZone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={room.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="truncate max-w-[190px]">
                          {room.currentCourse || 'Open for booking requests'}
                        </div>
                        {room.timeSlot && (
                          <div className="font-mono text-slate-400">{room.timeSlot}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {room.micBattery}%
                      </td>
                      <td className="py-3 px-6 text-right">
                        {!room.blocked && room.status !== 'Maintenance' ? (
                          <button
                            type="button"
                            onClick={() => onOpenBookingModal(room)}
                            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                          >
                            Request
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Blocked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Attention Queue + My Recent Bookings */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  AV &amp; Emergency Attention Queue
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Venues with active incidents or low audio readiness
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('av')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                AV Console
              </button>
            </div>

            {openEmergencies.length === 0 && avAttentionRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                All classrooms and audio systems are operating nominally.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {openEmergencies.slice(0, 3).map((em) => (
                  <div key={em.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {em.roomCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <StatusLabel status={em.urgency} />
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {em.issueType}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {em.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('emergency')}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      Handle
                    </button>
                  </div>
                ))}

                {avAttentionRooms.slice(0, 4).map((room) => (
                  <div key={room.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {room.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          Mic {room.micBattery}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Mic: {room.micStatus} · Speaker: {room.speakerStatus}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('av')}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  My Recent Bookings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest venue requests and approval status
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('bookings')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                My Bookings
              </button>
            </div>

            {recentBookings.length === 0 ? (
              <div className="py-8 text-center space-y-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No booking requests yet. Request your first UCC venue.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenBookingModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Request Venue</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentBookings.map((b) => (
                  <div key={b.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {b.roomCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {b.courseCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {b.date} ({b.startTime}–{b.endTime})
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
