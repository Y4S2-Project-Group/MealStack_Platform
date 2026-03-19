# MealStack Platform

Cloud-native food ordering system built as five independent Express.js microservices, deployed on **Azure Container Apps** with **MongoDB Atlas** (DB-per-service).

---

## Architecture

| Service        | Port | Database                   | Description                              |
|----------------|------|----------------------------|------------------------------------------|
| Auth           | 4001 | `mealstack_auth_db`        | Registration, login, JWT issuance        |
| Restaurant     | 4002 | `mealstack_restaurant_db`  | Restaurants + menu management            |
| Order          | 4003 | `mealstack_order_db`       | Order lifecycle orchestration            |
| Payment        | 4004 | `mealstack_payment_db`     | Stripe Checkout + webhook verification   |
| Rider          | 4005 | `mealstack_rider_db`       | Delivery job management                  |

Each service exposes:
- `GET /health` — liveness check
- `GET /docs` — Swagger UI (OpenAPI 3)

---

## Running Locally with Docker Compose

> **Prerequisites:** Docker Desktop, Node 20, a `.env` file per service (copy from `.env.example`).

```bash
# From the repo root – starts all 5 services
docker-compose -f infra/docker-compose.dev.yml up --build
```

Services will be available at:

```
http://localhost:4000   API Gateway (single frontend entrypoint)
http://localhost:4001   Auth
http://localhost:4002   Restaurant
http://localhost:4003   Order
http://localhost:4004   Payment
http://localhost:4005   Rider
```

Frontend integration note:

```
Use API Gateway as single base URL: http://localhost:4000
Set CORS_ORIGINS in each service for browser clients.
Example: CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Gateway route map:

```
/auth/*         -> Auth Service
/users/*        -> Auth Service
/restaurants/*  -> Restaurant Service
/orders/*       -> Order Service
/payments/*     -> Payment Service
/deliveries/*   -> Rider Service
```

Gateway docs passthrough:

```
/docs/auth
/docs/restaurant
/docs/order
/docs/payment
/docs/rider
```

Gateway OpenAPI contracts:

```
/openapi/index.json
/openapi/auth.json
/openapi/restaurant.json
/openapi/order.json
/openapi/payment.json
/openapi/rider.json
```

---

## Running a Single Service Locally

```bash
cd services/<service-name>   # e.g. services/auth
cp .env.example .env         # fill in values
npm install
npm run dev
```

The `npm run dev` script uses `nodemon`.

---

## Required Environment Variables

Each service has its own `.env.example`. Common variables across all services:

| Variable    | Description                                    |
|-------------|------------------------------------------------|
| `PORT`      | Service port (4001–4005)                       |
| `MONGO_URI` | MongoDB Atlas connection string (per service)  |
| `JWT_SECRET`| Shared JWT signing secret                      |
| `NODE_ENV`  | `development` / `production`                   |

**Auth Service** (`services/auth/.env.example`):
```
PORT=4001
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mealstack_auth_db
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

**Restaurant Service** (`services/restaurant/.env.example`):
```
PORT=4002
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mealstack_restaurant_db
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

**Order Service** (`services/order/.env.example`):
```
PORT=4003
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mealstack_order_db
JWT_SECRET=your_jwt_secret
NODE_ENV=development
AUTH_SERVICE_URL=http://localhost:4001
RESTAURANT_SERVICE_URL=http://localhost:4002
PAYMENT_SERVICE_URL=http://localhost:4004
RIDER_SERVICE_URL=http://localhost:4005
```

**Payment Service** (`services/payment/.env.example`):
```
PORT=4004
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mealstack_payment_db
JWT_SECRET=your_jwt_secret
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ORDER_SERVICE_URL=http://localhost:4003
```

**Rider Service** (`services/rider/.env.example`):
```
PORT=4005
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mealstack_rider_db
JWT_SECRET=your_jwt_secret
NODE_ENV=development
ORDER_SERVICE_URL=http://localhost:4003
```

---

## CI/CD

Each service has its own GitHub Actions workflow in `.github/workflows/`:

- `auth.yml`, `restaurant.yml`, `order.yml`, `payment.yml`, `rider.yml`

Each pipeline: **install → test → Snyk SAST → Docker build → push ACR → deploy Azure Container App**

Required GitHub Secrets:

| Secret              | Description                        |
|---------------------|------------------------------------|
| `SNYK_TOKEN`        | Snyk authentication token          |
| `ACR_LOGIN_SERVER`  | Azure Container Registry URL       |
| `ACR_USERNAME`      | ACR service principal username     |
| `ACR_PASSWORD`      | ACR service principal password     |
| `AZURE_CREDENTIALS` | Azure service principal JSON       |

---

## Repository Structure

```
MealStack_Platform/
  services/
    auth/         – Auth Service (port 4001)
    restaurant/   – Restaurant Service (port 4002)
    order/        – Order Service (port 4003)
    payment/      – Payment Service (port 4004)
    rider/        – Rider Service (port 4005)
  shared/
    middleware/   – errorHandler, notFound, requireAuth, requireRole
    utils/        – logger
    types/        – shared JSDoc type definitions
  infra/
    docker-compose.dev.yml
  .github/
    workflows/    – CI/CD pipelines (one per service)
```

---

## Tech Stack

- **Runtime:** Node.js 20 + Express.js
- **Database:** MongoDB Atlas (DB-per-service)
- **Auth:** JWT (jsonwebtoken + bcrypt)
- **Payments:** Stripe Checkout (test mode)
- **Containers:** Docker
- **Cloud:** Azure Container Apps + Azure Container Registry
- **CI/CD:** GitHub Actions
- **DevSecOps:** Snyk SAST
- **Docs:** Swagger / OpenAPI 3