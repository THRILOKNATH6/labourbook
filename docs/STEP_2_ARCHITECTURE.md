# STEP 2 Architecture - Labour & Contractor Management

## Overview
This module introduces the ability to manage contractors and labours within specific projects. 

## Relationships
- **Projects <-> Contractors:** One-to-Many. A project can have multiple contractors assigned.
- **Projects <-> Labours:** One-to-Many. Labours belong to a specific project.
- **Contractors <-> Labours:** One-to-Many. Labours can optionally be assigned under a contractor, or they can be direct company labours (Contractor ID is NULL).

## Database Additions
- `contractors` table: Tracks contractor business info, project assignment, and capacity.
- `labours` table: Tracks personal info, skills, wages, and optionally links to a contractor.

## Backend Implementations
- **Multer Integration:** `upload.middleware.js` added to handle file uploads locally (`/uploads/profiles` and `/uploads/documents`).
- **New Routes:** `/api/contractors` and `/api/labours`.
- **Validation:** Added `express-validator` logic for both entities.
- **Static files:** `app.js` now serves the `/uploads` directory natively.

## Frontend Implementations
- **Project Navigation:** Introduced a tabbed layout in `/projects/[id]` to toggle between Overview, Labours, and Contractors.
- **Forms:** Reusable `react-hook-form` structures for both add and edit flows.
- **File Handling:** `FormData` is used to submit payload + images/documents to the Node backend using `axios`.
- **UI:** Clean, mobile-first cards that gracefully handle missing photos and render contextual icons.

## File Structure Additions
```
frontend/app/projects/[id]/
├── layout.tsx                (Tab UI)
├── page.tsx                  (Overview)
├── contractors/
│   ├── page.tsx              (List)
│   ├── add/page.tsx
│   └── edit/[contractorId]/page.tsx
└── labours/
    ├── page.tsx              (List)
    ├── add/page.tsx
    └── edit/[labourId]/page.tsx
```
