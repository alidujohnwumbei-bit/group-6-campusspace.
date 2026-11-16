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
  Completed: {
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
  Cancelled: {
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
    <span className={`inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${style.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-xs ${style.dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
