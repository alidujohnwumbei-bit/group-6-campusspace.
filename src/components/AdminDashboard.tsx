import { useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  Ban,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { formatUserError } from '../firebase';
import {
  adminApproveBooking,
  adminDeleteVenue,
  adminForceCancelBooking,
  adminRejectBooking,
  adminSaveVenue,
  adminToggleVenueMaintenance,
  adminUpdateUser,
} from '../services/campusService';
import {
  CAMPUS_ZONES,
  SYSTEM_ROLES,
  VALIDATION_LIMITS,
  type ActivityLog,
  type Booking,
  type BookingStatus,
  type CampusZone,
  type Classroom,
  type MicStatus,
  type RoomStatus,
  type SpeakerStatus,
  type SystemRole,
  type UserProfile,
  type VenueSchedule,
} from '../types';
import { CalendarView } from './CalendarView';
import { BookingStatusBadge, StatusLabel } from './StatusLabel';

interface AdminDashboardProps {
  profile: UserProfile;
  venues: Classroom[];
  schedules: VenueSchedule[];
  allBookings: Booking[];
  allUsers: UserProfile[];
  activityLogs: ActivityLog[];
}

type AdminSection = 'pending' | 'bookings' | 'users' | 'venues' | 'activity';

const BOOKING_FILTERS: Array<'all' | BookingStatus> = [
  'all',
  'pending',
  'approved',
  'rejected',
  'cancelled',
];

export function AdminDashboard({
  profile,
  venues,
  schedules,
  allBookings,
  allUsers,
  activityLogs,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('pending');
  const [bookingFilter, setBookingFilter] = useState<'all' | BookingStatus>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [venueSubView, setVenueSubView] = useState<'crud' | 'calendar'>('crud');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Reject / Force Cancel modal state
  const [reviewModal, setReviewModal] = useState<{
    mode: 'reject' | 'force-cancel';
    booking: Booking;
  } | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  // Venue Add / Edit modal state
  const [venueModal, setVenueModal] = useState<{
    editing: Classroom | null;
    code: string;
    name: string;
    building: string;
    campusZone: CampusZone;
    capacity: number;
    status: RoomStatus;
    blocked: boolean;
    maintenanceNote: string;
    micStatus: MicStatus;
    micBattery: number;
    speakerStatus: SpeakerStatus;
    projectorReady: boolean;
  } | null>(null);

  // Maintenance block modal
  const [blockTarget, setBlockTarget] = useState<Classroom | null>(null);
  const [blockNote, setBlockNote] = useState('');

  // Delete venue confirmation
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);

  // Stats Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingBookings = useMemo(
    () => allBookings.filter((b) => b.status === 'pending'),
    [allBookings]
  );
  const totalBookings = allBookings.length;
  const pendingRequests = pendingBookings.length;
  const approvedToday = allBookings.filter((b) => {
    if (b.status !== 'approved') return false;
    const revDate = b.reviewedAt?.toDate ? b.reviewedAt.toDate().toISOString().slice(0, 10) : '';
    return revDate === todayStr || b.date === todayStr;
  }).length;
  const totalUsers = allUsers.length;
  const totalVenues = venues.length;

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return allBookings.filter((b) => {
      if (bookingFilter !== 'all' && b.status !== bookingFilter) return false;
      if (!q) return true;
      return (
        b.roomCode.toLowerCase().includes(q) ||
        b.roomName.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q) ||
        b.courseCode.toLowerCase().includes(q) ||
        b.courseTitle.toLowerCase().includes(q)
      );
    });
  }, [allBookings, bookingFilter, bookingSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uccId.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  async function handleApprove(booking: Booking) {
    setBusyId(booking.id);
    setFeedback(null);
    try {
      await adminApproveBooking(booking, profile);
      setFeedback({
        type: 'ok',
        text: `Approved ${booking.courseCode} in ${booking.roomCode} for ${booking.ownerName}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Approval failed. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmReviewModal(e: FormEvent) {
    e.preventDefault();
    if (!reviewModal) return;
    if (reviewModal.mode === 'reject' && reviewReason.trim().length < 3) {
      setFeedback({ type: 'err', text: 'Please provide a rejection reason.' });
      return;
    }

    setBusyId(reviewModal.booking.id);
    setFeedback(null);
    try {
      if (reviewModal.mode === 'reject') {
        await adminRejectBooking(reviewModal.booking, profile, reviewReason.trim());
        setFeedback({
          type: 'ok',
          text: `Rejected ${reviewModal.booking.courseCode} request.`,
        });
      } else {
        await adminForceCancelBooking(
          reviewModal.booking,
          profile,
          reviewReason.trim() || 'Force-cancelled by Administrator'
        );
        setFeedback({
          type: 'ok',
          text: `Force-cancelled ${reviewModal.booking.courseCode} and released ${reviewModal.booking.roomCode}.`,
        });
      }
      setReviewModal(null);
      setReviewReason('');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Action failed. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUserChange(target: UserProfile, nextRole: SystemRole, nextDisabled: boolean) {
    if (target.uid === profile.uid && nextDisabled) {
      setFeedback({ type: 'err', text: 'You cannot disable your own active admin account.' });
      return;
    }
    setBusyId(target.uid);
    setFeedback(null);
    try {
      await adminUpdateUser(target, { role: nextRole, disabled: nextDisabled }, profile);
      setFeedback({
        type: 'ok',
        text: `Updated ${target.fullName} (role: ${nextRole}, status: ${nextDisabled ? 'Disabled' : 'Active'}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Unable to update user. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  function openNewVenueModal() {
    setVenueModal({
      editing: null,
      code: '',
      name: '',
      building: '',
      campusZone: 'New Site',
      capacity: 120,
      status: 'Available',
      blocked: false,
      maintenanceNote: '',
      micStatus: 'Ready',
      micBattery: 100,
      speakerStatus: 'Operational',
      projectorReady: true,
    });
  }

  function openEditVenueModal(v: Classroom) {
    setVenueModal({
      editing: v,
      code: v.code,
      name: v.name,
      building: v.building,
      campusZone: v.campusZone,
      capacity: v.capacity,
      status: v.status,
      blocked: v.blocked,
      maintenanceNote: v.maintenanceNote,
      micStatus: v.micStatus,
      micBattery: v.micBattery,
      speakerStatus: v.speakerStatus,
      projectorReady: v.projectorReady,
    });
  }

  async function handleSaveVenueSubmit(e: FormEvent) {
    e.preventDefault();
    if (!venueModal) return;
    setBusyId(venueModal.editing?.id ?? 'new-venue');
    setFeedback(null);
    try {
      await adminSaveVenue(
        {
          id: venueModal.editing?.id,
          code: venueModal.code,
          name: venueModal.name,
          building: venueModal.building,
          campusZone: venueModal.campusZone,
          capacity: venueModal.capacity,
          status: venueModal.status,
          blocked: venueModal.blocked,
          maintenanceNote: venueModal.maintenanceNote,
          micStatus: venueModal.micStatus,
          micBattery: venueModal.micBattery,
          speakerStatus: venueModal.speakerStatus,
          projectorReady: venueModal.projectorReady,
        },
        profile
      );
      setFeedback({
        type: 'ok',
        text: `${venueModal.editing ? 'Updated' : 'Created'} venue ${venueModal.code.toUpperCase()}.`,
      });
      setVenueModal(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Unable to save venue. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleBlockSubmit(e: FormEvent) {
    e.preventDefault();
    if (!blockTarget) return;
    setBusyId(blockTarget.id);
    setFeedback(null);
    try {
      await adminToggleVenueMaintenance(blockTarget, true, blockNote, profile);
      setFeedback({
        type: 'ok',
        text: `Blocked ${blockTarget.code} for maintenance.`,
      });
      setBlockTarget(null);
      setBlockNote('');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Unable to block venue. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnblockVenue(v: Classroom) {
    setBusyId(v.id);
    setFeedback(null);
    try {
      await adminToggleVenueMaintenance(v, false, '', profile);
      setFeedback({ type: 'ok', text: `Restored ${v.code} to Available.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Unable to unblock venue. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDeleteVenue() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setFeedback(null);
    try {
      await adminDeleteVenue(deleteTarget, profile);
      setFeedback({ type: 'ok', text: `Deleted venue ${deleteTarget.code}.` });
      setDeleteTarget(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: formatUserError(err, 'Unable to delete venue. Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* UCC Navy & Gold Admin Banner */}
      <section className="rounded-xl bg-[#0B2D5B] text-white p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-blue-900">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ShieldCheck className="h-4 w-4" />
            <span>
              University of Cape Coast · Admin Console ({profile.fullName} · {profile.campusRole})
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin Approval Queue &amp; Campus Control
          </h1>
          <p className="text-xs text-blue-100 max-w-2xl">
            Approve or reject pending venue requests, oversee all UCC room schedules, manage user roles, and maintain lecture hall inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openNewVenueModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Venue</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Admin Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Bookings
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalBookings}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Pending Count
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300">
            {pendingRequests}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Rooms
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalVenues}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Users
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalUsers}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Approved Today
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
            {approvedToday}
          </div>
        </div>
      </section>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
        {(
          [
            { id: 'pending', label: `Pending Venue Requests (${pendingBookings.length})`, icon: Clock },
            { id: 'bookings', label: `All Bookings (${allBookings.length})`, icon: CalendarCheck },
            { id: 'users', label: `User Management (${allUsers.length})`, icon: Users },
            { id: 'venues', label: `Venue Management (${venues.length})`, icon: Building2 },
            { id: 'activity', label: `Activity Log (${activityLogs.length})`, icon: Activity },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                section === tab.id
                  ? 'bg-[#0B2D5B] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 0: PENDING VENUE REQUESTS */}
      {section === 'pending' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pending Venue Requests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requests waiting for administrator approval from the bookings collection
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSection('bookings')}
              className="text-xs font-semibold text-[#0B2D5B] dark:text-amber-300 hover:underline whitespace-nowrap w-fit"
            >
              View All Booking Records &rarr;
            </button>
          </div>

          {pendingBookings.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No pending venue requests
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Every venue reservation request has been reviewed. New requests submitted by students and lecturers will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {pendingBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 flex-1 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        Requester Name
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b.ownerName}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate">
                        {b.ownerDepartment}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        Room / Venue
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {b.roomCode}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate">
                        {b.roomName}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        Date
                      </div>
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {b.date}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {b.attendeesCount} attendees
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        Time Slot
                      </div>
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {b.startTime} – {b.endTime}
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-medium">
                        Purpose / Course
                      </div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">
                        {b.courseCode}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {b.courseTitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void handleApprove(b)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {busyId === b.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>APPROVE</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => {
                        setReviewModal({ mode: 'reject', booking: b });
                        setReviewReason('');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 1: ALL BOOKINGS */}
      {section === 'bookings' && (
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
              {BOOKING_FILTERS.map((f) => {
                const count =
                  f === 'all'
                    ? allBookings.length
                    : allBookings.filter((b) => b.status === f).length;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBookingFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors whitespace-nowrap ${
                      bookingFilter === f
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search by venue, user, or course..."
                className="pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-72 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No bookings match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-6">Venue &amp; Course</th>
                      <th className="py-3.5 px-4">Requested By</th>
                      <th className="py-3.5 px-4">Schedule</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Notes / Reason</th>
                      <th className="py-3.5 px-6 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {filteredBookings.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {b.roomCode} · {b.courseCode}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {b.courseTitle} (Cap {b.attendeesCount})
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {b.ownerName}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {b.ownerDepartment}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div>{b.date}</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {b.startTime}–{b.endTime}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <BookingStatusBadge status={b.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[200px]">
                          {b.reason || (b.reviewedByName ? `Reviewed by ${b.reviewedByName}` : '—')}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            {b.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === b.id}
                                  onClick={() => handleApprove(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap"
                                >
                                  {busyId === b.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === b.id}
                                  onClick={() => {
                                    setReviewModal({ mode: 'reject', booking: b });
                                    setReviewReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            {b.status === 'approved' && (
                              <button
                                type="button"
                                disabled={busyId === b.id}
                                onClick={() => {
                                  setReviewModal({ mode: 'force-cancel', booking: b });
                                  setReviewReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors whitespace-nowrap"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Force Cancel</span>
                              </button>
                            )}
                            {(b.status === 'rejected' || b.status === 'cancelled') && (
                              <span className="text-slate-400">Closed</span>
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
        </section>
      )}

      {/* SECTION 2: USER MANAGEMENT */}
      {section === 'users' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Registered UCC Accounts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assign student, lecturer, or admin roles and enable or disable user accounts.
              </p>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, email, UCC ID..."
                className="pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-6">User</th>
                    <th className="py-3.5 px-4">UCC ID &amp; Dept</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.uid}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u.fullName}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 dark:text-slate-200">{u.uccId}</div>
                        <div className="text-slate-500 dark:text-slate-400">{u.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Change role for ${u.fullName}`}
                          value={u.role}
                          disabled={busyId === u.uid}
                          onChange={(e) =>
                            void handleUserChange(u, e.target.value as SystemRole, u.disabled)
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 capitalize"
                        >
                          {SYSTEM_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.disabled ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
                            <Ban className="h-3.5 w-3.5" />
                            <span>Disabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              disabled={busyId === u.uid}
                              onClick={() => void handleUserChange(u, 'admin', u.disabled)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-[#0B2D5B] dark:text-amber-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap"
                            >
                              Make Admin
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === u.uid || u.uid === profile.uid}
                            onClick={() => void handleUserChange(u, u.role, !u.disabled)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border whitespace-nowrap disabled:opacity-40 ${
                              u.disabled
                                ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                : 'border-red-200 text-red-700 dark:border-red-900 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30'
                            }`}
                          >
                            {u.disabled ? 'Enable User' : 'Disable User'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: VENUE MANAGEMENT (CRUD + MAINTENANCE BLOCK + CALENDAR) */}
      {section === 'venues' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => setVenueSubView('crud')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                  venueSubView === 'crud'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Manage Venues (CRUD)</span>
              </button>
              <button
                type="button"
                onClick={() => setVenueSubView('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                  venueSubView === 'calendar'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Availability Calendar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openNewVenueModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap w-fit"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Venue</span>
            </button>
          </div>

          {venueSubView === 'calendar' ? (
            <CalendarView rooms={venues} schedules={schedules} />
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-6">Venue</th>
                      <th className="py-3.5 px-4">Zone</th>
                      <th className="py-3.5 px-4 text-right">Capacity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">AV Gear</th>
                      <th className="py-3.5 px-6 text-right">CRUD &amp; Maintenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {venues.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {v.code}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {v.name} · {v.building}
                          </div>
                          {v.blocked && v.maintenanceNote && (
                            <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                              Blocked: {v.maintenanceNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {v.campusZone}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          {v.capacity}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusLabel status={v.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          Mic {v.micBattery}% · {v.speakerStatus}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            {v.blocked || v.status === 'Maintenance' ? (
                              <button
                                type="button"
                                disabled={busyId === v.id}
                                onClick={() => void handleUnblockVenue(v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>Unblock</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busyId === v.id}
                                onClick={() => {
                                  setBlockTarget(v);
                                  setBlockNote('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 whitespace-nowrap"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                <span>Block</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditVenueModal(v)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(v)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: ACTIVITY LOG */}
      {section === 'activity' && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Campus Activity Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time record of booking submissions, approvals, rejections, cancellations, and admin updates
            </p>
          </div>
          {activityLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No activity events recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {log.action} · <span className="font-mono text-[#0B2D5B] dark:text-amber-300">{log.target}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{log.details}</p>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap shrink-0">
                    {log.actorName} ({log.actorRole}) ·{' '}
                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Just now'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* REJECT / FORCE CANCEL MODAL */}
      {reviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">
                {reviewModal.mode === 'reject'
                  ? `Reject ${reviewModal.booking.courseCode}`
                  : `Force Cancel ${reviewModal.booking.courseCode}`}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmReviewModal} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Requester: <strong className="text-slate-900 dark:text-white">{reviewModal.booking.ownerName}</strong> · Venue:{' '}
                <span className="font-mono">{reviewModal.booking.roomCode}</span> on{' '}
                <span className="font-mono">{reviewModal.booking.date}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {reviewModal.mode === 'reject' ? 'Rejection Reason (Required)' : 'Cancellation Reason'}
                </label>
                {reviewModal.mode === 'reject' && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Venue already scheduled for academic exams.',
                      'Classroom undergoing scheduled maintenance.',
                      'Attendance exceeds safe hall capacity.',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReviewReason(preset)}
                        className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={3}
                  required={reviewModal.mode === 'reject'}
                  maxLength={VALIDATION_LIMITS.reasonMax}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewModal.mode === 'reject'
                      ? 'e.g., Venue reserved for departmental examinations during this slot.'
                      : 'e.g., Emergency maintenance scheduled for this hall.'
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busyId === reviewModal.booking.id}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  {busyId === reviewModal.booking.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {reviewModal.mode === 'reject' ? 'Confirm Rejection' : 'Force Cancel Booking'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT VENUE MODAL */}
      {venueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">
                {venueModal.editing ? `Edit Venue ${venueModal.editing.code}` : 'Add New UCC Venue'}
              </h3>
              <button
                type="button"
                onClick={() => setVenueModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVenueSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(venueModal.editing)}
                    maxLength={24}
                    value={venueModal.code}
                    onChange={(e) => setVenueModal({ ...venueModal, code: e.target.value })}
                    placeholder="NLT-103"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={venueModal.name}
                    onChange={(e) => setVenueModal({ ...venueModal, name: e.target.value })}
                    placeholder="New Lecture Theatre 103"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={venueModal.building}
                    onChange={(e) => setVenueModal({ ...venueModal, building: e.target.value })}
                    placeholder="New Lecture Theatre (NLT)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={2000}
                    value={venueModal.capacity}
                    onChange={(e) =>
                      setVenueModal({ ...venueModal, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Campus Zone
                  </label>
                  <select
                    value={venueModal.campusZone}
                    onChange={(e) =>
                      setVenueModal({ ...venueModal, campusZone: e.target.value as CampusZone })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {CAMPUS_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={venueModal.status}
                    onChange={(e) =>
                      setVenueModal({
                        ...venueModal,
                        status: e.target.value as RoomStatus,
                        blocked: e.target.value === 'Maintenance',
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {(['Available', 'Occupied', 'Reserved', 'Maintenance', 'Emergency'] as RoomStatus[]).map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mic Status
                  </label>
                  <select
                    value={venueModal.micStatus}
                    onChange={(e) =>
                      setVenueModal({ ...venueModal, micStatus: e.target.value as MicStatus })
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {(['Ready', 'Low Battery', 'Charging', 'Faulty', 'None'] as MicStatus[]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mic Battery %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={venueModal.micBattery}
                    onChange={(e) =>
                      setVenueModal({ ...venueModal, micBattery: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Speaker
                  </label>
                  <select
                    value={venueModal.speakerStatus}
                    onChange={(e) =>
                      setVenueModal({
                        ...venueModal,
                        speakerStatus: e.target.value as SpeakerStatus,
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {(['Operational', 'Muted', 'Faulty', 'Maintenance'] as SpeakerStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={venueModal.projectorReady}
                  onChange={(e) =>
                    setVenueModal({ ...venueModal, projectorReady: e.target.checked })
                  }
                />
                <span>Projector / HDMI Display Ready</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVenueModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 rounded-lg"
                >
                  {busyId !== null && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{venueModal.editing ? 'Save Venue' : 'Create Venue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK FOR MAINTENANCE MODAL */}
      {blockTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">Block {blockTarget.code} for Maintenance</h3>
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Maintenance Note
                </label>
                <textarea
                  rows={2}
                  required
                  maxLength={VALIDATION_LIMITS.maintenanceNoteMax}
                  value={blockNote}
                  onChange={(e) => setBlockNote(e.target.value)}
                  placeholder="e.g., Electrical panel & acoustic soundbar servicing."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBlockTarget(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === blockTarget.id}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Block Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE VENUE CONFIRMATION */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Delete {deleteTarget.code}?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will permanently remove <strong>{deleteTarget.name}</strong> from the UCC venues catalog.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => void handleConfirmDeleteVenue()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete Venue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
