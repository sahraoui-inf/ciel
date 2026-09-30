export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
} as const;

export const ATTENDANCE = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
} as const;

export const ENROLLMENT = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
} as const;

export const CERT_VALIDITY_YEARS = 2;

export const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export const LOG_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  CONFIRM: "CONFIRM",
  VERIFY: "VERIFY",
} as const;
