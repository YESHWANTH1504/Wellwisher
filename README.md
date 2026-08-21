# WellWisher Project

WellWisher is a full-stack application featuring a Flutter-based mobile frontend, a Node.js + Express backend, and a MySQL database.

## Project Structure

```text
WellWisher/
│
├── frontend/          # Flutter Mobile Application
│
├── backend/           # Node.js + Express API Backend
│   ├── config/        # Configurations (Database connect, etc.)
│   ├── controllers/   # Request handlers
│   ├── middleware/    # Auth and utility middlewares
│   ├── models/        # Database models/schemas
│   ├── routes/        # Router files
│   ├── uploads/       # Multer uploads directory
│   ├── utils/         # Helper functions
│   ├── server.js      # Backend server entrypoint
│   ├── package.json   # Backend dependencies and scripts
│   └── .env           # Environment configurations
│
└── README.md          # Project documentation
```

## Setup & Running

### Prerequisites
- Flutter SDK (stable channel)
- Node.js (v18+) & npm
- MySQL Server (running on local machine)

### 1. Database Setup
Ensure your MySQL server is running, and create a database named `wellwisher`. 
An example configuration is provided in `backend/.env`.

### 2. Backend Setup
1. Open terminal in `backend/` directory:
   ```bash
   cd backend
   npm install
   ```
2. Set up environment variables inside `backend/.env`.
3. Start development server:
   ```bash
   npm run dev
   ```
4. Check health endpoint at `http://localhost:3000/api/health`.

### 3. Frontend Setup
1. Open terminal in `frontend/` directory:
   ```bash
   cd frontend
   flutter pub get
   ```
2. Build or run the application:
   ```bash
   flutter run
   ```
