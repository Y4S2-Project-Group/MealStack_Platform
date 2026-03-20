# MealStack Platform

Cloud-native food ordering system built as five independent Express.js microservices, deployed on **Azure Container Apps** with **MongoDB Atlas** (DB-per-service).

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue) ![Node](https://img.shields.io/badge/Node.js-20-green) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green) ![Docker](https://img.shields.io/badge/Docker-Containers-blue)

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Project](#running-the-project)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)

---

## 🏗 Architecture

| Service        | Port | Database                   | Description                              |
|----------------|------|----------------------------|------------------------------------------|
| Auth           | 4001 | `mealstack_auth_db`        | Registration, login, JWT issuance        |
| Restaurant     | 4002 | `mealstack_restaurant_db`  | Restaurants + menu management            |
| Order          | 4003 | `mealstack_order_db`       | Order lifecycle orchestration            |
| Payment        | 4004 | `mealstack_payment_db`     | Stripe Checkout + webhook verification   |
| Rider          | 4005 | `mealstack_rider_db`       | Delivery job management                  |

### Service Communication Flow

```
┌─────────┐     ┌────────────┐     ┌─────────┐
│ Customer│────▶│   Order    │────▶│Restaurant│
└─────────┘     │  Service   │     └─────────┘
                │  (Core)    │
                │            │────▶┌─────────┐
                │            │     │ Payment │
                │            │     └─────────┘
                │            │
                │            │────▶┌─────────┐
                └────────────┘     │  Rider  │
                                  └─────────┘
```

### Key Features

✅ **DB-per-Service Pattern** - Each microservice has its own MongoDB database  
✅ **Circuit Breaker** - Prevents cascading failures  
✅ **Retry Logic** - Exponential backoff for inter-service calls  
✅ **Rate Limiting** - Protection against abuse  
✅ **JWT Authentication** - Secure token-based auth  
✅ **Role-Based Access Control** - Customer, Restaurant Admin, Rider roles  
✅ **API Documentation** - Swagger/OpenAPI 3.0 for each service  
✅ **Health Checks** - Monitoring endpoints for all services  
✅ **CI/CD** - GitHub Actions with Snyk security scanning  

---

## 🚀 Features

### For Customers
- Browse restaurants and menus
- Add items to cart
- Place orders with Stripe checkout
- Track order status in real-time
- View order history

### For Restaurant Admins
- Manage restaurant profile
- Add/update menu items
- View incoming orders
- Update order status

### For Riders
- View available delivery jobs
- Accept deliveries
- Update delivery status
- Track earnings

---

## 💻 Technology Stack

- **Backend:** Node.js 20 + Express.js
- **Database:** MongoDB Atlas (DB-per-service)
- **Authentication:** JWT
- **Payments:** Stripe Checkout
- **Containerization:** Docker + Docker Compose
- **Cloud:** Azure Container Apps
- **Container Registry:** Azure Container Registry
- **CI/CD:** GitHub Actions
- **Security:** Snyk SAST scanning
- **API Docs:** Swagger (OpenAPI 3)
- **Frontend:** React + TypeScript + Vite

---

## 🎯 Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **Docker Desktop** installed and running
- **MongoDB Atlas** account (free tier works)
- **Stripe** test account (optional, for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MealStack_Platform.git
   cd MealStack_Platform
   ```

2. **Install dependencies for all services**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Each service needs its own `.env` file. Templates are provided:

   ```bash
   # Auth Service
   cd services/auth
   cp .env.example .env
   # Edit .env and add your MongoDB connection string

   # Restaurant Service
   cd ../restaurant
   cp .env.example .env
   # Edit .env

   # Order Service
   cd ../order
   cp .env.example .env
   # Edit .env

   # Payment Service
   cd ../payment
   cp .env.example .env
   # Edit .env (include Stripe keys)

   # Rider Service
   cd ../rider
   cp .env.example .env
   # Edit .env
   ```

### Running the Project

#### Option 1: Docker Compose (Recommended)

Starts all 5 services + API Gateway:

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

Services will be available at:
- **API Gateway:** http://localhost:4000
- **Auth Service:** http://localhost:4001 | [Docs](http://localhost:4001/docs)
- **Restaurant Service:** http://localhost:4002 | [Docs](http://localhost:4002/docs)
- **Order Service:** http://localhost:4003 | [Docs](http://localhost:4003/docs)
- **Payment Service:** http://localhost:4004 | [Docs](http://localhost:4004/docs)
- **Rider Service:** http://localhost:4005 | [Docs](http://localhost:4005/docs)

#### Option 2: Run Individual Service

```bash
cd services/auth
npm install
npm run dev
```

#### Running the Frontend

```bash
cd "Meal Stack"
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## 📚 API Documentation

Each service exposes Swagger documentation at `/docs`:

- Auth: http://localhost:4001/docs
- Restaurant: http://localhost:4002/docs
- Order: http://localhost:4003/docs
- Payment: http://localhost:4004/docs
- Rider: http://localhost:4005/docs

### Quick API Examples

#### Register a User
```bash
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePass123",
    "role": "customer"
  }'
```

#### Login
```bash
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePass123"
  }'
```

#### Create Restaurant
```bash
curl -X POST http://localhost:4002/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Pizza Palace",
    "address": "123 Main St"
  }'
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests for Specific Service
```bash
npm test --workspace=services/auth
```

### Test Coverage
```bash
npm run test:coverage
```

---

## 🚢 Deployment

The project is configured for deployment to **Azure Container Apps** using GitHub Actions.

### Prerequisites for Deployment

1. Azure account with Container Apps enabled
2. Azure Container Registry
3. GitHub repository secrets configured:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_SUBSCRIPTION_ID`
   - `ACR_NAME`
   - `SNYK_TOKEN`

### Deployment Process

Pushing to `main` branch triggers CI/CD pipeline:

1. ✅ Run tests
2. ✅ Snyk security scan
3. ✅ Build Docker images
4. ✅ Push to Azure Container Registry
5. ✅ Deploy to Azure Container Apps

### Manual Deployment

```bash
# Build Docker image
docker build -t mealstack-auth:latest ./services/auth

# Tag for ACR
docker tag mealstack-auth:latest myregistry.azurecr.io/mealstack-auth:latest

# Push to ACR
docker push myregistry.azurecr.io/mealstack-auth:latest
```

---

## 📁 Project Structure

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

---

## 🐛 Troubleshooting

### Docker Issues

#### **Problem: Docker containers fail to start**
```bash
Error: Cannot connect to MongoDB
```

**Solution:**
1. Ensure `.env` files exist in each service directory
2. Check MongoDB connection string format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```
3. Verify MongoDB Atlas allows connections from your IP
4. Check if containers are running:
   ```bash
   docker ps -a
   ```

#### **Problem: Port already in use**
```bash
Error: Port 4001 is already in use
```

**Solution:**
1. Find and kill the process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :4001
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:4001 | xargs kill -9
   ```
2. Or change the port in `.env` and `docker-compose.dev.yml`

#### **Problem: Container keeps restarting**
```bash
Container mealstack_auth is unhealthy
```

**Solution:**
1. Check container logs:
   ```bash
   docker logs mealstack_auth
   ```
2. Common causes:
   - MongoDB connection failed
   - Missing environment variables
   - Port conflicts
   - Health check endpoint failing

### Service Communication Issues

#### **Problem: Services can't communicate**
```bash
Error: connect ECONNREFUSED localhost:4001
```

**Solution:**
1. In Docker, use service names instead of `localhost`:
   - ❌ `http://localhost:4001`
   - ✅ `http://auth:4001`
   
2. Check `ORDER_SERVICE_URL` and other service URLs in `.env` files:
   ```bash
   # Inside docker-compose
   AUTH_SERVICE_URL=http://auth:4001
   
   # Running locally
   AUTH_SERVICE_URL=http://localhost:4001
   ```

3. Verify network connectivity:
   ```bash
   docker network inspect infra_default
   ```

### MongoDB Issues

#### **Problem: Authentication failed**
```bash
MongoServerError: Authentication failed
```

**Solution:**
1. Check username and password in connection string
2. URL-encode special characters in password:
   ```bash
   # If password is: P@ssw0rd!
   # Encode as: P%40ssw0rd%21
   ```
3. Verify database user exists in MongoDB Atlas
4. Ensure IP whitelist includes your IP (or use `0.0.0.0/0` for testing)

#### **Problem: Database not found**
```bash
Error: Database mealstack_auth_db not found
```

**Solution:**
MongoDB creates databases automatically on first write. This is normal. Just ensure the connection string has the correct database name.

### Authentication Issues

#### **Problem: JWT token invalid**
```bash
401 Unauthorized: Invalid token
```

**Solution:**
1. Ensure `JWT_SECRET` is the same across all services
2. Check token format in Authorization header:
   ```
   Authorization: Bearer <token>
   ```
3. Verify token hasn't expired (check `JWT_EXPIRES_IN`)

#### **Problem: CORS errors**
```bash
Access to fetch blocked by CORS policy
```

**Solution:**
1. Add frontend URL to `CORS_ORIGINS` in service `.env`:
   ```
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```
2. Restart the service after updating `.env`

### Stripe Payment Issues

#### **Problem: Stripe webhook failing**
```bash
Error: No signatures found matching the expected signature
```

**Solution:**
1. Ensure using Stripe test mode keys
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. webhook endpoint must accept raw body:
   ```javascript
   app.post('/webhook', express.raw({type: 'application/json'}), handler)
   ```
4. For local testing, use Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:4004/payments/webhook
   ```

### Rate Limiting Issues

#### **Problem: Too many requests**
```bash
429 Too Many Requests
```

**Solution:**
Rate limiting is enabled by default. Either:
1. Wait for the rate limit window to reset (check `Retry-After` header)
2. Adjust rate limit in service configuration
3. Use authentication to get higher limits

### Build/Deployment Issues

#### **Problem: Docker build fails**
```bash
Error: Cannot find module 'express'
```

**Solution:**
1. Ensure `package.json` exists in service directory
2. Rebuild without cache:
   ```bash
   docker compose -f infra/docker-compose.dev.yml build --no-cache
   ```
3. Check Dockerfile copies `package.json` correctly

#### **Problem: GitHub Actions failing**
```bash
Error: secrets.SNYK_TOKEN not found
```

**Solution:**
1. Add required secrets in GitHub repository settings
2. Verify secret names match workflow files
3. Check if Snyk token is valid

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Service not running | Start the service / check URL |
| `ENOTFOUND` | Invalid hostname | Fix service URL in `.env` |
| `MongoServerError` | MongoDB issue | Check connection string & credentials |
| `ValidationError` | Invalid input data | Check API request body format |
| `Circuit breaker is OPEN` | Service failing repeatedly | Wait 30s for circuit to close, fix underlying issue |
| `JWT malformed` | Invalid token format | Check Authorization header format |

### Getting Help

If you encounter issues not covered here:

1. **Check logs:**
   ```bash
   docker logs mealstack_auth --tail 100 -f
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:4001/health
   ```

3. **Check circuit breaker status:**
   Visit any service's `/health` endpoint to see inter-service circuit breaker states

4. **Enable debug logging:**
   Set `LOG_LEVEL=debug` in `.env` files

5. **Verify MongoDB connection:**
   ```bash
   mongosh "your-mongodb-uri-here"
   ```

---

## 📄 License

This project is for educational purposes as part of CTSE Assignment.

---

## 👥 Contributors

- Your Name - Initial work

---

## 📝 Notes

- Use test mode credentials for Stripe
- Never commit `.env` files to version control
- Each service needs its own MongoDB database
- All services must use the same `JWT_SECRET`
- Rate limiting is enabled by default (100 req/15min)
- Circuit breakers protect against cascading failures
- Health checks run every 15 seconds

---

## 🚀 Next Steps

1. ✅ **Set up MongoDB Atlas** - Create databases for each service
2. ✅ **Configure environment variables** - Update all `.env` files
3. ✅ **Run services locally** - Test with Docker Compose
4. ✅ **Test API endpoints** - Use Swagger docs at `/docs`
5. ✅ **Set up Stripe** - Get test API keys
6. ⬜ **Deploy to Azure** - Configure Container Apps
7. ⬜ **Configure CI/CD** - Add GitHub secrets
8. ⬜ **Run integration tests** - Verify service communication

Happy coding! 🎉