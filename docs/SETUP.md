# Labour Book - Setup Instructions

## Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally
- npm or yarn

## Database Setup
1. Create a database named `labour_book`:
   ```bash
   psql -U postgres -c "CREATE DATABASE labour_book;"
   ```
2. Set up the schema:
   ```bash
   psql -U postgres -d labour_book -f backend/src/models/schema.sql
   ```

## Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. The `.env` file is already created. Make sure the database credentials match your local setup.
3. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
4. Seed the database with the default admin account:
   ```bash
   npm run seed
   ```
   **Default Credentials:**
   - Email: `admin@labourbook.com`
   - Password: `admin123`
5. Start the backend server:
   ```bash
   npm run dev
   ```

## Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install axios react-hook-form lucide-react sonner react-hot-toast js-cookie
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   
The app should be running at `http://localhost:3000`.
