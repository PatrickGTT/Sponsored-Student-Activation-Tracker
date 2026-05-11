// Sponsored Student Activation Tracker — schema constants.
//
// The app ships with NO mock student records. Students enter the tracker
// exclusively through CSV imports (PowerSuite for the roster, Enrollment /
// QuickBooks for enrichment). Reset Demo Data restores this empty state.
//
// On import, every new student starts at "Agency Approved / Need to Confirm
// Start Date" regardless of whether PowerSuite has a class start date —
// because no OSS has confirmed anything yet. The start_date_status pill
// (Tentative vs. Not Set) communicates whether a date exists.

export const LIFECYCLE_STATUSES = [
  'Agency Approved / Need to Confirm Start Date',
  'Start Date Confirmed',
  'Student Contacted – Awaiting Confirmation',
  'Student Unreachable',
  'Rescheduled',
  'Started',
  'Completed / Ready to Bill',
  'Billing Submitted to Agency',
  'Paid',
  'Dropped / No-Show',
  'Issue / Escalation',
]

export const START_DATE_STATUSES = [
  'Not Set',
  'Pending Agency Approval',
  'Tentative',
  'Confirmed',
]

export const CONTACT_METHODS = ['Call', 'Text', 'Email', 'In Person', 'Other']

export const CONTACT_RESULTS = [
  'Confirmed Start',
  'Left Voicemail',
  'No Answer',
  'Wrong Number',
  'Student Requested Delay',
  'Student No Longer Interested',
  'Needs Paperwork',
  'Escalate',
]

export const FUNDING_TYPES = [
  'UNISA',
  'WIOA',
  'GI-Bill',
  'Voc Rehab',
  'Affirm',
  'Finance',
]

// Location → default OSS owner. Used at import time to auto-assign a row
// based on its Location column. Extend this table (or import an OSS Names
// CSV from the toolbar) as new locations show up.
export const LOCATION_TO_OSS = {
  Wilmington: 'Sarah Johnson',
  Fayetteville: 'Sarah Johnson',
  Greensboro: 'David Chen',
  'Winston Salem': 'David Chen',
  Atlanta: 'Lisa Martinez',
  Gastonia: 'Lisa Martinez',
  Charlotte: 'Michael Brown',
  Newton: 'Michael Brown',
}

export const STUDENTS = []
