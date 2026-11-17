import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { INITIAL_UCC_ROOMS } from '../data/seedRooms';
import {
  VALIDATION_LIMITS,
  type ActivityLog,
  type AvGearType,
  type AvLog,
  type Booking,
  type CampusRole,
  type CampusZone,
  type Classroom,
  type EmergencyIssueType,
  type EmergencyRequest,
  type EmergencyUrgency,
  type MicStatus,
  type RoomStatus,
  type SpeakerStatus,
  type SystemRole,
  type UserProfile,
  type VenueSchedule,
} from '../types';

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function sanitizeUccId(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9/_-]/g, '');
  return cleaned.slice(0, VALIDATION_LIMITS.uccIdMax);
}

export function sanitizeVenueId(code: string): string {
  const cleaned = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (cleaned || `VENUE-${Date.now()}`).slice(0, 64);
}

export function isBookingInFuture(dateStr: string, startTime: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const safeTime = startTime && startTime.length >= 4 ? startTime : '23:59';
  const target = new Date(`${dateStr}T${safeTime}:00`);
  if (Number.isNaN(target.getTime())) {
    const todayStr = now.toISOString().slice(0, 10);
    return dateStr >= todayStr;
  }
  return target.getTime() > now.getTime();
}

export const AUTO_ADMIN_EMAILS = [
  'alidujohnwumbei12@gmail.com',
  'admin@ucc.edu.gh',
] as const;

export function isAutoAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTO_ADMIN_EMAILS.includes(normalized as (typeof AUTO_ADMIN_EMAILS)[number]);
}

export function isAdminProfile(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.role === 'admin' ||
    profile.campusRole === 'Admin' ||
    profile.campusRole === 'Administrator' ||
    isAutoAdminEmail(profile.email)
  );
}

export function hasFirestoreAdminAccess(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || isAutoAdminEmail(profile.email);
}

export function resolveDefaultRole(email: string, requestedRole?: SystemRole): SystemRole {
  if (isAutoAdminEmail(email)) {
    return 'admin';
  }
  if (requestedRole === 'lecturer') return 'lecturer';
  return 'student';
}

