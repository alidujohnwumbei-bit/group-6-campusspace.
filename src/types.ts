import type { Timestamp } from 'firebase/firestore';

export type SystemRole = 'student' | 'lecturer' | 'admin';

export type CampusRole =
  | 'Lecturer'
  | 'Class Representative'
  | 'AV Technician'
  | 'Department Coordinator'
  | 'Student'
  | 'Administrator';

export type CampusZone =
  | 'New Site'
  | 'Old Site'
  | 'Science'
  | 'School of Business'
  | 'Library Complex';

export type RoomStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Maintenance'
  | 'Emergency';

export type MicStatus = 'Ready' | 'Low Battery' | 'Charging' | 'Faulty' | 'None';

export type SpeakerStatus = 'Operational' | 'Muted' | 'Faulty' | 'Maintenance';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type EmergencyIssueType =
  | 'Microphone / Audio Failure'
  | 'Projector / Power Outage'
  | 'Lecturer Relocation'
  | 'Room Conflict'
  | 'Emergency Standby';

export type EmergencyUrgency = 'Critical' | 'High' | 'Standard';

export type EmergencyStatus = 'Open' | 'Dispatched' | 'Resolved';

export type AvGearType = 'Microphone' | 'Speaker' | 'Soundbar';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  uccId: string;
  department: string;
  role: SystemRole;
  campusRole: CampusRole;
  phone: string;
  disabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  building: string;
  campusZone: CampusZone;
  capacity: number;
  status: RoomStatus;
  blocked: boolean;
  maintenanceNote: string;
  currentCourse: string;
  currentLecturer: string;
  timeSlot: string;
  micStatus: MicStatus;
  micBattery: number;
  speakerStatus: SpeakerStatus;
  projectorReady: boolean;
  updatedBy: string;
  updatedAt?: Timestamp;
}

export interface Booking {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  courseCode: string;
  courseTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  status: BookingStatus;
  requestedBy: string;
  requestedAt?: Timestamp;
  reviewedBy: string;
  reviewedByName: string;
  reviewedAt?: Timestamp | null;
  reason: string;
  cancelledByName: string;
  ownerId: string;
  ownerName: string;
  ownerDepartment: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VenueSchedule {
  id: string;
  venueId: string;
  venueCode: string;
  venueName: string;
  courseCode: string;
  courseTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'approved' | 'cancelled';
  requestedBy: string;
  updatedAt?: Timestamp;
}

export interface EmergencyRequest {
  id: string;
  roomId: string;
  roomCode: string;
  issueType: EmergencyIssueType;
  urgency: EmergencyUrgency;
  description: string;
  standbyRoomCode: string;
  status: EmergencyStatus;
  ownerId: string;
  ownerName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AvLog {
  id: string;
  roomId: string;
  roomCode: string;
  gearType: AvGearType;
  action: string;
  batteryAfter: number;
  ownerId: string;
  ownerName: string;
  createdAt?: Timestamp;
}

export interface ActivityLog {
  id: string;
  action: string;
  target: string;
  details: string;
  actorId: string;
  actorName: string;
  actorRole: SystemRole;
  createdAt?: Timestamp;
}

export const SYSTEM_ROLES: SystemRole[] = ['student', 'lecturer', 'admin'];

export const CAMPUS_ROLES: CampusRole[] = [
  'Student',
  'Class Representative',
  'Lecturer',
  'AV Technician',
  'Department Coordinator',
];

export const CAMPUS_ZONES: CampusZone[] = [
  'New Site',
  'Old Site',
  'Science',
  'School of Business',
  'Library Complex',
];

export const UCC_DEPARTMENTS: string[] = [
  'Computer Science & IT',
  'School of Business',
  'Mathematics & Statistics',
  'Biological Sciences',
  'Physical Sciences',
  'Education & Social Sciences',
  'Humanities & Legal Studies',
  'Health & Allied Sciences',
  'Campus AV & Facilities Unit',
];

export const VALIDATION_LIMITS = {
  uccIdRegex: /^[a-zA-Z0-9/_-]+$/,
  venueIdRegex: /^[a-zA-Z0-9_-]+$/,
  fullNameMax: 100,
  emailMax: 150,
  uccIdMax: 32,
  departmentMax: 100,
  phoneMax: 24,
  courseCodeMax: 24,
  courseTitleMax: 120,
  reasonMax: 240,
  maintenanceNoteMax: 200,
  emergencyDescMax: 400,
  avActionMax: 120,
} as const;
