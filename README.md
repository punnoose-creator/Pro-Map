# ProMap

ProMap is a modern, full-stack Employee Portal and Field Management application built specifically to streamline field visits, enable voice-first logging, and track GPS metrics for agents in the field.

## 🚀 Key Features

-   **Secure Authentication**: Role-based employee registration and JWT-secured login system.
-   **Voice-First Field Logs**: Seamlessly dictate site notes using the built-in browser Web Speech API with real-time transcription and a fallback text-entry system.
-   **GPS Tracking**: Continuous, accurate location ping tracking (latitude, longitude, speed, heading) during field operations.
-   **Modern Dashboard UI**: A fully responsive, highly aesthetic portal built using the latest Next.js features and smooth UI interactions.

## 🛠 Tech Stack

**Frontend**
-   [Next.js](https://nextjs.org/) (App Router, v16+)
-   React 19 & TypeScript
-   Tailwind CSS (Customized Design System)
-   Web Speech API (For Audio-to-Text)

**Backend**
-   Node.js & Express.js
-   MongoDB & Mongoose
-   JSON Web Tokens (JWT) for secure authentication
-   BcryptJS for password hashing

## 📂 Project Structure

```text
ProMap/
├── backend/                  # Node.js + Express API
│   ├── models/               # MongoDB Database Schemas (Employee, LocationPing)
│   ├── routes/               # API Endpoints (Auth, Locations)
│   ├── middleware/           # JWT and Protect Routines
│   ├── server.js             # Entry point (runs on port 5000)
│   └── package.json
└── frontend/                 # Next.js Application
    ├── app/                  # App Router components, Pages, Layouts and global CSS
    │   ├── dashboard/        # Authenticated Dashboard views
    │   ├── globals.css       # Core Design System
    │   └── page.tsx          # Marketing/Login Landing view
    ├── components/           # Reusable UI Blocks
    ├── lib/                  # Utilities (API clients, formatting)
    └── package.json          # (runs on port 3000)
```

## 💻 Getting Started (Local Development)

### Prerequisites

You will need the following installed:
-   [Node.js](https://nodejs.org/) (v18+ recommended)
-   [MongoDB](https://www.mongodb.com/) (Running locally on default port `27017` or a MongoDB Atlas URI)

### 1. Setup the Backend

Open a terminal and navigate to the backend directory:
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory and add your environment variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/promap
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=30d
```

Start the backend server in development mode:
```bash
npm run dev
```
*The API will start running on `http://localhost:5000`*

### 2. Setup the Frontend

Open a new, separate terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
```

Copy the example environment variables:
```bash
cp .env.example .env
```
Ensure `NEXT_PUBLIC_API_URL` is set to `http://localhost:5000/api` in your `.env`.

Start the Next.js development server:
```bash
npm run dev
```

### 3. Open the App
Visit [http://localhost:3000](http://localhost:3000) in your web browser. 

> **Important note regarding Voice Logs**: Because the Voice Log feature utilizes the native browser Web Speech API, for best results, do not use Brave Browser as it strips the required speech processing keys. Please use standard Google Chrome or Edge when testing microphone functionalities!

---
*Built with ❤️ for field engineering optimization.*