export async function getUserProfile(
  uid: string,
  authEmail?: string | null
): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const raw = snap.data() as Partial<UserProfile>;
    const effectiveEmail = authEmail ?? raw.email ?? '';
    const autoAdmin = isAutoAdminEmail(effectiveEmail);

    const resolvedRole: SystemRole = autoAdmin
      ? 'admin'
      : raw.role === 'admin' || raw.role === 'lecturer' || raw.role === 'student'
        ? raw.role
        : 'student';

    const resolvedCampusRole: CampusRole = autoAdmin
      ? 'Admin'
      : raw.campusRole ?? 'Student';

    // On login: if auto-admin email doesn't yet have role='admin' & campusRole='Admin' in Firestore, persist it immediately
    if (autoAdmin && (raw.role !== 'admin' || raw.campusRole !== 'Admin')) {
      try {
        await updateDoc(doc(db, 'users', uid), {
          role: 'admin',
          campusRole: 'Admin',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Auto-admin promotion sync error:', err);
      }
    }

    return {
      uid: raw.uid ?? uid,
      fullName: raw.fullName ?? 'Campus User',
      email: raw.email ?? effectiveEmail,
      uccId: raw.uccId ?? 'UCC-USER',
      department: raw.department ?? 'Computer Science & IT',
      role: resolvedRole,
      campusRole: resolvedCampusRole,
      phone: raw.phone ?? '',
      disabled: Boolean(raw.disabled),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(input: {
  uid: string;
  fullName: string;
  email: string;
  uccId: string;
  department: string;
  role?: SystemRole;
  campusRole: CampusRole;
  phone: string;
}): Promise<UserProfile> {
  const path = `users/${input.uid}`;
  const autoAdmin = isAutoAdminEmail(input.email);
  const finalRole = resolveDefaultRole(input.email, input.role);
  const finalCampusRole: CampusRole = autoAdmin ? 'Admin' : input.campusRole;

  const payload = {
    uid: input.uid,
    fullName: clampString(input.fullName, VALIDATION_LIMITS.fullNameMax),
    email: clampString(input.email, VALIDATION_LIMITS.emailMax),
    uccId: sanitizeUccId(input.uccId),
    department: clampString(input.department, VALIDATION_LIMITS.departmentMax),
    role: finalRole,
    campusRole: finalCampusRole,
    phone: clampString(input.phone, VALIDATION_LIMITS.phoneMax),
    disabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', input.uid), payload);
    const created = await getUserProfile(input.uid, input.email);
    if (!created) {
      throw new Error('Profile created but could not be reloaded.');
    }
    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    fullName: string;
    uccId: string;
    department: string;
    campusRole: CampusRole;
    phone: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      fullName: clampString(updates.fullName, VALIDATION_LIMITS.fullNameMax),
      uccId: sanitizeUccId(updates.uccId),
      department: clampString(updates.department, VALIDATION_LIMITS.departmentMax),
      campusRole: updates.campusRole,
      phone: clampString(updates.phone, VALIDATION_LIMITS.phoneMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function logActivity(input: {
  action: string;
  target: string;
  details: string;
  profile: UserProfile;
}): Promise<void> {
  const ref = doc(collection(db, 'activityLogs'));
  try {
    await setDoc(ref, {
      action: clampString(input.action, 80),
      target: clampString(input.target, 120),
      details: clampString(input.details, 280),
      actorId: input.profile.uid,
      actorName: clampString(input.profile.fullName, 80),
      actorRole: input.profile.role,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Activity log write skipped:', error);
  }
}

export async function seedInitialVenuesIfEmpty(userId: string): Promise<void> {
  const path = 'venues';
  try {
    const existing = await getDocs(
      query(
        collection(db, 'venues'),
        where('status', 'in', ['Available', 'Occupied', 'Reserved', 'Maintenance', 'Emergency']),
        limit(1)
      )
    );
    if (!existing.empty) return;

    const batch = writeBatch(db);
    for (const room of INITIAL_UCC_ROOMS) {
      const ref = doc(db, 'venues', room.id);
      batch.set(ref, {
        code: room.code,
        name: room.name,
        building: room.building,
        campusZone: room.campusZone,
        capacity: room.capacity,
        status: room.status,
        blocked: room.blocked,
        maintenanceNote: room.maintenanceNote,
        currentCourse: room.currentCourse,
        currentLecturer: room.currentLecturer,
        timeSlot: room.timeSlot,
        micStatus: room.micStatus,
        micBattery: room.micBattery,
        speakerStatus: room.speakerStatus,
        projectorReady: room.projectorReady,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeVenues(onData: (venues: Classroom[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'venues'),
    where('status', 'in', ['Available', 'Occupied', 'Reserved', 'Maintenance', 'Emergency'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const raw = d.data() as Partial<Classroom>;
          return {
            id: d.id,
            code: raw.code ?? d.id,
            name: raw.name ?? d.id,
            building: raw.building ?? 'UCC Campus',
            campusZone: raw.campusZone ?? 'New Site',
            capacity: raw.capacity ?? 100,
            status: raw.status ?? 'Available',
            blocked: Boolean(raw.blocked),
            maintenanceNote: raw.maintenanceNote ?? '',
            currentCourse: raw.currentCourse ?? '',
            currentLecturer: raw.currentLecturer ?? '',
            timeSlot: raw.timeSlot ?? '',
            micStatus: raw.micStatus ?? 'Ready',
            micBattery: raw.micBattery ?? 100,
            speakerStatus: raw.speakerStatus ?? 'Operational',
            projectorReady: raw.projectorReady ?? true,
            updatedBy: raw.updatedBy ?? '',
            updatedAt: raw.updatedAt,
          } as Classroom;
        })
        .sort((a, b) => a.code.localeCompare(b.code));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'venues')
  );
}

export function subscribeVenueSchedules(
  onData: (schedules: VenueSchedule[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'venueSchedules'),
    where('status', 'in', ['approved', 'cancelled']),
    limit(200)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<VenueSchedule, 'id'>),
        }))
        .filter((s) => s.status === 'approved')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'venueSchedules')
  );
}

export function subscribeMyBookings(
  uid: string,
  onData: (bookings: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('requestedBy', '==', uid),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Booking, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'bookings')
  );
}

export function subscribeAllBookings(onData: (bookings: Booking[]) => void): Unsubscribe {
  const q = query(collection(db, 'bookings'), limit(200));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Booking, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'bookings')
  );
}

export function subscribeAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), limit(200));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const raw = d.data() as Partial<UserProfile>;
          return {
            uid: raw.uid ?? d.id,
            fullName: raw.fullName ?? 'User',
            email: raw.email ?? '',
            uccId: raw.uccId ?? '',
            department: raw.department ?? '',
            role: raw.role ?? 'student',
            campusRole: raw.campusRole ?? 'Student',
            phone: raw.phone ?? '',
            disabled: Boolean(raw.disabled),
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          } as UserProfile;
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'users')
  );
}

