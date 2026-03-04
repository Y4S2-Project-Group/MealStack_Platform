# 📘 MealStack_Platform – Project Specification

## 1️⃣ Project Overview

MealStack_Platform is a cloud-native, microservice-based Food Ordering System built using the MERN stack (Express.js backend) and deployed on Microsoft Azure using containerized microservices.

The system consists of **five independently deployable microservices**, communicating via REST APIs.

Deployment target: **Azure Container Apps**
Container Registry: **Azure Container Registry (ACR)**
Database: **MongoDB Atlas (DB-per-service approach)**
CI/CD: **GitHub Actions**
DevSecOps: **Snyk (SAST integrated in pipeline)**

---

# 2️⃣ Architecture Overview

## Microservices (5 Total)

1. **Auth Service**
2. **Restaurant Service**
3. **Order Service**
4. **Payment Service (Stripe Integration)**
5. **Rider Service**

Each service:

* Is an independent Express.js application
* Has its own MongoDB database (Atlas)
* Has its own Dockerfile
* Has its own CI/CD workflow
* Is deployed as a separate Azure Container App
* Exposes Swagger documentation
* Has a `/health` endpoint

---

# 3️⃣ Technology Stack

* **Backend:** Node.js + Express.js
* **Database:** MongoDB Atlas (separate database per service)
* **Authentication:** JWT-based authentication
* **Payments:** Stripe Checkout + Webhook verification
* **Containerization:** Docker
* **Cloud Deployment:** Azure Container Apps
* **Container Registry:** Azure Container Registry
* **CI/CD:** GitHub Actions
* **DevSecOps:** Snyk SAST scanning
* **API Documentation:** Swagger (OpenAPI 3)

---

# 4️⃣ Repository Structure (Monorepo)

Repository Name:

```
MealStack_Platform
```

Structure:

```
MealStack_Platform/
  services/
    auth/
    restaurant/
    order/
    payment/
    rider/
  shared/
    middleware/
    utils/
    types/
  infra/
    docker-compose.dev.yml
  .github/workflows/
    auth.yml
    restaurant.yml
    order.yml
    payment.yml
    rider.yml
  PROJECT_SPEC.md
  README.md
```

Each service must contain:

```
src/
  controllers/
  routes/
  models/
  middleware/
  services/
  config/
app.js
server.js
Dockerfile
package.json
.env.example
swagger.js
```

---

# 5️⃣ Database Strategy

Use MongoDB Atlas.

Each microservice has its own database:

* `mealstack_auth_db`
* `mealstack_restaurant_db`
* `mealstack_order_db`
* `mealstack_payment_db`
* `mealstack_rider_db`

No service directly accesses another service’s database.

All communication must happen through REST APIs.

---

# 6️⃣ Authentication & Authorization

JWT-based authentication.

Roles:

* `customer`
* `restaurantAdmin`
* `rider`

JWT must:

* Be signed using a secret stored in environment variables
* Be validated in protected routes
* Never be hardcoded

Protected endpoints must use role-based access control middleware.

---

# 7️⃣ Microservice Specifications

---

## 7.1 Auth Service

### Responsibilities

* User registration
* Login
* JWT issuance
* Role management

### Core Endpoints

* `POST /auth/register`
* `POST /auth/login`
* `GET /users/me`
* `GET /health`

### Data Model

User:

* name
* email
* password (hashed with bcrypt)
* role
* createdAt

---

## 7.2 Restaurant Service

### Responsibilities

* Manage restaurants
* Manage menu items

### Core Endpoints

* `POST /restaurants`
* `GET /restaurants`
* `GET /restaurants/:id`
* `POST /restaurants/:id/menu`
* `GET /restaurants/:id/menu`
* `GET /health`

### Integration

Order Service calls:

```
GET /restaurants/:id/menu
```

to validate items and calculate total.

---

## 7.3 Order Service (System Orchestrator)

### Responsibilities

* Create orders
* Track order status
* Coordinate payment
* Coordinate rider assignment

### Order Status Flow

* CREATED
* PENDING_PAYMENT
* PAID
* ASSIGNED_TO_RIDER
* PICKED_UP
* DELIVERED

### Core Endpoints

* `POST /orders`
* `GET /orders/:id`
* `GET /orders/my`
* `PATCH /orders/:id/status`
* `GET /health`

### Integrations

1. Order → Restaurant
   Validate items + calculate total

2. Order → Payment
   Create Stripe Checkout session

3. Payment → Order (Webhook Callback)
   Update status to PAID

4. Order → Rider
   Create delivery job after payment

5. Rider → Order
   Update delivery status

Order Service must never directly access other service databases.

---

## 7.4 Payment Service (Stripe Integration)

### Responsibilities

* Create Stripe Checkout sessions
* Verify Stripe webhooks
* Notify Order Service on payment success

### Stripe Requirements

* Use Stripe Checkout (test mode)
* Do NOT store card data
* Verify webhook signature using Stripe secret
* Raw body parsing required for webhook verification

### Core Endpoints

* `POST /payments/checkout-session`
* `POST /payments/webhook`
* `GET /health`

### Environment Variables

* STRIPE_SECRET_KEY
* STRIPE_WEBHOOK_SECRET
* ORDER_SERVICE_URL

---

## 7.5 Rider Service

### Responsibilities

* Manage delivery jobs
* Allow riders to accept orders
* Update delivery status

### Core Endpoints

* `GET /deliveries/available`
* `POST /deliveries/:orderId/accept`
* `PATCH /deliveries/:orderId/status`
* `GET /health`

### Integration

* Receives job creation from Order Service
* Sends delivery status updates to Order Service

---

# 8️⃣ Inter-Service Communication Rules

* Communication via REST using axios/fetch
* Service URLs provided via environment variables
* Implement retry logic (basic)
* Handle errors gracefully
* Never share database access

---

# 9️⃣ Security Requirements

## Application-Level

* JWT authentication
* Role-based authorization
* Input validation (Joi or Zod)
* Centralized error handler
* No stack traces in production
* CORS restricted in production

## Stripe Security

* Verify webhook signature
* Use HTTPS endpoints only
* Secrets stored securely

## Azure-Level

* Secrets stored in Container App secrets
* No hardcoded credentials
* Least privilege IAM
* Only required services publicly exposed

---

# 🔟 CI/CD Requirements

Each service has its own GitHub Actions workflow.

Pipeline steps:

1. Install dependencies
2. Run tests
3. Run Snyk scan
4. Build Docker image
5. Push to Azure Container Registry
6. Deploy to Azure Container App

Snyk must:

* Fail pipeline on critical vulnerabilities
* Use SNYK_TOKEN stored in GitHub Secrets

---

# 11️⃣ Dev Environment

Provide `docker-compose.dev.yml` to run all services locally.

Each service runs on different port:

* Auth: 4001
* Restaurant: 4002
* Order: 4003
* Payment: 4004
* Rider: 4005

---

# 12️⃣ Required Non-Functional Features

Each service must include:

* `/health` endpoint
* Swagger docs at `/docs`
* `.env.example`
* Dockerfile
* Basic logging
* Basic unit tests

---

# 13️⃣ Deployment Architecture (Azure)

* Azure Container Apps (one per service)
* Azure Container Registry
* MongoDB Atlas
* Stripe Webhook → Payment Service public endpoint
* Optional: Azure API Management as gateway

---

# 14️⃣ Core Design Principles

* DB-per-service
* Stateless services
* Environment-based configuration
* Clear separation of concerns
* Minimal but clean architecture
* Focus on depth, not unnecessary complexity

---

