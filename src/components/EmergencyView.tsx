import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { resolveEmergencyDispatch, submitEmergencyDispatch } from '../services/campusService';
import {
  VALIDATION_LIMITS,
  type Classroom,
  type EmergencyIssueType,
  type EmergencyRequest,
  type EmergencyUrgency,
  type UserProfile,
} from '../types';
import { StatusLabel } from './StatusLabel';

interface EmergencyViewProps {
  rooms: Classroom[];
  emergencies: EmergencyRequest[];
  profile: UserProfile;
}

const ISSUE_TYPES: EmergencyIssueType[] = [
  'Microphone / Audio Failure',
  'Projector / Power Outage',
  'Lecturer Relocation',
  'Room Conflict',
  'Emergency Standby',
];

const URGENCY_LEVELS: EmergencyUrgency[] = ['Critical', 'High', 'Standard'];

export function EmergencyView({ rooms, emergencies, profile }: EmergencyViewProps) {
  const availableStandbyRooms = rooms.filter((r) => r.status === 'Available');

  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [issueType, setIssueType] = useState<EmergencyIssueType>('Microphone / Audio Failure');
  const [urgency, setUrgency] = useState<EmergencyUrgency>('High');
  const [standbyId, setStandbyId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === roomId) ?? rooms[0] ?? null;
  const standbyRoom = availableStandbyRooms.find((r) => r.id === standbyId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRoom) return;
    if (description.trim().length < 5) {
      setError('Please describe the emergency or relocation need (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitEmergencyDispatch(selectedRoom, profile, {
        issueType,
        urgency,
        description,
        standbyRoom,
      });
      setDescription('');
      setStandbyId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit emergency dispatch.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(em: EmergencyRequest) {
    setResolvingId(em.id);
    setError(null);
    try {
      await resolveEmergencyDispatch(em, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve emergency.');
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Emergency Classroom &amp; AV Dispatch
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Flag urgent classroom outages, allocate immediate standby lecture halls, and coordinate AV support.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dispatch Form */}
        <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Submit Emergency Request
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Affected Classroom
              </label>
              <select
                value={selectedRoom?.id ?? ''}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Incident Type
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as EmergencyIssueType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {ISSUE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as EmergencyUrgency)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {URGENCY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign Standby Relocation Room (Optional)
              </label>
              <select
                value={standbyId}
                onChange={(e) => setStandbyId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">No relocation room needed (AV technician only)</option>
                {availableStandbyRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name} (Cap {r.capacity} · Mic {r.micBattery}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Incident Details
              </label>
              <textarea
                rows={3}
                required
                maxLength={VALIDATION_LIMITS.emergencyDescMax}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe audio failure, power outage, or immediate relocation instructions..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedRoom}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>Dispatch Emergency Alert</span>
            </button>
          </form>
        </section>

        {/* Active & Resolved Dispatches */}
        <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dispatch Queue ({emergencies.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live emergency requisitions and standby room assignments
            </p>
          </div>

          {emergencies.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No active or historical emergency requests logged.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emergencies.map((em) => (
                <div key={em.id} className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {em.roomCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <StatusLabel status={em.urgency} />
                      <span aria-hidden="true">·</span>
                      <StatusLabel status={em.status} />
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {em.issueType}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {em.description}
                    </p>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span>Reported by {em.ownerName}</span>
                      {em.standbyRoomCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                            Standby: {em.standbyRoomCode}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {em.status !== 'Resolved' && (
                    <button
                      type="button"
                      disabled={resolvingId === em.id}
                      onClick={() => handleResolve(em)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {resolvingId === em.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