export function subscribeActivityLogs(onData: (logs: ActivityLog[]) => void): Unsubscribe {
  const q = query(collection(db, 'activityLogs'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityLog, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'activityLogs')
  );
}

export function subscribeEmergencies(
  onData: (emergencies: EmergencyRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'emergencies'),
    where('status', 'in', ['Open', 'Dispatched', 'Resolved']),
    limit(80)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmergencyRequest, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 40);
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'emergencies')
  );
}

export function subscribeAvLogs(onData: (logs: AvLog[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'avLogs'),
    where('gearType', 'in', ['Microphone', 'Speaker', 'Soundbar']),
    limit(60)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AvLog, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 30);
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'avLogs')
  );
}

// Users create bookings with status = "pending" ONLY
export async function createBookingRequest(
  venue: Classroom,
  profile: UserProfile,
  input: {
    courseCode: string;
    courseTitle: string;
    date: string;
    startTime: string;
    endTime: string;
    attendeesCount: number;
  }
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated to book a venue.');
  if (profile.disabled) throw new Error('Your account has been disabled by an administrator.');
  if (venue.blocked || venue.status === 'Maintenance') {
    throw new Error(`${venue.code} is currently blocked for maintenance.`);
  }

  const bookingRef = doc(collection(db, 'bookings'));
  try {
    await setDoc(bookingRef, {
      roomId: venue.id,
      roomCode: venue.code,
      roomName: venue.name,
      courseCode: clampString(input.courseCode, VALIDATION_LIMITS.courseCodeMax),
      courseTitle: clampString(input.courseTitle, VALIDATION_LIMITS.courseTitleMax),
      date: clampString(input.date, 20),
      startTime: clampString(input.startTime, 10),
      endTime: clampString(input.endTime, 10),
      attendeesCount: Math.max(1, Math.min(2000, Math.round(input.attendeesCount))),
      status: 'pending',
      requestedBy: uid,
      requestedAt: serverTimestamp(),
      reviewedBy: '',
      reviewedByName: '',
      reviewedAt: null,
      reason: '',
      cancelledByName: '',
      ownerId: uid,
      ownerName: clampString(profile.fullName, 80),
      ownerDepartment: clampString(profile.department, VALIDATION_LIMITS.departmentMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logActivity({
      action: 'Booking Requested',
      target: `${venue.code} (${input.courseCode})`,
      details: `${profile.fullName} requested ${venue.code} for ${input.date} (${input.startTime}–${input.endTime})`,
      profile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bookings');
  }
}

export async function cancelOwnBooking(
  booking: Booking,
  profile: UserProfile,
  reason: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');
  if (!isBookingInFuture(booking.date, booking.startTime)) {
    throw new Error('Only future pending or approved bookings can be cancelled.');
  }

  const cleanReason = clampString(
    reason || 'Cancelled by requester',
    VALIDATION_LIMITS.reasonMax
  );

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'cancelled',
      reason: cleanReason,
      cancelledByName: clampString(profile.fullName, 80),
      updatedAt: serverTimestamp(),
    });

    if (booking.status === 'approved') {
      const schedSnap = await getDoc(doc(db, 'venueSchedules', booking.id));
      if (schedSnap.exists()) {
        batch.update(doc(db, 'venueSchedules', booking.id), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      }
      if (profile.role === 'admin') {
        batch.update(doc(db, 'venues', booking.roomId), {
          status: 'Available',
          currentCourse: '',
          currentLecturer: '',
          timeSlot: '',
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();

    await logActivity({
      action: 'Booking Cancelled',
      target: `${booking.roomCode} (${booking.courseCode})`,
      details: `${profile.fullName} cancelled booking: ${cleanReason}`,
      profile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

// Admin Booking Actions
export async function adminApproveBooking(
  booking: Booking,
  adminProfile: UserProfile
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }

  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'approved',
      reviewedBy: uid,
      reviewedByName: clampString(adminProfile.fullName, 80),
      reviewedAt: serverTimestamp(),
      reason: '',
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'venueSchedules', booking.id), {
      venueId: booking.roomId,
      venueCode: booking.roomCode,
      venueName: booking.roomName,
      courseCode: booking.courseCode,
      courseTitle: booking.courseTitle,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: 'approved',
      requestedBy: booking.requestedBy,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'venues', booking.roomId), {
      status: 'Reserved',
      currentCourse: `${booking.courseCode} · ${booking.courseTitle}`.slice(0, 120),
      currentLecturer: booking.ownerName.slice(0, 80),
      timeSlot: `${booking.date} · ${booking.startTime}–${booking.endTime}`.slice(0, 60),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    await logActivity({
      action: 'Booking Approved',
      target: `${booking.roomCode} (${booking.courseCode})`,
      details: `${adminProfile.fullName} approved ${booking.ownerName}'s booking for ${booking.date}`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function adminRejectBooking(
  booking: Booking,
  adminProfile: UserProfile,
  reason: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }

  const cleanReason = clampString(reason, VALIDATION_LIMITS.reasonMax);
  try {
    await updateDoc(doc(db, 'bookings', booking.id), {
      status: 'rejected',
      reviewedBy: uid,
      reviewedByName: clampString(adminProfile.fullName, 80),
      reviewedAt: serverTimestamp(),
      reason: cleanReason,
      updatedAt: serverTimestamp(),
    });

    await logActivity({
      action: 'Booking Rejected',
      target: `${booking.roomCode} (${booking.courseCode})`,
      details: `${adminProfile.fullName} rejected ${booking.ownerName}'s request: ${cleanReason}`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function adminForceCancelBooking(
  booking: Booking,
  adminProfile: UserProfile,
  reason: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }

  const cleanReason = clampString(
    reason || 'Force-cancelled by Administrator',
    VALIDATION_LIMITS.reasonMax
  );
  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'cancelled',
      reviewedBy: uid,
      reviewedByName: clampString(adminProfile.fullName, 80),
      reviewedAt: serverTimestamp(),
      reason: cleanReason,
      cancelledByName: clampString(adminProfile.fullName, 80),
      updatedAt: serverTimestamp(),
    });

    const schedSnap = await getDoc(doc(db, 'venueSchedules', booking.id));
    if (schedSnap.exists()) {
      batch.update(doc(db, 'venueSchedules', booking.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    }

    batch.update(doc(db, 'venues', booking.roomId), {
      status: 'Available',
      currentCourse: '',
      currentLecturer: '',
      timeSlot: '',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    await logActivity({
      action: 'Booking Force-Cancelled',
      target: `${booking.roomCode} (${booking.courseCode})`,
      details: `${adminProfile.fullName} force-cancelled ${booking.ownerName}'s booking: ${cleanReason}`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

// Admin User Management
export async function adminUpdateUser(
  target: UserProfile,
  updates: { role: SystemRole; disabled: boolean },
  adminProfile: UserProfile
): Promise<void> {
  if (!hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }
  const campusRole: CampusRole =
    updates.role === 'admin'
      ? 'Admin'
      : updates.role === 'lecturer'
        ? 'Lecturer'
        : 'Student';
  try {
    await updateDoc(doc(db, 'users', target.uid), {
      role: updates.role,
      campusRole,
      disabled: updates.disabled,
      updatedAt: serverTimestamp(),
    });

    await logActivity({
      action: 'User Account Updated',
      target: target.fullName,
      details: `Role set to ${updates.role}, disabled=${String(updates.disabled)} by ${adminProfile.fullName}`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${target.uid}`);
  }
}

// Admin Venue CRUD
export async function adminSaveVenue(
  input: {
    id?: string;
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
  },
  adminProfile: UserProfile
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }

  const venueId = input.id ? input.id : sanitizeVenueId(input.code);
  const finalStatus: RoomStatus = input.blocked ? 'Maintenance' : input.status;

  try {
    if (input.id) {
      await updateDoc(doc(db, 'venues', venueId), {
        code: clampString(input.code.toUpperCase(), 24),
        name: clampString(input.name, 100),
        building: clampString(input.building, 80),
        campusZone: input.campusZone,
        capacity: Math.max(5, Math.min(2000, Math.round(input.capacity))),
        status: finalStatus,
        blocked: input.blocked,
        maintenanceNote: clampString(input.maintenanceNote, VALIDATION_LIMITS.maintenanceNoteMax),
        micStatus: input.micStatus,
        micBattery: Math.max(0, Math.min(100, Math.round(input.micBattery))),
        speakerStatus: input.speakerStatus,
        projectorReady: input.projectorReady,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'venues', venueId), {
        code: clampString(input.code.toUpperCase(), 24),
        name: clampString(input.name, 100),
        building: clampString(input.building, 80),
        campusZone: input.campusZone,
        capacity: Math.max(5, Math.min(2000, Math.round(input.capacity))),
        status: finalStatus,
        blocked: input.blocked,
        maintenanceNote: clampString(input.maintenanceNote, VALIDATION_LIMITS.maintenanceNoteMax),
        currentCourse: '',
        currentLecturer: '',
        timeSlot: '',
        micStatus: input.micStatus,
        micBattery: Math.max(0, Math.min(100, Math.round(input.micBattery))),
        speakerStatus: input.speakerStatus,
        projectorReady: input.projectorReady,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    }

    await logActivity({
      action: input.id ? 'Venue Updated' : 'Venue Added',
      target: input.code.toUpperCase(),
      details: `${adminProfile.fullName} ${input.id ? 'updated' : 'created'} venue ${input.code.toUpperCase()} (${finalStatus})`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `venues/${venueId}`);
  }
}

export async function adminToggleVenueMaintenance(
  venue: Classroom,
  block: boolean,
  note: string,
  adminProfile: UserProfile
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }
  try {
    await updateDoc(doc(db, 'venues', venue.id), {
      blocked: block,
      status: block ? 'Maintenance' : 'Available',
      maintenanceNote: block
        ? clampString(note || 'Blocked for scheduled maintenance', VALIDATION_LIMITS.maintenanceNoteMax)
        : '',
      currentCourse: block ? '' : venue.currentCourse,
      currentLecturer: block ? '' : venue.currentLecturer,
      timeSlot: block ? '' : venue.timeSlot,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await logActivity({
      action: block ? 'Venue Blocked (Maintenance)' : 'Venue Unblocked',
      target: venue.code,
      details: `${adminProfile.fullName} ${block ? 'blocked' : 'restored'} ${venue.code}${note ? `: ${note}` : ''}`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `venues/${venue.id}`);
  }
}

export async function adminDeleteVenue(
  venue: Classroom,
  adminProfile: UserProfile
): Promise<void> {
  if (!hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }
  try {
    await deleteDoc(doc(db, 'venues', venue.id));
    await logActivity({
      action: 'Venue Deleted',
      target: venue.code,
      details: `${adminProfile.fullName} removed venue ${venue.code} (${venue.name})`,
      profile: adminProfile,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `venues/${venue.id}`);
  }
}

export async function adminReleaseVenue(
  venue: Classroom,
  adminProfile: UserProfile
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !hasFirestoreAdminAccess(adminProfile)) {
    throw new Error('Administrator privileges required.');
  }
  try {
    await updateDoc(doc(db, 'venues', venue.id), {
      status: 'Available',
      blocked: false,
      maintenanceNote: '',
      currentCourse: '',
      currentLecturer: '',
      timeSlot: '',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `venues/${venue.id}`);
  }
}

export async function submitEmergencyDispatch(
  room: Classroom,
  profile: UserProfile,
  input: {
    issueType: EmergencyIssueType;
    urgency: EmergencyUrgency;
    description: string;
    standbyRoom?: Classroom | null;
  }
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  const emergencyRef = doc(collection(db, 'emergencies'));
  const hasStandby = Boolean(input.standbyRoom);

  try {
    const batch = writeBatch(db);
    batch.set(emergencyRef, {
      roomId: room.id,
      roomCode: room.code,
      issueType: input.issueType,
      urgency: input.urgency,
      description: clampString(input.description, VALIDATION_LIMITS.emergencyDescMax),
      standbyRoomCode: input.standbyRoom ? input.standbyRoom.code : '',
      status: hasStandby ? 'Dispatched' : 'Open',
      ownerId: uid,
      ownerName: clampString(profile.fullName, 80),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (profile.role === 'admin') {
      batch.update(doc(db, 'venues', room.id), {
        status: 'Emergency',
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });

      if (input.standbyRoom) {
        batch.update(doc(db, 'venues', input.standbyRoom.id), {
          status: 'Reserved',
          currentCourse: `Emergency Relocation (${room.code})`.slice(0, 120),
          currentLecturer: clampString(profile.fullName, 80),
          timeSlot: 'Immediate Standby',
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'emergencies');
  }
}

export async function resolveEmergencyDispatch(
  emergency: EmergencyRequest,
  profile: UserProfile,
  restoreRoomAvailable: boolean
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'emergencies', emergency.id), {
      status: 'Resolved',
      updatedAt: serverTimestamp(),
    });

    if (restoreRoomAvailable && profile.role === 'admin') {
      batch.update(doc(db, 'venues', emergency.roomId), {
        status: 'Available',
        currentCourse: '',
        currentLecturer: '',
        timeSlot: '',
        micStatus: 'Ready',
        speakerStatus: 'Operational',
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `emergencies/${emergency.id}`);
  }
}

export async function updateRoomAvAndLog(
  room: Classroom,
  profile: UserProfile,
  input: {
    gearType: AvGearType;
    action: string;
    micStatus?: MicStatus;
    micBattery?: number;
    speakerStatus?: SpeakerStatus;
    projectorReady?: boolean;
  }
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  const nextBattery =
    typeof input.micBattery === 'number'
      ? Math.max(0, Math.min(100, Math.round(input.micBattery)))
      : room.micBattery;

  const logRef = doc(collection(db, 'avLogs'));
  try {
    const batch = writeBatch(db);
    if (profile.role === 'admin') {
      batch.update(doc(db, 'venues', room.id), {
        micStatus: input.micStatus ?? room.micStatus,
        micBattery: nextBattery,
        speakerStatus: input.speakerStatus ?? room.speakerStatus,
        projectorReady: input.projectorReady ?? room.projectorReady,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(logRef, {
      roomId: room.id,
      roomCode: room.code,
      gearType: input.gearType,
      action: clampString(input.action, VALIDATION_LIMITS.avActionMax),
      batteryAfter: nextBattery,
      ownerId: uid,
      ownerName: clampString(profile.fullName, 80),
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'avLogs');
  }
}
