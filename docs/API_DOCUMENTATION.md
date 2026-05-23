# API Documentation

## Auth Endpoints
### `POST /api/auth/login`
- **Desc**: Admin login
- **Body**: `{ "email": "admin@labourbook.com", "password": "password123" }`
- **Response**: `{ success: true, data: { user, token } }`

### `GET /api/auth/profile`
- **Desc**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, data: { user } }`

## Project Endpoints
### `POST /api/projects`
- **Desc**: Create a new project
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "...", "location": "...", "start_date": "...", "status": "active" }`
- **Response**: `{ success: true, data: { project } }`

### `GET /api/projects`
- **Desc**: Get all projects
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, data: { projects } }`

### `GET /api/projects/:id`
- **Desc**: Get project by ID
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, data: { project } }`

### `PUT /api/projects/:id`
- **Desc**: Update project
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "...", "location": "...", "start_date": "...", "status": "active" }`
- **Response**: `{ success: true, data: { project } }`

### `DELETE /api/projects/:id`
- **Desc**: Delete project
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success: true, message: "Project deleted successfully" }`
