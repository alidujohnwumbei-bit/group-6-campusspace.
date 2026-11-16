import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Play, Plus, X, XCircle } from 'lucide-react';
import {
  cancelBookingAndReleaseRoom,
  completeBookedSession,
  startBookedClassSession,
} from '../services/campusService';
import { VALIDATION_LIMITS, type Booking, type BookingStatus, type UserProfile } from '../types';
import { StatusLabel } from './StatusLabel';

interface BookingsViewProps {
  bookings: Booking[];
  profile: UserProfile;
  onNewBooking: () => void;
}

const BOOKING_TABS: Array<'All' | BookingStatus> = [
  'All',
  'Reserved',
  'Occupied',
  'Cancelled',
  'Completed',
];

export function BookingsView({ bookings, profile, onNewBooking }: BookingsViewProps) {
  const [filter, setFilter] = useState<'All' | BookingStatus>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'All') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  async function handleStartSession(booking: Booking) {
    setBusyId(booking.id);
    setActionError(null);
    try {
      await startBookedClassSession(booking);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to start session.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(booking: Booking) {
    setBusyId(booking.id);
    setActionError(null);
    try {
      await completeBookedSession(booking);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to complete session.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmCancel(e: FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 3) {
      setActionError('Please enter a short cancellation reason.');
      return;
    }
    setBusyId(cancelTarget.id);
    setActionError(null);
    try {
      await cancelBookingAndReleaseRoom(cancelTarget, profile, cancelReason);
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to cancel booking.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reservations &amp; Cancellations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Schedule lecture bookings, check in live classes, or cancel and release rooms with an audit reason.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewBooking}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Reservation</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
        {BOOKING_TABS.map((tab) => {
          const count =
            tab === 'All' ? bookings.length : bookings.filter((b) => b.status === tab).length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No {filter === 'All' ? '' : filter.toLowerCase()} bookings found.
            </p>
            <button
              type="button"
              onClick={onNewBooking}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Booking</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-6">Course &amp; Room</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4 text-right">Size</th>
                  <th className="py-3.5 px-4">Booked By</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filtered.map((booking) => {
                  const isOwner = booking.ownerId === profile.uid;
                  const canModify =
                    isOwner && booking.status !== 'Cancelled' && booking.status !== 'Completed';

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono">{booking.courseCode}</span> · {booking.courseTitle}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-medium">{booking.roomCode}</span> — {booking.roomName}
                        </div>
                        {booking.status === 'Cancelled' && booking.cancellationReason && (
                          <div className="text-slate-500 dark:text-slate-400 mt-1">
                            Reason: {booking.cancellationReason} ({booking.cancelledByName})
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div>{booking.date}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {booking.startTime} – {booking.endTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {booking.attendeesCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {booking.ownerName}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {booking.ownerDepartment}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusLabel status={booking.status} />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {canModify ? (
                          <div className="inline-flex items-center gap-2">
                            {booking.status === 'Reserved' && (
                              <button
                                type="button"
                                disabled={busyId === booking.id}
                                onClick={() => handleStartSession(booking)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
                              >
                                {busyId === booking.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                                <span>Check In</span>
                              </button>
                            )}
                            {booking.status === 'Occupied' && (
                              <button
                                type="button"
                                disabled={busyId === booking.id}
                                onClick={() => handleComplete(booking)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors whitespace-nowrap"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>End Class</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyId === booking.id}
                              onClick={() => {
                                setCancelTarget(booking);
                                setCancelReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors whitespace-nowrap"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            {booking.status === 'Cancelled' || booking.status === 'Completed'
                              ? 'Archived'
                              : 'Read-only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Reason Modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">
                Cancel {cancelTarget.courseCode} in {cancelTarget.roomCode}
              </h3>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Cancelling will immediately release <span className="font-mono font-semibold">{cancelTarget.roomCode}</span> back to Available status.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cancellation Reason
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={VALIDATION_LIMITS.cancellationReasonMax}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Lecturer rescheduled tutorial to Friday afternoon."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={busyId === cancelTarget.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  {busyId === cancelTarget.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
