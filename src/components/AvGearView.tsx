import { useState } from 'react';
import { BatteryCharging, Loader2, Mic, Volume2 } from 'lucide-react';
import { formatUserError } from '../firebase';
import { updateRoomAvAndLog } from '../services/campusService';
import type { AvLog, Classroom, SpeakerStatus, UserProfile } from '../types';
import { StatusLabel } from './StatusLabel';

interface AvGearViewProps {
  rooms: Classroom[];
  avLogs: AvLog[];
  profile: UserProfile;
}

export function AvGearView({ rooms, avLogs, profile }: AvGearViewProps) {
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const micReadyCount = rooms.filter((r) => r.micStatus === 'Ready' && r.micBattery >= 50).length;
  const lowMicCount = rooms.filter((r) => r.micBattery < 30 || r.micStatus === 'Low Battery' || r.micStatus === 'Faulty').length;
  const speakerOkCount = rooms.filter((r) => r.speakerStatus === 'Operational').length;
  const projectorOkCount = rooms.filter((r) => r.projectorReady).length;

  async function handleSwapBattery(room: Classroom) {
    setBusyRoomId(room.id);
    setError(null);
    try {
      await updateRoomAvAndLog(room, profile, {
        gearType: 'Microphone',
        action: 'Microphone battery swapped & charged to 100%',
        micStatus: 'Ready',
        micBattery: 100,
      });
    } catch (err) {
      setError(formatUserError(err, 'Unable to log battery swap. Please try again.'));
    } finally {
      setBusyRoomId(null);
    }
  }

  async function handleSpeakerDiagnostic(room: Classroom) {
    setBusyRoomId(room.id);
    setError(null);
    const nextSpeaker: SpeakerStatus =
      room.speakerStatus === 'Operational' ? 'Maintenance' : 'Operational';
    try {
      await updateRoomAvAndLog(room, profile, {
        gearType: 'Speaker',
        action:
          nextSpeaker === 'Operational'
            ? 'Speaker array diagnostic passed · output verified Operational'
            : 'Speaker output flagged for acoustic maintenance check',
        speakerStatus: nextSpeaker,
      });
    } catch (err) {
      setError(formatUserError(err, 'Unable to update speaker status. Please try again.'));
    } finally {
      setBusyRoomId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Microphones &amp; Speaker Readiness
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Track wireless microphone battery levels, acoustic speaker status, and technician maintenance logs.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Microphones Ready</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-700 dark:text-emerald-400">
            {micReadyCount} / {rooms.length}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Low Battery / Faulty</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-700 dark:text-amber-400">
            {lowMicCount}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Speakers Operational</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
            {speakerOkCount} / {rooms.length}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Projectors Verified</div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
            {projectorOkCount} / {rooms.length}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Hardware Inventory Table */}
        <section className="lg:col-span-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Classroom Audio &amp; Projection Matrix
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Room</th>
                  <th className="py-3 px-4">Mic Status</th>
                  <th className="py-3 px-4">Battery</th>
                  <th className="py-3 px-4">Speaker</th>
                  <th className="py-3 px-6 text-right">Quick Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-6">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {room.code}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                        {room.building}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={room.micStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              room.micBattery >= 60
                                ? 'bg-emerald-600'
                                : room.micBattery >= 30
                                  ? 'bg-amber-500'
                                  : 'bg-red-600'
                            }`}
                            style={{ width: `${room.micBattery}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {room.micBattery}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={room.speakerStatus} />
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyRoomId === room.id}
                          onClick={() => handleSwapBattery(room)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          {busyRoomId === room.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <BatteryCharging className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span>Recharge 100%</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyRoomId === room.id}
                          onClick={() => handleSpeakerDiagnostic(room)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          <Volume2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>
                            {room.speakerStatus === 'Operational' ? 'Flag Check' : 'Set Ready'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Maintenance Audit Log */}
        <section className="lg:col-span-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              AV Service Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Immutable technician battery &amp; acoustic checks
            </p>
          </div>

          {avLogs.length === 0 ? (
            <div className="py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No maintenance actions recorded yet. Use Recharge 100% or Flag Check to log an inspection.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {avLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {log.roomCode} · {log.gearType}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {log.batteryAfter}%
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{log.action}</p>
                  <p className="text-slate-500 dark:text-slate-400">Logged by {log.ownerName}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
