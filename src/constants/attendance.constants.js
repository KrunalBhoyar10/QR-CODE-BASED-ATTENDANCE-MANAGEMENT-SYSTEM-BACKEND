/**
 * Attendance Module Constants
 * Centralized business rules and thresholds
 */

export const DEFAULT_LOW_ATTENDANCE_THRESHOLD = 75.0;

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
};

export const SESSION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
