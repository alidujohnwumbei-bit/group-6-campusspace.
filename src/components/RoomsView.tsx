import { useMemo, useState } from 'react';
import { Loader2, Search, Unlock } from 'lucide-react';
import { releaseRoomQuick } from '../services/campusService';
import { CAMPUS_ZONES, type CampusZone, type Classroom, type RoomStatus } from '../types';
import { StatusLabel } from './StatusLabel';

interface RoomsViewProps {
  rooms: Classroom[];
  onBookRoom: (room: Classroom) => void;
}

const STATUS_FILTERS: Array<'All' | RoomStatus> = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Emergency',
];

export function RoomsView({ rooms, onBookRoom }: RoomsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | RoomStatus>('All');
  const [zoneFilter, setZoneFilter] = useState<'All' | CampusZone>('All');
  const [search, setSearch] = useState('');
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);

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
    setBusyRoomId(room.id);
    try {
      await releaseRoomQuick(room);
    } finally {
      setBusyRoomId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            UCC Classrooms &amp; Lecture Theatres
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor room occupancy, capacity, and audio readiness across all campus zones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, course, lecturer..."
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
        </div>
      </div>

      {/* Interactive Status Filter Tabs */}
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

      {/* High-Density Rooms Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No classrooms match your current filters.
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
                  <th className="py-3.5 px-6">Room &amp; Building</th>
                  <th className="py-3.5 px-4">Zone</th>
                  <th className="py-3.5 px-4 text-right">Capacity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Active Session</th>
                  <th className="py-3.5 px-4">AV Gear</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
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
                      <StatusLabel status={room.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {room.currentCourse ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {room.currentCourse}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {room.currentLecturer} · <span className="font-mono">{room.timeSlot}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
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
                        {room.status === 'Available' ? (
                          <button
                            type="button"
                            onClick={() => onBookRoom(room)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
                          >
                            Book Room
                          </button>
                        ) : (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
