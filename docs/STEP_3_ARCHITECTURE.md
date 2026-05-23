# STEP 3 Architecture - Attendance & OT Management

## Overview
This module introduces the ability to track daily attendance, shifts, working hours, and Overtime (OT) for labours.

## Database Additions
- `shifts` table: Stores shift timings and standard working hours per shift.
- `attendance` table: Tracks daily attendance per labour, including check-in, check-out, status (Present, Absent, Half Day), working hours, and OT.
- Indexes on `project_id`, `labour_id`, and `attendance_date` to ensure lightning-fast daily and monthly querying.

## Backend Implementations
- **Attendance Service:** `services/attendance.service.js` strictly calculates working hours and OT. Normal hours are capped at 8 per day. Any excess is logged as OT.
- **APIs:** 
  - `POST /api/attendance` -> Marks individual attendance with auto calculation.
  - `POST /api/attendance/bulk` -> Bulk insert using SQL Transactions (`BEGIN` / `COMMIT`) for absolute data integrity.
  - `GET /api/attendance/monthly` -> Aggregates monthly data, including sum of OT and working hours.
  - `POST/GET /api/shifts` -> Management of standard shifts.

## Frontend Implementations
- **Daily Attendance View:** Added to the tab layout at `/projects/[id]/attendance`. Features an optimistic UI pattern, allowing the admin to click "Present", "Absent", or "Half Day" with instant visual feedback while the API syncs in the background.
- **Dynamic Timers:** If "Present" is selected, the UI dynamically reveals `Check In` and `Check Out` time inputs.
- **Monthly Reports View:** Accessible at `/projects/[id]/attendance/reports`. Calculates estimated salary dynamically on the frontend using `(present + half_day*0.5) * daily_wage + (ot_hours * daily_wage/8)`.

## Future-Ready Architecture
The database and API are structured to support future extensions like:
- **Biometric / GPS Check-In:** The check-in and check-out fields accept raw timestamps.
- **Offline Sync:** The `bulk` attendance API is designed to accept arrays of records, perfect for offline-first mobile apps syncing back to the server once internet is restored.
