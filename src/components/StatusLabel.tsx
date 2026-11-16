import type {
  BookingStatus,
  EmergencyStatus,
  EmergencyUrgency,
  MicStatus,
  RoomStatus,
  SpeakerStatus,
} from '../types';

type AnyStatus =
  | RoomStatus
  | BookingStatus
  | EmergencyStatus
  | EmergencyUrgency
  | MicStatus
  | SpeakerStatus;

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  Available: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  Ready: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  Operational: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  Resolved: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  approved: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  Occupied: {
    dot: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  Dispatched: {
    dot: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  Reserved: {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  pending: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  Charging: {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  'Low Battery': {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  High: {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  Muted: {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  Maintenance: {
    dot: 'bg-amber-600 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  Emergency: {
    dot: 'bg-red-600 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  Critical: {
    dot: 'bg-red-600 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  Faulty: {
    dot: 'bg-red-600 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  Open: {
    dot: 'bg-red-600 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  rejected: {
    dot: 'bg-red-600 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
  },
  cancelled: {
    dot: 'bg-slate-400 dark:bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
  },
  Standard: {
    dot: 'bg-slate-500 dark:bg-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
  None: {
    dot: 'bg-slate-400 dark:bg-slate-500',
    text: 'text-slate-500 dark:text-slate-400',
  },
};

export function StatusLabel({ status }: { status: AnyStatus }) {
  const style = STATUS_STYLES[status] ?? {
    dot: 'bg-slate-500',
    text: 'text-slate-700 dark:text-slate-300',
  };

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap capitalize ${style.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-xs ${style.dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

const BOOKING_BADGE_STYLES: Record<BookingStatus, string> = {
  pending:
    'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  approved:
    'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  rejected:
    'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
  cancelled:
    'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border capitalize whitespace-nowrap ${
        BOOKING_BADGE_STYLES[status]
      }`}
    >
      {status}
    </span>
  );
}
