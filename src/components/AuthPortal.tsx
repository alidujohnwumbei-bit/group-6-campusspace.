import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Mic,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { createUserProfile, resolveDefaultRole, sanitizeUccId } from '../services/campusService';
import {
  CAMPUS_ROLES,
  UCC_DEPARTMENTS,
  VALIDATION_LIMITS,
  type CampusRole,
  type SystemRole,
  type UserProfile,
} from '../types';

interface AuthPortalProps {
  pendingGoogleUser: User | null;
  onAuthComplete: (profile: UserProfile) => void;
  onCancelPendingGoogle: () => void;
}

const HERO_IMAGE = '/src/assets/images/campus_hero_ucc_1794818747506.jpg';

export function AuthPortal({
  pendingGoogleUser,
  onAuthComplete,
  onCancelPendingGoogle,
}: AuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration / Profile completion fields (default system role = student)
  const [fullName, setFullName] = useState(pendingGoogleUser?.displayName ?? '');
  const [regEmail, setRegEmail] = useState(pendingGoogleUser?.email ?? '');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [uccId, setUccId] = useState('');
  const [campusRole, setCampusRole] = useState<CampusRole>('Student');
  const [department, setDepartment] = useState(UCC_DEPARTMENTS[0]);
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailProviderNotice, setEmailProviderNotice] = useState(false);

  function deriveSystemRole(email: string, selectedCampusRole: CampusRole): SystemRole {
    if (email.trim().toLowerCase() === 'admin@ucc.edu.gh') return 'admin';
    if (selectedCampusRole === 'Lecturer') return 'lecturer';
    return 'student';
  }

  function mapAuthError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/operation-not-allowed') {
      setEmailProviderNotice(true);
      return 'Email/Password sign-in is not yet enabled in this Firebase project. Enable it in Firebase Console (Authentication -> Sign-in method -> Email/Password) or continue with Google Sign-In below.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Switch to Sign In to access your dashboard.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please verify your credentials and try again.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in window was closed before completing authentication.';
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setEmailProviderNotice(false);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setEmailProviderNotice(false);

    const cleanedId = sanitizeUccId(uccId);
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!regEmail.trim().includes('@')) {
      setErrorMsg('Please enter a valid university or personal email address.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (cleanedId.length < 3 || !VALIDATION_LIMITS.uccIdRegex.test(cleanedId)) {
      setErrorMsg('Please enter a valid UCC Staff or Student ID (e.g., PS/CSC/22/0041 or UCC-STF-104).');
      return;
    }

    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        regEmail.trim(),
        regPassword
      );
      await updateProfile(credential.user, {
        displayName: fullName.trim(),
      });
      const systemRole = resolveDefaultRole(
        regEmail.trim(),
        deriveSystemRole(regEmail.trim(), campusRole)
      );
      const profile = await createUserProfile({
        uid: credential.user.uid,
        fullName: fullName.trim(),
        email: regEmail.trim(),
        uccId: cleanedId,
        department,
        role: systemRole,
        campusRole,
        phone: phone.trim(),
      });
      onAuthComplete(profile);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteGoogleProfile(e: FormEvent) {
    e.preventDefault();
    if (!pendingGoogleUser) return;
    setErrorMsg(null);

    const cleanedId = sanitizeUccId(uccId);
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (cleanedId.length < 3 || !VALIDATION_LIMITS.uccIdRegex.test(cleanedId)) {
      setErrorMsg('Please enter a valid UCC Staff or Student ID (e.g., PS/CSC/22/0041 or UCC-STF-104).');
      return;
    }

    setSubmitting(true);
    try {
      const userEmail = pendingGoogleUser.email ?? 'member@ucc.edu.gh';
      const systemRole = resolveDefaultRole(
        userEmail,
        deriveSystemRole(userEmail, campusRole)
      );
      const profile = await createUserProfile({
        uid: pendingGoogleUser.uid,
        fullName: fullName.trim(),
        email: userEmail,
        uccId: cleanedId,
        department,
        role: systemRole,
        campusRole,
        phone: phone.trim(),
      });
      onAuthComplete(profile);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setErrorMsg(null);
    setEmailProviderNotice(false);
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 grid lg:grid-cols-12 items-stretch">
      {/* Left Institutional Showcase Panel */}
      <div className="relative lg:col-span-6 xl:col-span-7 hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900 text-white min-h-screen">
        {!heroImgFailed ? (
          <img
            src={HERO_IMAGE}
            alt="University of Cape Coast academic lecture complex"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D5B] via-slate-900 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-[#0B2D5B]/55" />

        <div className="relative z-10 p-10 xl:p-14 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tracking-tight text-white">CampusSpace UCC</span>
            <p className="text-xs text-slate-300 mt-1">
              University of Cape Coast · Classroom &amp; AV Operations
            </p>
          </div>
          <span className="font-mono text-xs text-amber-300 tracking-wide">
            Group 6 Academic Portal
          </span>
        </div>

        <div className="relative z-10 p-10 xl:p-14 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight text-balance">
              Coordinate every lecture hall, booking, and audio system across UCC.
            </h1>
            <p className="text-base text-slate-200 leading-relaxed max-w-xl">
              Track live venue availability from New Lecture Theatre to Old Site, submit reservation requests for admin approval, dispatch emergency standby rooms, and monitor microphone and speaker readiness.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <Building2 className="h-4 w-4" />
                <span>5 Campus Zones</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                New Site, Old Site, Science, Business &amp; Sam Jonah Library.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <Mic className="h-4 w-4" />
                <span>AV Readiness</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Live wireless microphone battery levels and speaker diagnostics.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Approved Scheduling</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Role-verified booking workflows for students, lecturers, and admins.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="lg:hidden pb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xl font-bold tracking-tight">CampusSpace UCC</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Classroom &amp; AV Management Portal
            </p>
          </div>

          {pendingGoogleUser ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <UserCheck className="h-4 w-4" />
                  <span>Account Registration</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Complete your UCC account profile
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Signed in as <span className="font-medium text-slate-900 dark:text-slate-200">{pendingGoogleUser.email}</span>. Provide your university details to continue.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCompleteGoogleProfile} className="space-y-4">
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
                    placeholder="Kwame Mensah"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      placeholder="PS/CSC/22/0041"
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Academic Role
                    </label>
                    <select
                      value={campusRole}
                      onChange={(e) => setCampusRole(e.target.value as CampusRole)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {CAMPUS_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Department / Faculty
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {UCC_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      maxLength={VALIDATION_LIMITS.phoneMax}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut(auth);
                      onCancelPendingGoogle();
                    }}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
                  >
                    Use Another Account
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Save &amp; Enter Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  {mode === 'login' ? 'Sign in to CampusSpace' : 'Create your UCC account'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Access live venue availability, bookings, and AV diagnostics.'
                    : 'New accounts default to Student access; admins manage approvals.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p>{errorMsg}</p>
                    {emailProviderNotice && (
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        Quick fix: Use &ldquo;Continue with Google&rdquo; below right now, or enable Email/Password inside Firebase Console &rarr; Authentication &rarr; Sign-in method.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@ucc.edu.gh"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={VALIDATION_LIMITS.fullNameMax}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Ama Serwaa Boateng"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={VALIDATION_LIMITS.emailMax}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="ama.boateng@ucc.edu.gh"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        UCC Staff / Student ID
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={VALIDATION_LIMITS.uccIdMax}
                        value={uccId}
                        onChange={(e) => setUccId(e.target.value)}
                        placeholder="PS/CSC/22/0041"
                        className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Academic Role
                      </label>
                      <select
                        value={campusRole}
                        onChange={(e) => setCampusRole(e.target.value as CampusRole)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {CAMPUS_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        maxLength={VALIDATION_LIMITS.phoneMax}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Department / Faculty
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {UCC_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3.5 pr-9 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2D5B] hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-xs text-slate-400">or</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleAuth}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
