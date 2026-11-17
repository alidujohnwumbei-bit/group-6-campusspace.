import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, LogOut, Save, ShieldCheck } from 'lucide-react';
import { isAutoAdminEmail, sanitizeUccId, updateUserProfile } from '../services/campusService';
import {
  CAMPUS_ROLES,
  UCC_DEPARTMENTS,
  VALIDATION_LIMITS,
  type CampusRole,
  type UserProfile,
} from '../types';

interface AccountViewProps {
  profile: UserProfile;
  onProfileUpdated: (next: UserProfile) => void;
  onLogout: () => Promise<void>;
}

const AVATAR_IMAGE = '/src/assets/images/avatar_campus_user_1794818748685.jpg';

export function AccountView({
  profile,
  onProfileUpdated,
  onLogout,
}: AccountViewProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [uccId, setUccId] = useState(profile.uccId);
  const [campusRole, setCampusRole] = useState<CampusRole>(profile.campusRole);
  const [department, setDepartment] = useState(profile.department);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const roleChoices: CampusRole[] =
    profile.campusRole === 'Administrator'
      ? ['Administrator', ...CAMPUS_ROLES]
      : CAMPUS_ROLES;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const cleanedId = sanitizeUccId(uccId);
    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (cleanedId.length < 3 || !VALIDATION_LIMITS.uccIdRegex.test(cleanedId)) {
      setError('Enter a valid UCC Staff or Student ID.');
      return;
    }

    const finalCampusRole: CampusRole = isAutoAdminEmail(profile.email)
      ? 'Admin'
      : campusRole;

    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        fullName: fullName.trim(),
        uccId: cleanedId,
        department,
        campusRole: finalCampusRole,
        phone: phone.trim(),
      });
      onProfileUpdated({
        ...profile,
        fullName: fullName.trim(),
        uccId: cleanedId,
        department,
        campusRole: finalCampusRole,
        phone: phone.trim(),
      });
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account &amp; Credentials
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your registered University of Cape Coast identity and active session.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center gap-4">
            {!avatarFailed ? (
              <img
                src={AVATAR_IMAGE}
                alt={profile.fullName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-[#0B2D5B] text-white font-bold text-lg flex items-center justify-center shrink-0">
                {initials || 'UC'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {profile.fullName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                {profile.role} · {profile.campusRole}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">System Role</span>
              <span className="font-mono font-semibold uppercase text-[#0B2D5B] dark:text-amber-300">
                {profile.role}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">UCC ID</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {profile.uccId}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Department</span>
              <span className="font-medium text-slate-900 dark:text-white text-right">
                {profile.department}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Email</span>
              <span className="font-medium text-slate-900 dark:text-white truncate max-w-[170px]">
                {profile.email}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-emerald-700 dark:text-emerald-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Authenticated Session</span>
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors whitespace-nowrap"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Log Out of CampusSpace</span>
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Update Account Information
          </h3>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {savedNotice && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Your CampusSpace account details have been saved.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.fullNameMax}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  UCC Staff / Student ID
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.uccIdMax}
                  value={uccId}
                  onChange={(e) => setUccId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Role Label
                </label>
                <select
                  value={campusRole}
                  onChange={(e) => setCampusRole(e.target.value as CampusRole)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {roleChoices.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  maxLength={VALIDATION_LIMITS.phoneMax}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Department / Faculty
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {UCC_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
