import type { Timestamp } from 'firebase/firestore';

export type CampusRole =
  | 'Lecturer'
  | 'Class Representative'
  | 'AV Technician'
  | 'Department Coordinator'
  | 'Student';

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
  | 'Cancelled'
  | 'Emergency';

export type MicStatus = 'Ready' | 'Low Battery' | 'Charging' | 'Faulty' | 'None';

export type SpeakerStatus = 'Operational' | 'Muted' | 'Faulty' | 'Maintenance';

export type BookingStatus = 'Reserved' | 'Occupied' | 'Cancelled' | 'Completed';

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
  campusRole: CampusRole;
  phone: string;
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
  cancellationReason: string;
  cancelledByName: string;
  ownerId: string;
  ownerName: string;
  ownerDepartment: string;
  createdAt?: Timestamp;
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

export const CAMPUS_ROLES: CampusRole[] = [
  'Lecturer',
  'Class Representative',
  'AV Technician',
  'Department Coordinator',
  'Student',
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
  fullNameMax: 100,
  emailMax: 150,
  uccIdMax: 32,
  departmentMax: 100,
  phoneMax: 24,
  courseCodeMax: 24,
  courseTitleMax: 120,
  cancellationReasonMax: 240,
  emergencyDescMax: 400,
  avActionMax: 120,
} as const;
