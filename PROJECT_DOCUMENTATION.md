# MealStack Platform - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [AWS Infrastructure](#aws-infrastructure)
4. [Backend Services](#backend-services)
5. [Frontend Application](#frontend-application)
6. [Deployment Pipeline](#deployment-pipeline)
7. [Complete Order Flow](#complete-order-flow)
8. [Features by User Role](#features-by-user-role)
9. [Testing Guide](#testing-guide)
10. [Environment Configuration](#environment-configuration)

---

## Project Overview

**MealStack** is a full-stack food delivery platform built with a microservices architecture, deployed on AWS ECS (Fargate). It connects customers, restaurant admins, and delivery riders in a real-time food ordering and delivery ecosystem.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- TanStack Query for data fetching
- ShadCN UI components
- Tailwind CSS

**Backend:**
- Node.js microservices (5 services)
- Express.js framework
- MongoDB for data persistence
- Stripe for payment processing
- JWT authentication

**Infrastructure:**
- AWS ECS (Fargate) for container orchestration
- AWS ECR for Docker image registry
- AWS Application Load Balancer for routing
- AWS Secrets Manager for credentials
- AWS CloudWatch for logging
- GitHub Actions for CI/CD

---

## Architecture

### System Architecture Diagram

```
┌─────────────┐
│   Customer  │
│   Browser   │
└──────┬──────┘
       │ HTTP
       ▼
┌──────────────────────────────────────────────────┐
│          Application Load Balancer (ALB)         │
│   mealstack-alb-1222463843.ap-south-1...         │
└──────┬───────────────────────────────────────────┘
       │
       ├─────► /auth/*        → Auth Service (4001)
       ├─────► /restaurants/* → Restaurant Service (4002)
       ├─────► /orders/*      → Order Service (4003)
       ├─────► /payments/*    → Payment Service (4004)
       └─────► /deliveries/*  → Rider Service (4005)
                │
                ▼
       ┌────────────────────┐
       │   ECS Fargate      │
       │   mealstack-cluster│
       │                    │
       │  5 Services Running│
       └────────────────────┘
                │
                ├─────► MongoDB Atlas (Data)
                ├─────► Stripe API (Payments)
                └─────► Secrets Manager (Credentials)
```

### Microservices Architecture

**1. Auth Service (Port 4001)**
- User registration and authentication
- JWT token generation
- Role-based access (customer, restaurantAdmin, rider)

**2. Restaurant Service (Port 4002)**
- Restaurant CRUD operations
- Menu item management
- Menu validation for orders (internal endpoint)

**3. Order Service (Port 4003)**
- Order creation and management
- Orchestrates payment and delivery
- Status tracking

**4. Payment Service (Port 4004)**
- Stripe integration
- Checkout session creation
- Webhook handling

**5. Rider Service (Port 4005)**
- Delivery job management
- Rider assignment (self-service)
- Status updates

---

## AWS Infrastructure

### Region: ap-south-1 (Mumbai)

All resources were consolidated to a single region for optimal performance and simplified management.

### 1. VPC & Networking

```
VPC: vpc-0181266b9af58e071 (10.0.0.0/16)
├── Subnet 1: subnet-04af0901ffd61454a (ap-south-1a) - 10.0.1.0/24
├── Subnet 2: subnet-07bbd01a659622478 (ap-south-1b) - 10.0.2.0/24
├── Internet Gateway: igw-0dbedefb2f0edff29
└── Route Table: rtb-0b4cc057795bbafd9 (routes to IGW)
```

**Why 2 subnets?** ALB requires at least 2 availability zones for high availability.

### 2. Security Groups

**ALB Security Group: sg-04bb9aed271010642**
- Ingress: Port 80 from 0.0.0.0/0 (HTTP traffic)
- Egress: All traffic

**ECS Security Group: sg-02b0f7db4a0211a1d**
- Ingress: Ports 4001-4005 from ALB SG only
- Egress: All traffic (for MongoDB, Secrets Manager, ECR)

### 3. Application Load Balancer

**ALB Details:**
- Name: mealstack-alb
- DNS: `mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com`
- ARN: `arn:aws:elasticloadbalancing:ap-south-1:945488516083:loadbalancer/app/mealstack-alb/cc9e55ede2f0e04d`
- Scheme: internet-facing
- Subnets: Both ap-south-1a and ap-south-1b

**Target Groups (5):**
```
1. auth-tg (port 4001) - arn:.../auth-tg/0a421153d72dbb96
2. restaurant-tg (port 4002) - arn:.../restaurant-tg/b543399c9f0d438e
3. order-tg (port 4003) - arn:.../order-tg/0f94205809c5b059
4. payment-tg (port 4004) - arn:.../payment-tg/7509190ed52f0f26
5. rider-tg (port 4005) - arn:.../rider-tg/65104cae01cea8ed
```

**Health Check Configuration:**
- Path: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 2

**Listener Rules (Port 80):**
```
Priority 1: /auth* → auth-tg
Priority 2: /restaurants* → restaurant-tg
Priority 3: /orders* → order-tg
Priority 4: /payments* → payment-tg
Priority 5: /deliveries* → rider-tg
Default: Fixed response 404
```

### 4. ECS Cluster

**Cluster: mealstack-cluster**
- Launch Type: Fargate
- Platform Version: LATEST
- CPU Architecture: X86_64

**Services (5):**
```
1. auth-service (desired: 1, task-def: auth:latest)
2. restaurant-service (desired: 1, task-def: restaurant:latest)
3. order-service (desired: 1, task-def: order:latest)
4. payment-service (desired: 1, task-def: payment:latest)
5. rider-service (desired: 1, task-def: rider:latest)
```

**Service Configuration:**
- Network Mode: awsvpc
- Assign Public IP: ENABLED (for ECR pulls and MongoDB access)
- Load Balancer: Integrated with respective target groups

**Task Definitions:**
- CPU: 256 (.25 vCPU)
- Memory: 512 MB
- Task Role: ecsTaskRole (for AWS service access)
- Execution Role: ecsTaskExecutionRole (for ECR and Secrets Manager)

### 5. ECR Repositories

```
1. mealstack-auth
2. mealstack-restaurant
3. mealstack-order
4. mealstack-payment
5. mealstack-rider

URI Pattern: 945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-{service}:latest
```

### 6. Secrets Manager (8 Secrets)

All secrets in ap-south-1:

```
1. mealstack/auth/JWT_SECRET
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/auth/JWT_SECRET-GbJJZI

2. mealstack/auth/MONGO_URI
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/auth/MONGO_URI-DFsk6v

3. mealstack/restaurant/MONGO_URI
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/restaurant/MONGO_URI-DaBC0M

4. mealstack/order/MONGO_URI
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/order/MONGO_URI-hyMbTP

5. mealstack/payment/MONGO_URI
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/payment/MONGO_URI-J9oWl8

6. mealstack/rider/MONGO_URI
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/rider/MONGO_URI-mBr0jr

7. mealstack/payment/STRIPE_SECRET_KEY
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/payment/STRIPE_SECRET_KEY-u0VvjD

8. mealstack/payment/STRIPE_WEBHOOK_SECRET
   ARN: arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/payment/STRIPE_WEBHOOK_SECRET-mdU8oP
```

**Why Secrets Manager?**
- Secure credential storage
- Automatic rotation support
- IAM-based access control
- No hardcoded secrets in code or task definitions

### 7. CloudWatch Logs

**Log Group:** `/ecs/mealstack-cluster`

**Log Streams (per service):**
```
auth/{taskId}
restaurant/{taskId}
order/{taskId}
payment/{taskId}
rider/{taskId}
```

**Retention:** 7 days (configurable)

### 8. IAM Roles & Policies

**ecsTaskExecutionRole (for ECS agent)**
- Managed Policies:
  - `AmazonECSTaskExecutionRolePolicy`
- Custom Inline Policy: `MealStackSecretsAccess`
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        "Resource": [
          "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/*"
        ]
      }
    ]
  }
  ```

**ecsTaskRole (for application code)**
- Currently minimal permissions
- Can be extended for S3, DynamoDB, etc.

**github-actions-mealstack (for CI/CD)**
- Trusted Entity: GitHub OIDC Provider
- Trust Policy:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::945488516083:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:Y4S2-Project-Group/MealStack_Platform:*"
          }
        }
      }
    ]
  }
  ```
- Permissions: ECR push, ECS update-service, task registration

### Migration History

**Phase 1:** Original account (013052902701, us-east-1) was suspended
**Phase 2:** Migrated to new account (945488516083, eu-north-1)
**Phase 3:** Consolidated everything to ap-south-1 (Mumbai) for single-region simplicity

---

## Backend Services

### Shared Infrastructure

**Middleware (shared/middleware/):**
- `requireAuth.js` - JWT verification
- `requireRole.js` - Role-based access control
- `errorHandler.js` - Global error handling
- `contractVersionHeader.js` - API versioning
- `requestContext.js` - Request tracing
- `rateLimiter.js` - Rate limiting
- `notFound.js` - 404 handler

**Utils (shared/utils/):**
- `apiResponse.js` - Standardized response envelopes
- `httpClient.js` - HTTP client with retry/circuit breaker
- `logger.js` - Structured logging (Winston)

### 1. Auth Service

**Endpoints:**
```
POST /auth/register - User registration
POST /auth/login - Login with JWT
GET /users/me - Get current user profile (JWT required)
```

**Data Model (MongoDB):**
```javascript
User {
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  passwordHash: String (bcrypt, 10 rounds),
  role: 'customer' | 'restaurantAdmin' | 'rider',
  createdAt: Date,
  updatedAt: Date
}
```

**Security:**
- Bcrypt password hashing
- JWT tokens with 7-day expiry
- Email uniqueness validation

### 2. Restaurant Service

**Endpoints:**
```
Public:
GET /restaurants - List all restaurants
GET /restaurants/:id - Get restaurant details
GET /restaurants/:id/menu/items - Get menu items

Protected (restaurantAdmin):
POST /restaurants - Create restaurant
POST /restaurants/:id/menu/items - Add menu item
PATCH /restaurants/:id/menu/items/:itemId - Update menu item
DELETE /restaurants/:id/menu/items/:itemId - Delete menu item

Internal (x-internal-key):
POST /restaurants/:id/menu/validate - Validate cart items
```

**Data Models:**
```javascript
Restaurant {
  _id: ObjectId,
  name: String,
  address: String,
  isOpen: Boolean,
  ownerUserId: String (indexed),
  createdAt: Date,
  updatedAt: Date
}

MenuItem {
  _id: ObjectId,
  restaurantId: String (indexed),
  name: String,
  description: String,
  price: Number,
  isAvailable: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Business Logic:**
- Owner-based access control
- Menu validation for order processing
- Text search on menu item names

### 3. Order Service

**Endpoints:**
```
Customer-facing:
POST /orders - Create order
GET /orders/my - Get user's orders
GET /orders/:id - Get order details

Restaurant-facing:
GET /orders/restaurant/:restaurantId - Get restaurant orders
PATCH /orders/:id/restaurant-status - Update order status

Internal (x-internal-key):
PATCH /orders/:id/status - Update order status
POST /orders/:id/payment/confirmed - Payment confirmation callback
POST /orders/:id/delivery/status - Delivery status update
```

**Data Model:**
```javascript
Order {
  _id: ObjectId,
  userId: String (indexed),
  restaurantId: String (indexed),
  items: [{
    menuItemId: String,
    name: String,
    unitPrice: Number,
    quantity: Number,
    lineTotal: Number
  }],
  total: Number,
  status: Enum [
    'CREATED',
    'PENDING_PAYMENT',
    'PAID',
    'ASSIGNED_TO_RIDER',
    'PICKED_UP',
    'DELIVERED'
  ],
  payment: {
    provider: 'stripe',
    checkoutSessionId: String,
    paymentStatus: 'pending' | 'paid' | 'failed'
  },
  rider: {
    riderId: String,
    assignedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Order Creation Flow:**
1. Validate items with Restaurant Service
2. Create Stripe checkout session via Payment Service
3. Store order with PENDING_PAYMENT status
4. Return checkoutUrl to frontend

**Payment Confirmation Flow:**
1. Receive webhook from Payment Service
2. Update order status to PAID
3. Create delivery job in Rider Service
4. Idempotent - handles duplicate webhooks

### 4. Payment Service

**Endpoints:**
```
Internal (x-internal-key):
POST /payments/checkout-session - Create Stripe session

Public (Stripe webhooks):
POST /payments/webhook - Handle Stripe events
```

**Stripe Integration:**
- Test Mode API keys
- Checkout Session creation
- Webhook signature verification
- Event types: `checkout.session.completed`

**Configuration:**
```javascript
{
  STRIPE_SECRET_KEY: 'sk_test_...',
  STRIPE_WEBHOOK_SECRET: 'whsec_...',
  CHECKOUT_SUCCESS_URL: 'http://localhost:8080/customer/payment/success',
  CHECKOUT_CANCEL_URL: 'http://localhost:8080/customer/payment/cancel'
}
```

### 5. Rider Service

**Endpoints:**
```
Rider-facing (JWT):
GET /deliveries/available - List available deliveries
POST /deliveries/:orderId/accept - Accept delivery
PATCH /deliveries/:orderId/status - Update delivery status

Internal (x-internal-key):
POST /deliveries - Create delivery job
```

**Data Model:**
```javascript
Delivery {
  _id: ObjectId,
  orderId: String (unique, indexed),
  restaurantId: String,
  customerId: String,
  riderId: String,
  status: Enum [
    'AVAILABLE',
    'ASSIGNED',
    'PICKED_UP',
    'DELIVERED'
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Delivery Flow:**
1. Order Service creates delivery (AVAILABLE)
2. Riders see in dashboard (auto-refresh 8s)
3. First rider to accept gets assignment (ASSIGNED)
4. Rider marks PICKED_UP, then DELIVERED
5. Each status change notifies Order Service

---

## Frontend Application

### Tech Stack
- React 18.3.1
- TypeScript 5.6.2
- Vite 5.4.19 (development server: port 8080)
- TanStack Query 5.62.3 (data fetching)
- React Router 7.1.3
- ShadCN UI + Tailwind CSS

### Project Structure
```
Meal Stack/
├── src/
│   ├── components/
│   │   ├── ui/ (ShadCN components)
│   │   ├── AppLayout.tsx
│   │   └── NavLink.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx (JWT + user state)
│   │   └── CartContext.tsx (localStorage cart)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts (HTTP client)
│   │   │   ├── types.ts (API types)
│   │   │   ├── contracts.ts (backend models)
│   │   │   └── services/ (API functions)
│   │   └── utils.ts
│   ├── pages/
│   │   ├── customer/
│   │   ├── restaurant/
│   │   └── rider/
│   └── types/
└── public/
```

### Routing

**Customer Routes:**
```
/customer - Browse restaurants
/customer/restaurant/:id - View menu
/customer/cart - Shopping cart
/customer/checkout - Place order
/customer/payment/success - After Stripe payment
/customer/payment/cancel - Payment cancelled
/customer/tracking?orderId=... - Live order tracking
/customer/profile - Order history
```

**Restaurant Routes:**
```
/restaurant - Dashboard
/restaurant/menu - Menu management
/restaurant/orders - Live order queue
/restaurant/profile - Restaurant profile
```

**Rider Routes:**
```
/rider - Available deliveries
/rider/active - Active delivery
/rider/history - Delivery history
/rider/earnings - Earnings summary
```

### State Management

**AuthContext:**
- Stores JWT token in localStorage
- Bootstraps user on app mount
- Provides login/logout functions
- Role-based navigation guards

**CartContext:**
- Stores cart in localStorage (`mealstack-cart`)
- Restaurant-level isolation (clears when switching restaurants)
- Calculates subtotal, delivery fee, total
- Provides add/remove/update/clear functions

### API Client

**HTTP Client (lib/api/client.ts):**
- Fetch-based with timeout (10s default)
- Automatic JWT injection from AuthContext
- Request tracing with x-trace-id
- Error handling with typed responses
- Response envelope parsing

**API Response Envelope:**
```typescript
{
  success: boolean,
  message: string,
  data: T,
  meta: {
    timestamp: string,
    traceId: string
  }
}
```

### Key Features

**Customer Features:**
- Restaurant browsing with search
- Menu viewing with images (Picsum placeholders)
- Shopping cart with persistence
- Stripe checkout integration
- Real-time order tracking (polls every 5s)
- Order history

**Restaurant Features:**
- Restaurant creation
- Menu CRUD operations
- Live order queue (auto-refresh 10s)
- Status badges and order details
- Active/completed order grouping

**Rider Features:**
- Available delivery list (auto-refresh 8s)
- One-click accept
- Step-by-step delivery tracking
- Delivery history (localStorage)
- Earnings summary (15% commission)

---

## Deployment Pipeline

### GitHub Actions CI/CD

**5 Workflows (one per service):**
```
.github/workflows/
├── auth-deploy.yml
├── restaurant-deploy.yml
├── order-deploy.yml
├── payment-deploy.yml
└── rider-deploy.yml
```

**Trigger Conditions:**
1. Push to main branch
2. Changes in service directory: `services/{service}/**`
3. Changes in workflow file

**Workflow Steps:**

1. **Checkout Code**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Configure AWS Credentials**
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
       aws-region: ap-south-1
   ```
   Uses OIDC for secure, keyless authentication

3. **Login to ECR**
   ```yaml
   - uses: aws-actions/amazon-ecr-login@v2
   ```

4. **Build Docker Image**
   ```yaml
   - run: |
       docker build -t mealstack-auth:${{ github.sha }} ./services/auth
       docker tag mealstack-auth:${{ github.sha }} \
         945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-auth:latest
   ```

5. **Snyk Security Scan**
   ```yaml
   - uses: snyk/actions/docker@master
     with:
       image: mealstack-auth:${{ github.sha }}
       args: --severity-threshold=high
   ```

6. **Push to ECR**
   ```yaml
   - run: docker push 945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-auth:latest
   ```

7. **Register Task Definition**
   ```yaml
   - run: |
       aws ecs register-task-definition \
         --cli-input-json file://infra/aws/task-definitions/auth-task-definition.json \
         --region ap-south-1
   ```

8. **Update ECS Service**
   ```yaml
   - run: |
       aws ecs update-service \
         --cluster mealstack-cluster \
         --service auth-service \
         --force-new-deployment \
         --region ap-south-1
   ```

**GitHub Secrets Required:**
- `AWS_ROLE_TO_ASSUME`: IAM role ARN for OIDC
- `SNYK_TOKEN`: Snyk API token for security scanning

### Deployment Process

**Manual Trigger:**
```powershell
# Update all service trigger files
foreach ($svc in @("auth","restaurant","order","payment","rider")) {
  Set-Content -Path "services/$svc/.deploy-trigger" -Value (Get-Date -Format o)
}
git add -A
git commit -m "ci: trigger all service deployments"
git push origin main
```

**What Happens:**
1. GitHub Actions detect changes in `services/*/`
2. All 5 workflows run in parallel
3. Each builds, scans, pushes Docker image
4. Updates task definition and ECS service
5. ECS performs rolling update (blue-green)
6. Health checks validate new tasks
7. Old tasks are terminated

**Rollback:**
```bash
# Revert task definition to previous revision
aws ecs update-service \
  --cluster mealstack-cluster \
  --service auth-service \
  --task-definition auth:5 \
  --force-new-deployment
```

---

## Complete Order Flow

### End-to-End Journey

**Step 1: Customer Registration**
```
POST /auth/register
Body: { name, email, password, role: "customer" }
Response: { token, user }
```
Frontend stores token in localStorage via AuthContext.

**Step 2: Browse Restaurants**
```
GET /restaurants
Response: { restaurants: [...] }
```
Customer sees restaurant cards with images and ratings.

**Step 3: View Menu**
```
GET /restaurants/:id
GET /restaurants/:id/menu/items
Response: { restaurant: {...}, items: [...] }
```
Customer clicks restaurant → sees menu items.

**Step 4: Add to Cart**
```
// No API call - localStorage only
CartContext.addItem({ menuItemId, name, price, quantity })
```
Cart persists across page reloads, isolated per restaurant.

**Step 5: Checkout**
```
POST /orders
Body: {
  restaurantId: "...",
  items: [{ menuItemId: "...", quantity: 2 }, ...]
}

Order Service Flow:
1. Validates items with Restaurant Service:
   POST /restaurants/:id/menu/validate (internal key)
   Response: { valid: true, items: [...], total: 25.50 }

2. Creates Stripe checkout session via Payment Service:
   POST /payments/checkout-session (internal key)
   Body: { orderId, amount: 2550, currency: "usd" }
   Response: { checkoutSessionId, checkoutUrl }

3. Saves order (status: PENDING_PAYMENT)

4. Returns to frontend:
   Response: {
     orderId: "...",
     status: "PENDING_PAYMENT",
     total: 25.50,
     checkoutUrl: "https://checkout.stripe.com/..."
   }
```

Frontend redirects: `window.location.href = checkoutUrl`

**Step 6: Stripe Payment**
```
Customer enters card on Stripe → completes payment
Stripe fires webhook → POST /payments/webhook
```

**Step 7: Payment Webhook Processing**
```
Payment Service receives webhook:
1. Verifies signature with STRIPE_WEBHOOK_SECRET
2. Extracts orderId from metadata
3. Calls Order Service:
   POST /orders/:id/payment/confirmed (internal key)
   Body: { checkoutSessionId }

Order Service:
1. Updates order status → PAID
2. Updates payment.paymentStatus → "paid"
3. Creates delivery job:
   POST /deliveries (internal key to Rider Service)
   Body: { orderId, restaurantId, customerId }

Rider Service:
1. Creates Delivery document (status: AVAILABLE)
2. Returns deliveryId

Stripe redirects customer to:
http://localhost:8080/customer/payment/success?session_id=...
```

**Step 8: Customer Tracking**
```
PaymentSuccessPage → navigates to:
/customer/tracking?orderId=...

Component polls every 5 seconds:
GET /orders/:id
Response: {
  _id, userId, restaurantId, items, total,
  status: "PAID",
  createdAt, updatedAt
}
```

**Step 9: Restaurant Sees Order**
```
Restaurant dashboard auto-refreshes every 10 seconds:
GET /orders/restaurant/:restaurantId

Sees order with status: PAID
UI shows: "A rider will be auto-assigned from the available pool. Start preparing!"
```

**Step 10: Rider Accepts Delivery**
```
Rider dashboard auto-refreshes every 8 seconds:
GET /deliveries/available
Response: { deliveries: [{ _id, orderId, restaurantId, customerId, status: "AVAILABLE" }] }

Rider clicks "Accept":
POST /deliveries/:orderId/accept
Body: (empty)

Rider Service:
1. Updates delivery.riderId = req.user.userId
2. Updates delivery.status = "ASSIGNED"
3. Notifies Order Service:
   POST /orders/:id/delivery/status (internal key)
   Body: { status: "ASSIGNED_TO_RIDER", riderId }

Order Service:
1. Updates order.status = "ASSIGNED_TO_RIDER"
2. Updates order.rider = { riderId, assignedAt: Date.now() }

Response: { delivery: {...} }
Frontend navigates to /rider/active
```

**Step 11: Rider Picks Up**
```
Rider clicks "Mark as Picked Up":
PATCH /deliveries/:orderId/status
Body: { status: "PICKED_UP" }

Rider Service:
1. Validates riderId matches delivery.riderId
2. Updates delivery.status = "PICKED_UP"
3. Notifies Order Service:
   POST /orders/:id/delivery/status (internal key)
   Body: { status: "PICKED_UP", riderId }

Order Service:
Updates order.status = "PICKED_UP"
```

**Step 12: Rider Delivers**
```
Rider clicks "Mark as Delivered":
PATCH /deliveries/:orderId/status
Body: { status: "DELIVERED" }

Rider Service:
1. Updates delivery.status = "DELIVERED"
2. Notifies Order Service:
   POST /orders/:id/delivery/status (internal key)
   Body: { status: "DELIVERED", riderId }

Order Service:
Updates order.status = "DELIVERED"
```

**Step 13: Customer Sees Final Status**
```
Customer tracking page still polling:
GET /orders/:id
Response: { ..., status: "DELIVERED" }

UI shows green checkmark: "Delivered!"
```

### Inter-Service Communication Security

All internal service-to-service calls use the `x-internal-key` header:

```javascript
// Order Service calling Restaurant Service
const { data } = await restaurantHttp.post(
  `/restaurants/${restaurantId}/menu/validate`,
  { items },
  { headers: { 'x-internal-key': env.internalApiKey } }
);

// Restaurant Service protecting endpoint
function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (!key || key !== env.internalApiKey) {
    return sendError(res, req, {
      status: 401,
      code: 'UNAUTHORIZED_INTERNAL_KEY',
      message: 'Missing or invalid internal API key',
    });
  }
  next();
}
```

**Protected Internal Endpoints:**
- `POST /restaurants/:id/menu/validate`
- `POST /payments/checkout-session`
- `PATCH /orders/:id/status`
- `POST /orders/:id/payment/confirmed`
- `POST /orders/:id/delivery/status`
- `POST /deliveries`

**Why Not Use ALB Path Rules?**
The ALB is public-facing. Internal endpoints need an additional security layer to prevent external callers from bypassing business logic. The internal API key acts as a shared secret between services.

---

## Features by User Role

### Customer Features

**1. Account Management**
- Registration with email/password
- Login with JWT authentication
- Profile viewing

**2. Restaurant Discovery**
- Browse all restaurants
- Search functionality (coming soon)
- Category filtering (UI only)
- Restaurant ratings (hardcoded 4.6 for now)

**3. Menu Browsing**
- View restaurant menu with images
- See item descriptions and prices
- Availability indicators

**4. Shopping Cart**
- Add items to cart
- Update quantities
- Remove items
- Subtotal + delivery fee calculation
- Persistent across page reloads
- Auto-clears when switching restaurants

**5. Checkout & Payment**
- Delivery address input (not persisted yet)
- Stripe payment integration
- Secure redirect to Stripe Checkout
- Payment success/cancel pages
- Automatic cart clearing after order

**6. Order Tracking**
- Real-time status updates (polls every 5s)
- Visual progress stepper
- Status labels:
  - PENDING_PAYMENT → "Awaiting Payment"
  - PAID → "Preparing"
  - ASSIGNED_TO_RIDER → "Rider Assigned"
  - PICKED_UP → "On the Way"
  - DELIVERED → "Delivered"

**7. Order History**
- View all past orders
- Order details with items
- Status badges
- Total amounts

### Restaurant Admin Features

**1. Restaurant Management**
- Create restaurant profile
- Set address and operating hours
- Owner-based access control

**2. Menu Management**
- Create menu items (name, description, price)
- Update item details
- Toggle item availability
- Quick price editing
- Delete items
- Real-time sync

**3. Order Queue**
- Live order display (auto-refresh 10s)
- Order items and totals
- Status badges with icons
- Active/completed grouping
- Timestamp display
- Auto-assignment notifications
  ("A rider will be auto-assigned...")

**4. Dashboard**
- Menu statistics
- Total items count
- Available items counter

### Rider Features

**1. Delivery Dashboard**
- Available deliveries list (auto-refresh 8s)
- Delivery count display
- Order details (restaurant, customer, amount)
- One-click accept

**2. Active Delivery Tracking**
- Step-by-step progress
- Order details
- Pickup/delivery buttons
- Restaurant and customer info

**3. Delivery History**
- Past deliveries (localStorage)
- Completion timestamps
- Earnings per delivery

**4. Earnings Summary**
- Today/week/month totals
- 15% commission calculation
- Weekly bar chart
- Delivery count statistics

**Note:** Earnings are currently stored in browser localStorage. Backend earnings tracking would require a dedicated earnings service or extending the Rider/Order models.

---

## Testing Guide

### Local Development Setup

**1. Clone Repository**
```bash
git clone https://github.com/Y4S2-Project-Group/MealStack_Platform.git
cd MealStack_Platform
```

**2. Install Dependencies**
```bash
# Backend services (each service)
cd services/auth && npm install
cd services/restaurant && npm install
cd services/order && npm install
cd services/payment && npm install
cd services/rider && npm install

# Frontend
cd "Meal Stack" && npm install
```

**3. Environment Variables**

Create `.env` files in each service directory:

**services/auth/.env:**
```env
NODE_ENV=development
PORT=4001
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-at-least-16-chars
LOG_LEVEL=info
```

**services/restaurant/.env:**
```env
NODE_ENV=development
PORT=4002
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-at-least-16-chars
INTERNAL_API_KEY=dev-internal-key-change-me
LOG_LEVEL=info
```

**services/order/.env:**
```env
NODE_ENV=development
PORT=4003
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-at-least-16-chars
INTERNAL_API_KEY=dev-internal-key-change-me
AUTH_SERVICE_URL=http://localhost:4001
RESTAURANT_SERVICE_URL=http://localhost:4002
PAYMENT_SERVICE_URL=http://localhost:4004
RIDER_SERVICE_URL=http://localhost:4005
LOG_LEVEL=info
```

**services/payment/.env:**
```env
NODE_ENV=development
PORT=4004
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-at-least-16-chars
INTERNAL_API_KEY=dev-internal-key-change-me
ORDER_SERVICE_URL=http://localhost:4003
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CHECKOUT_SUCCESS_URL=http://localhost:8080/customer/payment/success
CHECKOUT_CANCEL_URL=http://localhost:8080/customer/payment/cancel
LOG_LEVEL=info
```

**services/rider/.env:**
```env
NODE_ENV=development
PORT=4005
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-at-least-16-chars
INTERNAL_API_KEY=dev-internal-key-change-me
ORDER_SERVICE_URL=http://localhost:4003
LOG_LEVEL=info
```

**Meal Stack/.env.local:**
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_API_TIMEOUT_MS=10000
```

**Note:** For local development with a single ALB-like entrypoint, use an nginx reverse proxy or run services on separate ports and configure CORS.

**4. Run Services**

**Option A: Individual Terminals**
```bash
# Terminal 1
cd services/auth && npm run dev

# Terminal 2
cd services/restaurant && npm run dev

# Terminal 3
cd services/order && npm run dev

# Terminal 4
cd services/payment && npm run dev

# Terminal 5
cd services/rider && npm run dev

# Terminal 6
cd "Meal Stack" && npm run dev
```

**Option B: Docker Compose (if configured)**
```bash
docker-compose -f infra/docker-compose.dev.yml up
```

**5. Access Application**
- Frontend: http://localhost:8080
- Auth API: http://localhost:4001
- Restaurant API: http://localhost:4002
- Order API: http://localhost:4003
- Payment API: http://localhost:4004
- Rider API: http://localhost:4005

### Test Scenarios

**Scenario 1: Customer Order Flow**

1. Register as customer:
   - Navigate to http://localhost:8080
   - Click "Register"
   - Fill form with role: Customer
   - Submit

2. Browse restaurants:
   - Should see restaurant list
   - Click on a restaurant

3. Add to cart:
   - Select menu items
   - Adjust quantities
   - Click "Add to Cart"

4. Checkout:
   - Navigate to cart
   - Click "Proceed to Checkout"
   - Fill delivery address
   - Click "Place Order"

5. Payment:
   - Redirects to Stripe
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Complete payment

6. Track order:
   - Redirected to success page
   - Click "Track My Order"
   - See status updates

**Scenario 2: Restaurant Admin Flow**

1. Register as restaurant admin:
   - Role: Restaurant Admin

2. Create restaurant:
   - Navigate to /restaurant/profile
   - Fill restaurant details
   - Submit

3. Add menu items:
   - Navigate to /restaurant/menu
   - Click "Add Item"
   - Fill details
   - Submit

4. View orders:
   - Navigate to /restaurant/orders
   - See incoming orders
   - Watch status updates

**Scenario 3: Rider Flow**

1. Register as rider:
   - Role: Rider

2. View available deliveries:
   - Navigate to /rider
   - See delivery list (auto-refreshes)

3. Accept delivery:
   - Click "Accept" on a delivery
   - Redirected to active delivery

4. Complete delivery:
   - Click "Mark as Picked Up"
   - Click "Mark as Delivered"

5. View earnings:
   - Navigate to /rider/earnings
   - See earnings breakdown

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Expired: 4000 0000 0000 0069
Processing Error: 4000 0000 0000 0119

For all cards:
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits
```

### API Testing with cURL

**Register User:**
```bash
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "customer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Restaurants:**
```bash
curl http://localhost:4002/restaurants
```

**Create Order (with JWT):**
```bash
curl -X POST http://localhost:4003/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "restaurantId": "RESTAURANT_ID",
    "items": [
      { "menuItemId": "ITEM_ID", "quantity": 2 }
    ]
  }'
```

### Monitoring Production

**ECS Service Status:**
```bash
aws ecs describe-services \
  --cluster mealstack-cluster \
  --services auth-service restaurant-service order-service payment-service rider-service \
  --region ap-south-1 \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount}' \
  --output table
```

**CloudWatch Logs:**
```bash
# View recent logs
aws logs tail /ecs/mealstack-cluster --follow --region ap-south-1

# Filter by service
aws logs tail /ecs/mealstack-cluster --follow --region ap-south-1 --filter-pattern "auth"
```

**Health Check:**
```bash
# Test each service
curl http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/auth/health
curl http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/restaurants
curl http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders
```

---

## Environment Configuration

### Production Task Definition Variables

All 5 services share these common environment variables:

```json
{
  "PORT": "400X",
  "NODE_ENV": "production",
  "CORS_ORIGINS": "*",
  "AUTH_SERVICE_URL": "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com"
}
```

**Service-specific variables:**

**Order Service:**
```json
{
  "RESTAURANT_SERVICE_URL": "http://mealstack-alb-...",
  "PAYMENT_SERVICE_URL": "http://mealstack-alb-...",
  "RIDER_SERVICE_URL": "http://mealstack-alb-...",
  "INTERNAL_API_KEY": "prod-internal-key-change-me-later",
  "LOG_LEVEL": "info"
}
```

**Payment Service:**
```json
{
  "ORDER_SERVICE_URL": "http://mealstack-alb-...",
  "INTERNAL_API_KEY": "prod-internal-key-change-me-later",
  "CHECKOUT_SUCCESS_URL": "http://localhost:8080/customer/payment/success",
  "CHECKOUT_CANCEL_URL": "http://localhost:8080/customer/payment/cancel"
}
```

**Rider Service:**
```json
{
  "ORDER_SERVICE_URL": "http://mealstack-alb-...",
  "INTERNAL_API_KEY": "prod-internal-key-change-me-later"
}
```

**Restaurant Service:**
```json
{
  "INTERNAL_API_KEY": "prod-internal-key-change-me-later"
}
```

### Secret Management

All secrets are stored in AWS Secrets Manager and injected as environment variables:

```json
"secrets": [
  {
    "name": "MONGO_URI",
    "valueFrom": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/{service}/MONGO_URI-XXXXXX"
  },
  {
    "name": "JWT_SECRET",
    "valueFrom": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/auth/JWT_SECRET-XXXXXX"
  }
]
```

**Payment Service Additional Secrets:**
```json
{
  "name": "STRIPE_SECRET_KEY",
  "valueFrom": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/payment/STRIPE_SECRET_KEY-XXXXXX"
},
{
  "name": "STRIPE_WEBHOOK_SECRET",
  "valueFrom": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/payment/STRIPE_WEBHOOK_SECRET-XXXXXX"
}
```

### Frontend Environment

**Production (.env.local):**
```env
VITE_API_BASE_URL=http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com
VITE_API_TIMEOUT_MS=10000
```

**Development:**
```env
VITE_API_BASE_URL=http://localhost:4000
```

---

## Known Issues & Future Improvements

### Current Limitations

**1. Earnings Tracking**
- Stored in browser localStorage only
- No backend persistence
- No payout system

**Future:** Create earnings service with database, track per delivery, implement payout workflows.

**2. Image Uploads**
- Using Picsum placeholder images
- No actual image upload

**Future:** Integrate AWS S3 for image storage, add upload endpoints.

**3. Delivery Address**
- Not persisted after checkout
- No address book

**Future:** Add address management to customer profile, save to database.

**4. Reviews & Ratings**
- Hardcoded 4.6 rating
- No review system

**Future:** Add review service, rating calculations, review moderation.

**5. Real-time Notifications**
- Polling for updates (not true real-time)
- No push notifications

**Future:** Implement WebSocket or Server-Sent Events, add mobile push notifications.

**6. Stripe Checkout URLs**
- Currently localhost:8080
- Won't work in production without domain

**Fix:** Update `CHECKOUT_SUCCESS_URL` and `CHECKOUT_CANCEL_URL` to production domain after deploying frontend.

**7. Restaurant Update Endpoint**
- Not implemented in backend
- Frontend shows "Update endpoint not exposed"

**Future:** Add `PATCH /restaurants/:id` endpoint.

**8. Promo Codes**
- UI only, no backend validation

**Future:** Add promo code service, validation logic, discount calculations.

### Security Improvements

1. **Rotate INTERNAL_API_KEY**: Use AWS Secrets Manager, implement rotation policy
2. **Rate Limiting**: Configure per-endpoint limits based on traffic analysis
3. **Input Validation**: Add more granular validation schemas
4. **SQL Injection**: Already prevented (using MongoDB with parameterized queries)
5. **XSS Prevention**: Add CSP headers, sanitize user inputs
6. **CORS**: Restrict to specific origins instead of `*`

### Performance Optimizations

1. **Database Indexing**: Add compound indexes for frequent queries
2. **Caching**: Implement Redis for restaurant/menu caching
3. **Connection Pooling**: Configure MongoDB connection pooling
4. **Image CDN**: Use CloudFront for Picsum/S3 images
5. **Lazy Loading**: Implement pagination for order history
6. **Code Splitting**: Lazy load routes in React

### Scalability Considerations

**Current Setup (Low Traffic):**
- 1 task per service
- 0.25 vCPU, 512 MB RAM
- Handles ~100 concurrent users

**Scaling Strategy:**
1. **Horizontal Scaling**: Increase desired task count
2. **Auto-scaling**: Configure ECS Service Auto Scaling based on CPU/memory
3. **Load Balancer**: Already configured for multiple targets
4. **Database**: Use MongoDB Atlas cluster with auto-scaling

**For High Traffic (1000+ concurrent users):**
```
- Increase task count: 3-5 per service
- Upgrade task size: 0.5 vCPU, 1024 MB
- Enable ECS Service Auto Scaling (target 70% CPU)
- Configure CloudFront for static assets
- Implement Redis caching layer
- Database read replicas
```

---

## Cost Breakdown (Estimated Monthly - AWS Mumbai Region)

**ECS Fargate:**
- 5 services × 1 task × 0.25 vCPU × 512 MB
- ~$30/month (assuming 24/7 uptime)

**Application Load Balancer:**
- Fixed cost: $16.20/month
- LCU charges: ~$5/month (low traffic)
- Total: ~$21/month

**ECR Storage:**
- 5 images × ~200 MB each
- Total: ~$0.10/month

**CloudWatch Logs:**
- ~5 GB/month
- Total: ~$2.50/month

**Secrets Manager:**
- 8 secrets × $0.40
- Total: ~$3.20/month

**Data Transfer:**
- Outbound: ~10 GB/month
- Total: ~$1/month

**Total Estimated: ~$58/month**

**Not included:**
- MongoDB Atlas (separate billing)
- Stripe fees (2.9% + $0.30 per transaction)
- Domain registration & SSL certificate
- Route 53 (if used)

**Free Tier Eligible (First 12 Months):**
- 750 hours ECS compute
- 15 GB data transfer
- Some CloudWatch logs

---

## Maintenance & Operations

### Daily Operations

**1. Monitor Service Health**
```bash
# Quick health check
for service in auth restaurant order payment rider; do
  curl -s http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/${service}/health | jq
done
```

**2. Check ECS Task Status**
```bash
aws ecs list-tasks --cluster mealstack-cluster --region ap-south-1
```

**3. Review Logs**
```bash
aws logs tail /ecs/mealstack-cluster --follow --region ap-south-1 --since 1h
```

### Weekly Maintenance

**1. Security Updates**
- Review Dependabot alerts
- Update npm packages: `npm audit fix`
- Rebuild and redeploy images

**2. Database Maintenance**
- Review MongoDB Atlas metrics
- Check slow queries
- Optimize indexes if needed

**3. Cost Review**
- Check AWS Cost Explorer
- Review CloudWatch metrics
- Adjust task counts if needed

### Emergency Procedures

**Service Down:**
```bash
# Check task status
aws ecs describe-services --cluster mealstack-cluster --services auth-service --region ap-south-1

# View logs
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "ERROR"

# Force new deployment
aws ecs update-service --cluster mealstack-cluster --service auth-service --force-new-deployment --region ap-south-1
```

**Database Connection Issues:**
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-02b0f7db4a0211a1d --region ap-south-1

# Verify secrets
aws secretsmanager get-secret-value --secret-id mealstack/auth/MONGO_URI --region ap-south-1
```

**Rollback Deployment:**
```bash
# List task definition revisions
aws ecs list-task-definitions --family-prefix auth --region ap-south-1

# Rollback to previous revision
aws ecs update-service --cluster mealstack-cluster --service auth-service --task-definition auth:5 --region ap-south-1
```

---

## Contact & Support

**Repository:** https://github.com/Y4S2-Project-Group/MealStack_Platform
**AWS Account ID:** 945488516083
**Region:** ap-south-1 (Mumbai)

**Key Endpoints:**
- ALB: `http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com`
- Frontend (local): `http://localhost:8080`

**Documentation Last Updated:** April 23, 2026

---

*This documentation covers the complete MealStack platform including AWS infrastructure, microservices architecture, deployment pipelines, and operational procedures. For questions or contributions, please refer to the GitHub repository.*
