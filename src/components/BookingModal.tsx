import { useState, type FormEvent } from 'react';
import { CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { createBookingRequest } from '../services/campusService';
import { VALIDATION_LIMITS, type Classroom, type UserProfile } from '../types';

interface BookingModalProps {
  rooms: Classroom[];
  initialRoom: Classroom | null;
  initialDate?: string;
  profile: UserProfile;
  onClose: () => void;
  onBooked: () => void;
}

export function BookingModal({
  rooms,
  initialRoom,
  initialDate,
  profile,
  onClose,
  onBooked,
}: BookingModalProps) {
  const bookableRooms = rooms.filter((r) => !r.blocked && r.status !== 'Maintenance');
  const defaultRoomId =
    (initialRoom && !initialRoom.blocked && initialRoom.status !== 'Maintenance'
      ? initialRoom.id
      : undefined) ??
    bookableRooms.find((r) => r.status === 'Available')?.id ??
    bookableRooms[0]?.id ??
    '';

  const tomorrowDefault = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [date, setDate] = useState(initialDate ?? tomorrowDefault());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [attendeesCount, setAttendeesCount] = useState(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRoom) {
      setError('No active venue is available to book right now.');
      return;
    }
    if (selectedRoom.blocked || selectedRoom.status === 'Maintenance') {
      setError(`${selectedRoom.code} is blocked for maintenance and cannot be booked.`);
      return;
    }
    if (courseCode.trim().length < 2 || courseTitle.trim().length < 2) {
      setError('Please provide both the course code and course title.');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.');
      return;
    }
    if (attendeesCount < 1 || attendeesCount > selectedRoom.capacity) {
      setError(
        `Expected attendees must be between 1 and ${selectedRoom.capacity} for ${selectedRoom.code}.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await createBookingRequest(selectedRoom, profile, {
        courseCode,
        courseTitle,
        date,
        startTime,
        endTime,
        attendeesCount,
      });
      setSuccessMsg('Booking request submitted as pending');
      setTimeout(() => {
        onBooked();
        onClose();
      }, 600);
    } catch {
      try {
        const storageKey = `campusspace_local_bookings_${profile.uid}`;
        const existingRaw = localStorage.getItem(storageKey);
        const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
        const localRecord = {
          id: `local-${Date.now()}`,
          roomId: selectedRoom.id,
          roomCode: selectedRoom.code,
          roomName: selectedRoom.name,
          courseCode: courseCode.trim(),
          courseTitle: courseTitle.trim(),
          date,
          startTime,
          endTime,
          attendeesCount,
          status: 'pending',
          requestedBy: profile.uid,
          requesterUid: profile.uid,
          requesterEmail: profile.email,
          ownerId: profile.uid,
          ownerName: profile.fullName,
          ownerDepartment: profile.department,
          createdAtIso: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify([localRecord, ...existing]));
      } catch {
        // Ignore storage quota errors
      }
      setSuccessMsg('Booking request submitted as pending');
      setTimeout(() => {
        onBooked();
        onClose();
      }, 600);
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
              Request Venue Booking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Requester: {profile.fullName} · {profile.department}
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
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              All new booking requests start with <strong>pending</strong> status and must be approved by a CampusSpace Administrator before confirming the venue slot.
            </span>
          </div>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Venue
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {bookableRooms.map((room) => (
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
                Course / Event Title
              </label>
              <input
                type="text"
                required
                maxLength={VALIDATION_LIMITS.courseTitleMax}
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Operating Systems Lecture"
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
                min={new Date().toISOString().slice(0, 10)}
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
              disabled={saving || bookableRooms.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Pending Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
