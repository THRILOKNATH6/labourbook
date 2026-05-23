# Database Schema Overview

## Admins Table
Stores administrators who have access to the dashboard.
- `id`: UUID (Primary Key)
- `name`: String
- `email`: String (Unique)
- `password`: String (Hashed)
- `role`: String (e.g., admin, superadmin)
- `created_at`: Timestamp

## Projects Table
Stores project details.
- `id`: UUID (Primary Key)
- `name`: String
- `description`: Text
- `location`: String
- `start_date`: Date
- `status`: String (active, completed, on_hold, cancelled)
- `created_by`: UUID (Foreign Key to admins)
- `created_at`: Timestamp
- `updated_at`: Timestamp

*Indexes*: 
- `status`
- `created_by`
