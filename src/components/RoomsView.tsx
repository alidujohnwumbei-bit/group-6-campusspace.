import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Calendar, List, Loader2, Search, Unlock } from 'lucide-react';
import { db } from '../firebase';
import { adminReleaseVenue, timesOverlap } from '../services/campusService';
import {
  CAMPUS_ZONES,
  type Booking,
  type CampusZone,
  type Classroom,
  type RoomStatus,
  type UserProfile,
  type VenueSchedule,
} from '../types';
import { CalendarView } from './CalendarView';
import { StatusLabel } from './StatusLabel';

interface RoomsViewProps {
  rooms: Classroom[];
  schedules: VenueSchedule[];
  profile: UserProfile;
  isFallbackCatalog: boolean;
  onBookRoom: (room: Classroom, date?: string) => void;
}

const STATUS_FILTERS: Array<'All' | RoomStatus> = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Maintenance',
  'Emergency',
];

export function RoomsView({
  rooms,
  schedules,
  profile,
  isFallbackCatalog,
  onBookRoom,
}: RoomsViewProps) {
  const tomorrowDefault = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<'All' | RoomStatus>('All');
  const [zoneFilter, setZoneFilter] = useState<'All' | CampusZone>('All');
  const [search, setSearch] = useState('');
  const [slotDate, setSlotDate] = useState(tomorrowDefault);
  const [slotStart, setSlotStart] = useState('10:00');
  const [slotEnd, setSlotEnd] = useState('12:00');
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'bookings'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Booking, 'id'>),
        }));
        setLiveBookings(list);
      },
      () => {
        setLiveBookings([]);
      }
    );
    return () => unsub();
  }, []);

  function getSlotConflict(room: Classroom): Booking | null {
    return (
      liveBookings.find(
        (b) =>
          b.status !== 'rejected' &&
          b.status !== 'cancelled' &&
          (b.roomId === room.id ||
            b.roomCode.trim().toUpperCase() === room.code.trim().toUpperCase()) &&
          b.date === slotDate &&
          timesOverlap(slotStart, slotEnd, b.startTime, b.endTime)
      ) ?? null
    );
  }

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (zoneFilter !== 'All' && r.campusZone !== zoneFilter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.currentCourse.toLowerCase().includes(q) ||
        r.currentLecturer.toLowerCase().includes(q)
      );
    });
  }, [rooms, statusFilter, zoneFilter, search]);

  async function handleRelease(room: Classroom) {
    if (profile.role !== 'admin') return;
    setBusyRoomId(room.id);
    try {
      await adminReleaseVenue(room, profile);
    } finally {
      setBusyRoomId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            UCC Classrooms &amp; Venues
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse lecture theatres, search availability, inspect the calendar, or submit a booking request.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Venue List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Calendar View</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search venue, course, lecturer..."
                  className="pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-60 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value as 'All' | CampusZone)}
                aria-label="Filter by campus zone"
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Campus Zones</option>
                {CAMPUS_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {isFallbackCatalog && (
        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          Showing standard UCC venue preview. An administrator (<span className="font-mono">admin@ucc.edu.gh</span>) must sign in once to initialize the live Firestore venues collection before bookings can be stored.
        </div>
      )}

      {viewMode === 'calendar' ? (
        <CalendarView
          rooms={rooms}
          schedules={schedules}
          onRequestSlot={(room, date) => onBookRoom(room, date)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
              {STATUS_FILTERS.map((st) => {
                const count =
                  st === 'All' ? rooms.length : rooms.filter((r) => r.status === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
              <span className="font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Check Slot:
              </span>
              <input
                type="date"
                aria-label="Check date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <input
                type="time"
                aria-label="Check start time"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                className="px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                aria-label="Check end time"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                className="px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {filteredRooms.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No venues match your current filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
                    setZoneFilter('All');
                    setSearch('');
                  }}
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-6">Venue &amp; Building</th>
                      <th className="py-3.5 px-4">Zone</th>
                      <th className="py-3.5 px-4 text-right">Capacity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Active Session / Note</th>
                      <th className="py-3.5 px-4">AV Gear</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {filteredRooms.map((room) => {
                      const isBlocked = room.blocked || room.status === 'Maintenance';
                      const slotConflict = getSlotConflict(room);
                      const isBookedForSlot = Boolean(slotConflict);
                      return (
                        <tr
                          key={room.id}
                          className={
                            isBookedForSlot
                              ? 'bg-slate-100/80 dark:bg-slate-800/50 opacity-65 transition-colors'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'
                          }
                        >
                          <td className="py-3.5 px-6">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {room.code}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {room.name} · {room.building}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {room.campusZone}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                            {room.capacity}
                          </td>
                          <td className="py-3.5 px-4">
                            {isBookedForSlot ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                Booked
                              </span>
                            ) : (
                              <StatusLabel status={room.status} />
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {isBlocked ? (
                              <span className="text-amber-700 dark:text-amber-300 font-medium">
                                {room.maintenanceNote || 'Blocked for maintenance'}
                              </span>
                            ) : slotConflict ? (
                              <div>
                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                  Booked by {slotConflict.ownerName} ({slotConflict.courseCode})
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 font-mono">
                                  {slotConflict.date} · {slotConflict.startTime}–{slotConflict.endTime}
                                </div>
                              </div>
                            ) : room.currentCourse ? (
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {room.currentCourse}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                  {room.currentLecturer} · <span className="font-mono">{room.timeSlot}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">Open for booking requests</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-300">
                              Mic: <span className="font-mono tabular-nums">{room.micBattery}%</span> ({room.micStatus})
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">
                              Speaker: {room.speakerStatus}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="inline-flex items-center gap-2">
                              {!isBlocked && (
                                <button
                                  type="button"
                                  disabled={isFallbackCatalog || isBookedForSlot}
                                  onClick={() => onBookRoom(room, slotDate)}
                                  className={
                                    isBookedForSlot
                                      ? 'px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 cursor-not-allowed rounded-md whitespace-nowrap'
                                      : 'px-3 py-1.5 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap'
                                  }
                                >
                                  {isBookedForSlot ? 'Booked' : 'Request Booking'}
                                </button>
                              )}
                              {profile.role === 'admin' && room.status !== 'Available' && (
                                <button
                                  type="button"
                                  disabled={busyRoomId === room.id}
                                  onClick={() => handleRelease(room)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                                >
                                  {busyRoomId === room.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5" />
                                  )}
                                  <span>Release</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
