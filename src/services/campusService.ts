import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
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
  type AvGearType,
  type AvLog,
  type Booking,
  type CampusRole,
  type Classroom,
  type EmergencyIssueType,
  type EmergencyRequest,
  type EmergencyUrgency,
  type MicStatus,
  type RoomStatus,
  type SpeakerStatus,
  type UserProfile,
} from '../types';

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function sanitizeUccId(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9/_-]/g, '');
  return cleaned.slice(0, VALIDATION_LIMITS.uccIdMax);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
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
  campusRole: CampusRole;
  phone: string;
}): Promise<UserProfile> {
  const path = `users/${input.uid}`;
  const payload = {
    uid: input.uid,
    fullName: clampString(input.fullName, VALIDATION_LIMITS.fullNameMax),
    email: clampString(input.email, VALIDATION_LIMITS.emailMax),
    uccId: sanitizeUccId(input.uccId),
    department: clampString(input.department, VALIDATION_LIMITS.departmentMax),
    campusRole: input.campusRole,
    phone: clampString(input.phone, VALIDATION_LIMITS.phoneMax),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', input.uid), payload);
    const created = await getDoc(doc(db, 'users', input.uid));
    return created.data() as UserProfile;
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

export async function seedInitialRoomsIfEmpty(userId: string): Promise<void> {
  const path = 'rooms';
  try {
    const existing = await getDocs(
      query(
        collection(db, 'rooms'),
        where('status', 'in', ['Available', 'Occupied', 'Reserved', 'Cancelled', 'Emergency']),
        limit(1)
      )
    );
    if (!existing.empty) return;

    const batch = writeBatch(db);
    for (const room of INITIAL_UCC_ROOMS) {
      const ref = doc(db, 'rooms', room.id);
      batch.set(ref, {
        code: room.code,
        name: room.name,
        building: room.building,
        campusZone: room.campusZone,
        capacity: room.capacity,
        status: room.status,
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

export function subscribeRooms(onData: (rooms: Classroom[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'rooms'),
    where('status', 'in', ['Available', 'Occupied', 'Reserved', 'Cancelled', 'Emergency'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Classroom, 'id'>) }))
        .sort((a, b) => a.code.localeCompare(b.code));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'rooms')
  );
}

export function subscribeBookings(onData: (bookings: Booking[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('status', 'in', ['Reserved', 'Occupied', 'Cancelled', 'Completed']),
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
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 50);
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'bookings')
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

export async function createRoomBooking(
  room: Classroom,
  profile: UserProfile,
  input: {
    courseCode: string;
    courseTitle: string;
    date: string;
    startTime: string;
    endTime: string;
    attendeesCount: number;
    mode: 'Reserved' | 'Occupied';
  }
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated to book a classroom.');

  const bookingRef = doc(collection(db, 'bookings'));
  const roomRef = doc(db, 'rooms', room.id);
  const courseDisplay = `${clampString(input.courseCode, VALIDATION_LIMITS.courseCodeMax)} · ${clampString(
    input.courseTitle,
    90
  )}`;

  try {
    const batch = writeBatch(db);
    batch.set(bookingRef, {
      roomId: room.id,
      roomCode: room.code,
      roomName: room.name,
      courseCode: clampString(input.courseCode, VALIDATION_LIMITS.courseCodeMax),
      courseTitle: clampString(input.courseTitle, VALIDATION_LIMITS.courseTitleMax),
      date: clampString(input.date, 20),
      startTime: clampString(input.startTime, 10),
      endTime: clampString(input.endTime, 10),
      attendeesCount: Math.max(1, Math.min(2000, Math.round(input.attendeesCount))),
      status: input.mode,
      cancellationReason: '',
      cancelledByName: '',
      ownerId: uid,
      ownerName: clampString(profile.fullName, 80),
      ownerDepartment: clampString(profile.department, VALIDATION_LIMITS.departmentMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(roomRef, {
      status: input.mode as RoomStatus,
      currentCourse: courseDisplay.slice(0, 120),
      currentLecturer: clampString(profile.fullName, 80),
      timeSlot: `${input.startTime} – ${input.endTime}`.slice(0, 60),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bookings');
  }
}

export async function cancelBookingAndReleaseRoom(
  booking: Booking,
  profile: UserProfile,
  reason: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'Cancelled',
      cancellationReason: clampString(reason, VALIDATION_LIMITS.cancellationReasonMax),
      cancelledByName: clampString(profile.fullName, 80),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'rooms', booking.roomId), {
      status: 'Available',
      currentCourse: '',
      currentLecturer: '',
      timeSlot: '',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function startBookedClassSession(booking: Booking): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'Occupied',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'rooms', booking.roomId), {
      status: 'Occupied',
      currentCourse: `${booking.courseCode} · ${booking.courseTitle}`.slice(0, 120),
      currentLecturer: booking.ownerName.slice(0, 80),
      timeSlot: `${booking.startTime} – ${booking.endTime}`.slice(0, 60),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function completeBookedSession(booking: Booking): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  const batch = writeBatch(db);
  try {
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'Completed',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'rooms', booking.roomId), {
      status: 'Available',
      currentCourse: '',
      currentLecturer: '',
      timeSlot: '',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function releaseRoomQuick(room: Classroom): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User must be authenticated.');

  try {
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'Available',
      currentCourse: '',
      currentLecturer: '',
      timeSlot: '',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
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

    batch.update(doc(db, 'rooms', room.id), {
      status: 'Emergency',
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

    if (input.standbyRoom) {
      batch.update(doc(db, 'rooms', input.standbyRoom.id), {
        status: 'Reserved',
        currentCourse: `Emergency Relocation (${room.code})`.slice(0, 120),
        currentLecturer: clampString(profile.fullName, 80),
        timeSlot: 'Immediate Standby',
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'emergencies');
  }
}

export async function resolveEmergencyDispatch(
  emergency: EmergencyRequest,
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

    if (restoreRoomAvailable) {
      batch.update(doc(db, 'rooms', emergency.roomId), {
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
    batch.update(doc(db, 'rooms', room.id), {
      micStatus: input.micStatus ?? room.micStatus,
      micBattery: nextBattery,
      speakerStatus: input.speakerStatus ?? room.speakerStatus,
      projectorReady: input.projectorReady ?? room.projectorReady,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });

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
