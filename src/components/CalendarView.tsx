import { useMemo, useState } from 'react';
import { Calendar, Lock, Plus } from 'lucide-react';
import { CAMPUS_ZONES, type CampusZone, type Classroom, type VenueSchedule } from '../types';
import { StatusLabel } from './StatusLabel';

interface CalendarViewProps {
  rooms: Classroom[];
  schedules: VenueSchedule[];
  onRequestSlot?: (room: Classroom, date: string) => void;
}

export function CalendarView({ rooms, schedules, onRequestSlot }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [zoneFilter, setZoneFilter] = useState<'All' | CampusZone>('All');

  const daySchedules = useMemo(() => {
    return schedules.filter((s) => s.date === selectedDate && s.status === 'approved');
  }, [schedules, selectedDate]);

  const filteredRooms = useMemo(() => {
    if (zoneFilter === 'All') return rooms;
    return rooms.filter((r) => r.campusZone === zoneFilter);
  }, [rooms, zoneFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0B2D5B] dark:text-blue-400" />
            <span>Venue Availability Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect approved schedules and maintenance blocks by date across UCC venues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Select availability date"
            className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value as 'All' | CampusZone)}
            aria-label="Filter calendar by campus zone"
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const roomDaySlots = daySchedules.filter((s) => s.venueId === room.id);
          const isBlocked = room.blocked || room.status === 'Maintenance';

          return (
            <div
              key={room.id}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {room.code}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {room.name} · Cap <span className="font-mono">{room.capacity}</span>
                    </div>
                  </div>
                  <StatusLabel status={room.status} />
                </div>

                {isBlocked ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>{room.maintenanceNote || 'Blocked for maintenance'}</span>
                  </div>
                ) : roomDaySlots.length === 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 pt-1">
                    Open all day on <span className="font-mono">{selectedDate}</span>
                  </p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Approved Slots ({selectedDate})
                    </div>
                    {roomDaySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-300">
                          {slot.courseCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {onRequestSlot && !isBlocked && (
                <button
                  type="button"
                  onClick={() => onRequestSlot(room, selectedDate)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Request Slot on {selectedDate}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
