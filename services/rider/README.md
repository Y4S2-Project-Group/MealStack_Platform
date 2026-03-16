# 🛵 MealStack Rider Microservice

> Delivery partner microservice for the MealStack food delivery platform. Handles rider authentication, order management, live GPS tracking, and earnings.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion |
| Backend | Node.js 20 + Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Maps | Leaflet.js (OpenStreetMap - FREE) |
| Real-time | Socket.IO |
| Auth | JWT (7-day expiry) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| API Docs | Swagger / OpenAPI 3.0 |

## 📁 Project Structure

```
services/rider/
├── src/
│   ├── config/env.js              # Environment config
│   ├── controllers/
│   │   ├── authController.js      # Register, login, profile
│   │   ├── orderController.js     # Accept, reject, status updates
│   │   ├── earningsController.js  # Earnings summary & history
│   │   └── locationController.js  # GPS location updates
│   ├── models/
│   │   ├── Rider.js               # Rider profile schema
│   │   ├── RiderOrder.js          # Delivery assignments
│   │   ├── RiderEarning.js        # Per-order earnings
│   │   └── Delivery.js            # Legacy delivery model
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── orderRoutes.js
│   │   └── earningsRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification
│   │   └── errorMiddleware.js     # Global error handler
│   ├── services/
│   │   ├── restaurantService.js   # → Restaurant microservice
│   │   ├── customerService.js     # → Customer microservice
│   │   ├── paymentService.js      # → Payment microservice
│   │   └── orderClient.js         # → Order service (legacy)
│   ├── socket/socketHandler.js    # Socket.IO events
│   ├── app.js                     # Express app setup
│   ├── server.js                  # Entry point + Socket.IO
│   └── seed.js                    # Demo data seeder
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Rider login
│   │   │   ├── Register.jsx       # Rider registration
│   │   │   ├── Dashboard.jsx      # Home with stats
│   │   │   ├── Orders.jsx         # Available orders
│   │   │   ├── ActiveDelivery.jsx # Map with bike animation
│   │   │   ├── Earnings.jsx       # Charts & payouts
│   │   │   └── Profile.jsx        # Rider profile
│   │   ├── components/
│   │   │   ├── BottomNav.jsx      # Mobile bottom nav
│   │   │   └── LoadingSkeleton.jsx
│   │   ├── context/AuthContext.jsx # Auth state management
│   │   └── App.jsx                # Routes
│   ├── Dockerfile                 # Nginx serve
│   └── nginx.conf
├── Dockerfile                     # Backend (Node 20 slim)
├── docker-compose.yml
├── swagger.yaml                   # OpenAPI 3.0 spec
└── .env.example
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)

### 1. Backend Setup

```bash
cd services/rider

# Copy env file
cp .env.example .env

# Install dependencies
npm install

# Seed demo data
npm run seed

# Start dev server
npm run dev
```

Backend runs at **http://localhost:3004**
Swagger docs at **http://localhost:3004/docs**

### 2. Frontend Setup

```bash
cd services/rider/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:5173**

### 3. Demo Credentials

```
Email:    rider@demo.com
Password: rider123
```

## 🐳 Docker

```bash
cd services/rider

# Build and run both services
docker-compose up --build

# Backend: http://localhost:3004
# Frontend: http://localhost:5173
```

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/rider/register` | ✗ | Register new rider |
| POST | `/api/rider/login` | ✗ | Login |
| GET | `/api/rider/profile` | ✓ | Get profile |
| PATCH | `/api/rider/profile` | ✓ | Update profile |
| PATCH | `/api/rider/status` | ✓ | Toggle online/offline |
| PATCH | `/api/rider/location` | ✓ | Update GPS location |
| GET | `/api/orders/available` | ✓ | Nearby available orders |
| POST | `/api/orders/:id/accept` | ✓ | Accept order |
| POST | `/api/orders/:id/reject` | ✓ | Reject order |
| PATCH | `/api/orders/:id/status` | ✓ | Update delivery status |
| GET | `/api/orders/active` | ✓ | Current active order |
| GET | `/api/orders/history` | ✓ | Delivery history |
| GET | `/api/earnings/summary` | ✓ | Earnings dashboard data |
| GET | `/api/earnings/history` | ✓ | Payout records |

## 🔗 Inter-Service Communication

| Target Service | Endpoint | Purpose |
|---------------|----------|---------|
| Restaurant | `GET /api/restaurant/:id` | Fetch pickup location |
| Customer | `GET /api/customer/order/:orderId` | Fetch delivery address |
| Payment | `POST /api/payment/rider-credit` | Credit rider earnings |
| Order | `POST /orders/:id/delivery/status` | Notify status change |

All external calls include **retry logic** (3 attempts) and **fallback responses** when services are unavailable.

## 🗺️ Map Feature

- **Leaflet.js** with dark CartoDB tiles
- Animated 🛵 bike marker moving along route
- 📍 Restaurant pickup marker
- 🏠 Customer delivery marker
- Route polyline with dashed style
- Real-time ETA countdown
- LIVE pulsing badge
- Status progress steps: `ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED`

## 🔒 Security

- JWT authentication on all protected routes
- Bcrypt password hashing (12 salt rounds)
- Rate limiting: 100 requests / 15 minutes
- Helmet.js HTTP security headers
- CORS whitelist configuration
- Zod schema validation for environment variables
- Input validation on all endpoints

## 🧪 Testing

```bash
npm test          # Run Jest tests
npm run lint      # ESLint check
```

## 📊 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3004 |
| `MONGO_URI` | MongoDB connection string | *required* |
| `JWT_SECRET` | JWT signing secret | *required* |
| `RESTAURANT_SERVICE_URL` | Restaurant service URL | http://localhost:3001 |
| `CUSTOMER_SERVICE_URL` | Customer service URL | http://localhost:3002 |
| `PAYMENT_SERVICE_URL` | Payment service URL | http://localhost:3003 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

## 👥 Team

MealStack Platform - CTSE Group Assignment
