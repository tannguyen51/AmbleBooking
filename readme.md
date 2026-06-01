#  Amble App — Full Stack Setup Guide

A complete walking route mobile app built with **Expo (React Native)** + **Express.js** + **MongoDB**.

---

## 📁 Project Structure

```
amble-project/
├── backend/                  # Express.js + MongoDB API
│   ├── src/
│   │   ├── s/
│   │   │   ├── User.js       # User schema (customer/admin)
│   │   │   └── Route.js      # Walking route schema
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   └── routeController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   └── routes.js
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   └── server.js         # Entry point
│   ├── scripts/
│   │   └── seed.js           #  Database seed script
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # Expo React Native App
    ├── app/
    │   ├── _layout.tsx       # Root layout + auth guard
    │   ├── (auth)/
    │   │   ├── _layout.tsx
    │   │   ├── login.tsx     # Login screen
    │   │   └── register.tsx  # Register screen
    │   └── (tabs)/
    │       ├── _layout.tsx
    │       ├── index.tsx     # Home screen
    │       ├── explore.tsx   # Explore routes screen
    │       └── profile.tsx   # Profile screen
    ├── services/
    │   └── api.ts            # Axios API service
    ├── store/
    │   └── authStore.ts      # Zustand auth state
    ├── constants/
    │   └── theme.ts          # Design tokens
    └── package.json
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js >= 18
- MongoDB (local or MongoDB Atlas)
- Expo CLI: `npm install -g expo-cli`

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start the server
npm run dev
# Server runs at http://localhost:5000
```

---

### 2. 🌱 Seed the Database

```bash
cd backend

# Run the seed script
npm run seed
```

**This will:**
- Clear existing data
- Insert **8 walking routes** (easy/moderate/hard)
- Insert **4 users** (3 customers + 1 admin)

**Test accounts after seeding:**

| Role     | Email                     | Password      |
|----------|---------------------------|---------------|
| Customer | lan.nguyen@gmail.com      | password123   |
| Customer | minh.tran@gmail.com       | password123   |
| Customer | hoa.pham@gmail.com        | password123   |
| Admin    | admin@amble.com           | admin123456   |

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Update API URL in services/api.ts
# Change BASE_URL to your backend IP:
# - Emulator: http://10.0.2.2:5000/api
# - Physical device: http://YOUR_COMPUTER_IP:5000/api
# - Local: http://localhost:5000/api

# Start Expo
npm start
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (auth required) |

### Users (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/change-password` | Change password |
| POST | `/api/users/favorite/:routeId` | Toggle favorite route |

### Routes (auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | Get all routes (filter by difficulty/search) |
| GET | `/api/routes/popular` | Get popular routes |
| GET | `/api/routes/:id` | Get single route |

---

## 📱 App Screens

| Screen | Description |
|--------|-------------|
| **Login** | Email/password login with demo account hint |
| **Register** | Full registration form with validation |
| **Home** | Dashboard with stats, quick actions, popular routes |
| **Explore** | Search & filter all walking routes |
| **Profile** | View/edit profile, change password, logout |

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs

**Frontend:** Expo, React Native, Expo Router, Zustand, Axios, AsyncStorage, LinearGradient