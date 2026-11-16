import { useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { createRoomBooking } from '../services/campusService';
import { VALIDATION_LIMITS, type Classroom, type UserProfile } from '../types';

interface BookingModalProps {
  rooms: Classroom[];
  initialRoom: Classroom | null;
  profile: UserProfile;
  onClose: () => void;
  onBooked: () => void;
}

export function BookingModal({
  rooms,
  initialRoom,
  profile,
  onClose,
  onBooked,
}: BookingModalProps) {
  const availableRooms = rooms.filter((r) => r.status === 'Available');
  const defaultRoomId = initialRoom?.id ?? availableRooms[0]?.id ?? rooms[0]?.id ?? '';

  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [attendeesCount, setAttendeesCount] = useState(80);
  const [mode, setMode] = useState<'Reserved' | 'Occupied'>('Reserved');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRoom) {
      setError('Please select a classroom.');
      return;
    }
    if (courseCode.trim().length < 2 || courseTitle.trim().length < 2) {
      setError('Please provide both the course code and course title.');
      return;
    }
    if (attendeesCount < 1 || attendeesCount > selectedRoom.capacity) {
      setError(`Expected attendees must be between 1 and ${selectedRoom.capacity} for ${selectedRoom.code}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createRoomBooking(selectedRoom, profile, {
        courseCode,
        courseTitle,
        date,
        startTime,
        endTime,
        attendeesCount,
        mode,
      });
      onBooked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 id="booking-modal-title" className="text-base font-bold">
              Reserve Classroom or Start Session
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Booking under {profile.fullName} · {profile.department}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Classroom
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} — {room.name} ({room.status} · Cap {room.capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                required
                maxLength={VALIDATION_LIMITS.courseCodeMax}
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="CSC 305"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                maxLength={VALIDATION_LIMITS.courseTitleMax}
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Operating Systems"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                End
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Class Size
              </label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity ?? 2000}
                required
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Booking Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('Reserved')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  mode === 'Reserved'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Schedule Reservation
              </button>
              <button
                type="button"
                onClick={() => setMode('Occupied')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  mode === 'Occupied'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Check-In Live Class Now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{mode === 'Reserved' ? 'Confirm Reservation' : 'Start Live Session'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
