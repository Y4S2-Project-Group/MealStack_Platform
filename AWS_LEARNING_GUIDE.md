# AWS Learning Guide for MealStack Platform

## Table of Contents
1. [Introduction to AWS](#introduction-to-aws)
2. [AWS Regions & Availability Zones](#aws-regions--availability-zones)
3. [VPC - Virtual Private Cloud](#vpc---virtual-private-cloud)
4. [Security Groups](#security-groups)
5. [Application Load Balancer (ALB)](#application-load-balancer-alb)
6. [ECS - Elastic Container Service](#ecs---elastic-container-service)
7. [ECR - Elastic Container Registry](#ecr---elastic-container-registry)
8. [Secrets Manager](#secrets-manager)
9. [CloudWatch Logs](#cloudwatch-logs)
10. [IAM - Identity and Access Management](#iam---identity-and-access-management)
11. [How Everything Works Together](#how-everything-works-together)
12. [Common AWS Terms Explained](#common-aws-terms-explained)

---

## Introduction to AWS

**AWS (Amazon Web Services)** is a cloud computing platform that provides on-demand computing resources. Instead of buying and maintaining your own servers, you rent computing power, storage, and networking from AWS.

### Key Benefits:
- **Pay-as-you-go:** Only pay for what you use
- **Scalability:** Easily scale up or down based on demand
- **Global reach:** Deploy applications worldwide
- **Managed services:** AWS handles infrastructure maintenance
- **High availability:** Built-in redundancy and failover

### Why We Chose AWS for MealStack:
1. **Fargate (serverless containers):** No server management needed
2. **Load balancing:** Distribute traffic across services
3. **Security:** Encrypted credentials, network isolation
4. **Monitoring:** Built-in logging and metrics
5. **CI/CD integration:** Works seamlessly with GitHub Actions

---

## AWS Regions & Availability Zones

### What is a Region?

A **Region** is a physical location around the world where AWS has data centers. Each region is completely independent.

**Examples:**
- `us-east-1` - US East (N. Virginia)
- `eu-west-1` - Europe (Ireland)
- `ap-south-1` - Asia Pacific (Mumbai) ← **We use this!**

**Why ap-south-1?**
- Closest to India/South Asia
- Lower latency for users
- Data sovereignty (data stays in India)

### What is an Availability Zone (AZ)?

An **Availability Zone** is one or more data centers within a Region. Each AZ is isolated but connected with high-speed networking.

**In ap-south-1 (Mumbai):**
- `ap-south-1a` ← We use this
- `ap-south-1b` ← We use this
- `ap-south-1c`

**Why Use Multiple AZs?**
```
If one data center has a power failure:
AZ-1a: ❌ Down
AZ-1b: ✅ Still running
Your app: ✅ Still works!
```

**In Our Project:**
```
Subnet 1: ap-south-1a (10.0.1.0/24)
Subnet 2: ap-south-1b (10.0.2.0/24)
```
This provides high availability - if one AZ fails, the other keeps running.

---

## VPC - Virtual Private Cloud

### What is a VPC?

Think of a **VPC** as your own private network in the cloud. It's like having your own isolated section of the internet where only your resources can communicate.

**Real-world analogy:**
```
VPC = Your office building
Subnets = Different floors in the building
Security Groups = Security guards at each door
Internet Gateway = The main entrance/exit
```

### Our VPC Configuration

```
VPC: vpc-0181266b9af58e071
CIDR Block: 10.0.0.0/16
```

**What does 10.0.0.0/16 mean?**
- This is an IP address range
- `/16` means the first 16 bits are fixed (10.0)
- Gives us 65,536 possible IP addresses (10.0.0.0 to 10.0.255.255)
- Plenty of space for all our services!

### Subnets

A **subnet** is a smaller section of your VPC. We create subnets in different AZs for high availability.

```
Subnet 1: subnet-04af0901ffd61454a
├─ CIDR: 10.0.1.0/24 (256 addresses)
├─ Location: ap-south-1a
└─ Type: Public (has internet access)

Subnet 2: subnet-07bbd01a659622478
├─ CIDR: 10.0.2.0/24 (256 addresses)
├─ Location: ap-south-1b
└─ Type: Public (has internet access)
```

**Why two subnets?**
1. **High availability:** Services in both AZs
2. **Load balancer requirement:** ALB needs at least 2 AZs
3. **Redundancy:** If one fails, traffic goes to the other

### Internet Gateway (IGW)

The **Internet Gateway** connects your VPC to the internet.

```
Internet Gateway: igw-0dbedefb2f0edff29
```

**Think of it as:**
```
Your VPC (Private Network)
        ↓
Internet Gateway (The door to the internet)
        ↓
Public Internet
```

Without an IGW, your services can't reach the internet (can't pull Docker images, can't access external APIs).

### Route Table

A **Route Table** tells traffic where to go.

```
Route Table: rtb-0b4cc057795bbafd9

Rules:
1. 10.0.0.0/16 → local (traffic within VPC stays inside)
2. 0.0.0.0/0 → igw-xxx (everything else goes to internet)
```

**Example:**
```
Service wants to reach 10.0.1.50 → Route: Local (stays in VPC)
Service wants to reach google.com → Route: IGW (goes to internet)
```

---

## Security Groups

### What is a Security Group?

A **Security Group** is a virtual firewall that controls incoming and outgoing traffic. Think of it as a bouncer at a club - decides who gets in and who doesn't.

### Rules Structure

**Inbound Rules (Ingress):** Who can connect TO your service
**Outbound Rules (Egress):** Where your service can connect TO

### Our Security Groups

#### 1. ALB Security Group (sg-04bb9aed271010642)

```
Purpose: Protect the Load Balancer
Inbound:
  - Port 80 from 0.0.0.0/0 (anyone can access HTTP)
Outbound:
  - All traffic (can connect to anything)
```

**Why allow 0.0.0.0/0 on port 80?**
This is our public-facing load balancer. Customers need to access it from anywhere in the world.

#### 2. ECS Security Group (sg-02b0f7db4a0211a1d)

```
Purpose: Protect our microservices
Inbound:
  - Port 4001 from ALB SG only
  - Port 4002 from ALB SG only
  - Port 4003 from ALB SG only
  - Port 4004 from ALB SG only
  - Port 4005 from ALB SG only
Outbound:
  - All traffic (can connect to MongoDB, AWS services, etc.)
```

**Why only from ALB SG?**
Our services should ONLY be accessible through the load balancer, not directly from the internet. This is a security best practice.

**Visual Flow:**
```
Customer (Internet)
    ↓ Port 80
ALB (sg-04bb9aed271010642) ✅ Allowed
    ↓ Port 4001-4005
ECS Tasks (sg-02b0f7db4a0211a1d) ✅ Allowed (from ALB only)
    ↓ Port 443
MongoDB Atlas ✅ Allowed (outbound)
```

### Security Group vs NACL

| Security Group | Network ACL (NACL) |
|---------------|-------------------|
| Works at instance level | Works at subnet level |
| Stateful (return traffic auto-allowed) | Stateless (must explicitly allow return) |
| Only ALLOW rules | ALLOW and DENY rules |
| We use this ✅ | We don't use this |

---

## Application Load Balancer (ALB)

### What is a Load Balancer?

Imagine a restaurant with one entrance but multiple chefs. The **load balancer** is like a host who distributes customers evenly to available chefs so no one chef is overworked.

### Types of AWS Load Balancers

1. **Application Load Balancer (ALB)** ← We use this!
   - Works at HTTP/HTTPS level (Layer 7)
   - Can route based on URL paths
   - Best for web applications

2. **Network Load Balancer (NLB)**
   - Works at TCP/UDP level (Layer 4)
   - Ultra high performance
   - For non-HTTP traffic

3. **Classic Load Balancer**
   - Old generation
   - Don't use for new projects

### Our ALB Configuration

```
Name: mealstack-alb
DNS: mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com
Scheme: internet-facing (public)
Subnets: ap-south-1a, ap-south-1b
```

**Why "internet-facing"?**
Customers from the internet need to access our API. If we chose "internal", only resources within our VPC could access it.

### Target Groups

A **Target Group** is a collection of targets (ECS tasks, EC2 instances) that receive traffic from the load balancer.

```
We have 5 target groups:

1. auth-tg → Port 4001
2. restaurant-tg → Port 4002
3. order-tg → Port 4003
4. payment-tg → Port 4004
5. rider-tg → Port 4005
```

**How Target Groups Work:**
```
Customer makes request → ALB → Target Group → One of the healthy tasks
                                     ↓
                            [Task 1] [Task 2] [Task 3]
                               ✅      ✅       ❌ unhealthy
```

### Health Checks

The ALB constantly checks if targets are healthy by making HTTP requests.

```
Health Check Configuration:
Path: /health
Interval: 30 seconds
Timeout: 5 seconds
Healthy threshold: 2 (must pass 2 checks to be "healthy")
Unhealthy threshold: 2 (must fail 2 checks to be "unhealthy")
Success codes: 200
```

**Example Health Check:**
```
Every 30 seconds:
ALB → GET http://task-ip:4001/health
Service responds: {"status": "ok"}
ALB: ✅ Healthy, send traffic here
```

If service doesn't respond or returns error:
```
ALB → GET http://task-ip:4001/health
Service: (no response)
ALB: ❌ Unhealthy, stop sending traffic
```

### Listener Rules (Path-Based Routing)

The **Listener** on port 80 has rules that route traffic based on URL paths:

```
Priority 1: /auth* → auth-tg
Priority 2: /restaurants* → restaurant-tg
Priority 3: /orders* → order-tg
Priority 4: /payments* → payment-tg
Priority 5: /deliveries* → rider-tg
Default: Return 404
```

**Example Routing:**
```
Request: GET http://alb-dns/auth/login
Match: /auth* → Route to auth-tg → Auth Service (port 4001)

Request: GET http://alb-dns/restaurants
Match: /restaurants* → Route to restaurant-tg → Restaurant Service (port 4002)

Request: GET http://alb-dns/unknown
No match → Default rule → Return 404 Not Found
```

**Why Path-Based Routing?**
Instead of having 5 different URLs for 5 services, we have ONE entry point with different paths. This is called an **API Gateway pattern**.

```
❌ Without ALB:
auth.example.com
restaurant.example.com
order.example.com
payment.example.com
rider.example.com

✅ With ALB:
example.com/auth/*
example.com/restaurants/*
example.com/orders/*
example.com/payments/*
example.com/deliveries/*
```

### Sticky Sessions

**Sticky sessions** (session affinity) ensure the same client always goes to the same target. We DON'T use this because:
- Our services are stateless (use JWT tokens)
- We use MongoDB for shared state
- Any task can handle any request

---

## ECS - Elastic Container Service

### What is ECS?

**ECS** is AWS's service for running Docker containers. It's like having a fleet manager for your Docker containers.

### Container vs Virtual Machine

```
Virtual Machine:
┌─────────────────────┐
│   Your Application  │
│   Operating System  │  ← Full OS (heavy)
│   Virtual Hardware  │
└─────────────────────┘

Container:
┌─────────────────────┐
│   Your Application  │
│   Libraries Only    │  ← Shares host OS (lightweight)
└─────────────────────┘
```

**Benefits:**
- Faster startup (seconds vs minutes)
- Use fewer resources
- Easy to deploy and scale

### ECS Components

#### 1. Cluster

A **Cluster** is a logical grouping of services and tasks.

```
mealstack-cluster
├─ auth-service
├─ restaurant-service
├─ order-service
├─ payment-service
└─ rider-service
```

Think of it as a fleet of ships, where the cluster is the fleet.

#### 2. Task Definition

A **Task Definition** is like a blueprint for your container. It specifies:
- Which Docker image to use
- How much CPU/memory
- Environment variables
- Port mappings
- Secrets to inject

**Example: auth-task-definition.json**
```json
{
  "family": "auth",
  "cpu": "256",              // 0.25 vCPU
  "memory": "512",           // 512 MB RAM
  "containerDefinitions": [{
    "name": "auth",
    "image": "945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-auth:latest",
    "portMappings": [{
      "containerPort": 4001,  // Service listens on 4001
      "protocol": "tcp"
    }],
    "environment": [          // Regular env vars
      {"name": "PORT", "value": "4001"},
      {"name": "NODE_ENV", "value": "production"}
    ],
    "secrets": [              // Sensitive values from Secrets Manager
      {
        "name": "JWT_SECRET",
        "valueFrom": "arn:aws:secretsmanager:..."
      }
    ]
  }]
}
```

**Revision System:**
Every time you update a task definition, it creates a new revision:
```
auth:1 → Initial version
auth:2 → Added LOG_LEVEL variable
auth:3 → Updated Docker image
auth:4 → Current version
```

You can rollback by deploying an older revision.

#### 3. Service

A **Service** maintains a desired number of running tasks and integrates with the load balancer.

```
Service: auth-service
├─ Cluster: mealstack-cluster
├─ Task Definition: auth:4
├─ Desired Count: 1 (how many tasks to run)
├─ Launch Type: FARGATE
├─ Network: awsvpc mode
├─ Subnets: subnet-04af..., subnet-07bb...
├─ Security Group: sg-02b0f7db4a0211a1d
└─ Load Balancer: auth-tg (port 4001)
```

**What the Service Does:**
1. Ensures 1 task is always running
2. If a task crashes, starts a new one automatically
3. During deployments, does rolling updates
4. Registers healthy tasks with the load balancer
5. Deregisters unhealthy tasks

#### 4. Task

A **Task** is a running instance of a Task Definition. It's the actual container running your application.

```
Task: task/mealstack-cluster/abc123
├─ Status: RUNNING
├─ Health: HEALTHY
├─ IP: 10.0.1.45
├─ Started: 2026-04-23 10:30:00
└─ CPU/Memory: 0.25 vCPU, 512 MB
```

### Fargate vs EC2 Launch Type

| Fargate (We use this) | EC2 |
|-----------------------|-----|
| Serverless (no servers to manage) | You manage EC2 instances |
| Pay per task | Pay for EC2 instances |
| AWS handles infrastructure | You handle patching, scaling |
| Best for: Getting started, small-medium apps | Best for: Large scale, cost optimization |

**Why We Chose Fargate:**
- No server management
- Automatic scaling
- Only pay for what we use
- Focus on application, not infrastructure

### awsvpc Network Mode

With **awsvpc** mode, each task gets its own:
- Private IP address
- Elastic Network Interface (ENI)
- Security group

```
Traditional Bridge Mode:
Host (10.0.1.10)
├─ Container 1 (mapped port 32001 → 4001)
├─ Container 2 (mapped port 32002 → 4001)
└─ Port conflicts possible

awsvpc Mode:
Container 1 (10.0.1.45:4001) ← Own IP
Container 2 (10.0.1.46:4001) ← Own IP
No port conflicts! ✅
```

### Service Discovery

Each task registers with the load balancer target group. The ALB keeps track of all healthy tasks:

```
auth-tg (Target Group)
├─ Task 1: 10.0.1.45:4001 ✅ healthy
├─ Task 2: 10.0.2.33:4001 ✅ healthy
└─ Task 3: 10.0.1.89:4001 ❌ unhealthy (draining)
```

Requests are distributed across healthy tasks only.

### Rolling Deployments

When you deploy a new version, ECS does a **rolling update**:

```
Step 1: Current State
[Task v1] [Task v1] [Task v1] ← All running old version

Step 2: Start New Task
[Task v1] [Task v1] [Task v1] [Task v2] ← New version starting

Step 3: Health Check
[Task v1] [Task v1] [Task v1] [Task v2 ✅] ← Health check passes

Step 4: Stop Old Task
[Task v1] [Task v1] [Task v2 ✅] ← One old task stopped

Step 5: Repeat
[Task v2 ✅] [Task v2 ✅] [Task v2 ✅] ← All tasks updated!
```

**Zero downtime!** Old tasks keep running until new ones are healthy.

---

## ECR - Elastic Container Registry

### What is ECR?

**ECR** is AWS's private Docker image registry. It's like Docker Hub, but private and integrated with AWS.

### Why Not Use Docker Hub?

| Docker Hub | ECR |
|------------|-----|
| Public (unless paid) | Always private |
| Rate limits (100 pulls/6 hours) | No rate limits |
| Separate authentication | IAM-based auth |
| Slower from AWS | Super fast from ECS |
| Free tier limited | Pay for storage only |

### Our ECR Setup

```
5 Repositories (one per service):
1. mealstack-auth
2. mealstack-restaurant
3. mealstack-order
4. mealstack-payment
5. mealstack-rider

URI Pattern:
945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-{service}:{tag}
```

**Breaking Down the URI:**
```
945488516083                      ← AWS Account ID
dkr.ecr                          ← Docker registry service
ap-south-1                       ← Region
amazonaws.com                    ← AWS domain
/mealstack-auth                  ← Repository name
:latest                          ← Image tag
```

### Image Tags

Tags help you version your images:

```
mealstack-auth:latest              ← Always points to newest
mealstack-auth:v1.0.0              ← Specific version
mealstack-auth:6805ffb             ← Git commit hash
mealstack-auth:2026-04-23-prod     ← Date-based
```

**Best Practice:**
Always use specific tags in production, not `latest`. Why?
```
Using :latest
Task 1 pulls image → Gets version 5
Task 2 pulls image (1 hour later) → Gets version 6
Different tasks running different code! ❌

Using :v1.0.0
Task 1 pulls :v1.0.0 → Gets exact version
Task 2 pulls :v1.0.0 → Gets same exact version
Consistent! ✅
```

### Docker Build and Push Flow

**In GitHub Actions:**
```bash
# 1. Build image
docker build -t mealstack-auth:abc123 ./services/auth

# 2. Tag for ECR
docker tag mealstack-auth:abc123 \
  945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-auth:latest

# 3. Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  945488516083.dkr.ecr.ap-south-1.amazonaws.com

# 4. Push to ECR
docker push 945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-auth:latest
```

### Image Scanning

ECR can scan images for vulnerabilities:
```
Scan Results:
✅ No critical vulnerabilities
⚠️ 3 medium severity issues
ℹ️ 12 informational issues
```

We use **Snyk** in our pipeline for security scanning before pushing to ECR.

### Lifecycle Policies

You can automatically delete old images to save storage costs:
```
Policy: Keep only 5 most recent images
Result: Older images automatically deleted after 5 new pushes
```

---

## Secrets Manager

### What is Secrets Manager?

**Secrets Manager** securely stores sensitive data like passwords, API keys, and database credentials.

### Why Not Store in Environment Variables?

```
❌ Bad - Hardcoded in Task Definition:
{
  "environment": [
    {"name": "JWT_SECRET", "value": "my-secret-key-123"}
  ]
}
Problems:
- Visible in AWS console
- Stored in version control (if you commit task def)
- Can't rotate without redeployment

✅ Good - Secrets Manager:
{
  "secrets": [
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/auth/JWT_SECRET-GbJJZI"
    }
  ]
}
Benefits:
- Encrypted at rest
- Automatic rotation
- IAM-controlled access
- Audit logging
```

### Our Secrets

```
8 Secrets Total:

1. mealstack/auth/JWT_SECRET (16+ chars for token signing)
2. mealstack/auth/MONGO_URI (MongoDB connection string)
3. mealstack/restaurant/MONGO_URI
4. mealstack/order/MONGO_URI
5. mealstack/payment/MONGO_URI
6. mealstack/rider/MONGO_URI
7. mealstack/payment/STRIPE_SECRET_KEY (Stripe API key)
8. mealstack/payment/STRIPE_WEBHOOK_SECRET (Webhook verification)
```

### Secret ARN Structure

```
arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/auth/JWT_SECRET-GbJJZI
│   │   │              │         │           │                               │
│   │   │              │         │           │                               └─ Random suffix (for uniqueness)
│   │   │              │         │           └─ Secret name (hierarchical path)
│   │   │              │         └─ Account ID
│   │   │              └─ Region
│   │   └─ Service (secretsmanager)
│   └─ Partition (aws, aws-cn, aws-us-gov)
└─ Amazon Resource Name prefix
```

### How Secrets are Injected

**At Task Startup:**
```
1. ECS Agent starts task
2. Agent calls Secrets Manager API:
   "Give me secret at ARN arn:aws:secretsmanager:..."
3. Secrets Manager verifies IAM permissions
4. Returns decrypted value
5. ECS Agent sets environment variable:
   JWT_SECRET="actual-secret-value-here"
6. Container starts with secret available
```

**Important:** The secret value is NEVER stored in the task definition, only the ARN (pointer to the secret).

### Secret Rotation

Secrets Manager can automatically rotate secrets:
```
Week 1: Secret = "password-v1"
Week 2: Rotation triggered
  ├─ Create new secret "password-v2"
  ├─ Update MongoDB with new password
  ├─ Test new password works
  └─ Make "password-v2" the current version
Week 2: All new tasks get "password-v2"
```

We don't have rotation enabled yet, but it's recommended for production.

### IAM Policy for Secrets Access

Our ECS Execution Role has this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ],
    "Resource": [
      "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/*"
    ]
  }]
}
```

**What this means:**
- ECS can read (`GetSecretValue`) any secret starting with `mealstack/`
- ECS can get metadata (`DescribeSecret`) about those secrets
- ECS CANNOT create, delete, or modify secrets (security!)

---

## CloudWatch Logs

### What is CloudWatch?

**CloudWatch** is AWS's monitoring and logging service. It collects logs from your applications and provides dashboards, alarms, and insights.

### Log Groups and Streams

```
Log Group: /ecs/mealstack-cluster
├── Log Stream: auth/task/abc123 (task 1)
├── Log Stream: auth/task/def456 (task 2)
├── Log Stream: restaurant/task/ghi789
└── Log Stream: order/task/jkl012
```

**Log Group:** A container for related logs
**Log Stream:** A sequence of log events from one source (one task)

### Our Logging Configuration

**In Task Definition:**
```json
"logConfiguration": {
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/ecs/mealstack-cluster",
    "awslogs-region": "ap-south-1",
    "awslogs-stream-prefix": "auth"
  }
}
```

**Result:**
```
Task abc123 writes log: "User registered successfully"
↓
CloudWatch creates stream: /ecs/mealstack-cluster/auth/task/abc123
↓
Log appears with timestamp: [2026-04-23 10:30:45.123] User registered successfully
```

### Viewing Logs

**AWS Console:**
```
CloudWatch → Logs → Log Groups → /ecs/mealstack-cluster
→ Select stream → View logs
```

**AWS CLI:**
```bash
# Tail logs in real-time
aws logs tail /ecs/mealstack-cluster --follow

# Filter for errors
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "ERROR"

# Specific service
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "auth"

# Last 1 hour
aws logs tail /ecs/mealstack-cluster --since 1h
```

### Log Insights

**CloudWatch Logs Insights** lets you query logs using SQL-like syntax:

```sql
# Find all errors in last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20

# Count requests per service
fields @message
| filter @message like /request/
| stats count() by service
```

### Log Retention

We can set how long to keep logs:
```
Options:
- 1 day (cheap, minimal history)
- 7 days (our choice - balance cost/history)
- 30 days (more expensive)
- Never expire (most expensive)
```

**Why 7 days?**
- Enough for debugging recent issues
- Cost-effective (~$2.50/month)
- Serious issues are usually caught within a week

### Structured Logging

Our services use Winston for structured logs:
```javascript
// Instead of:
console.log("User logged in");

// We do:
logger.info("User logged in", {
  userId: "abc123",
  email: "user@example.com",
  timestamp: new Date(),
  traceId: "xyz789"
});
```

**CloudWatch receives:**
```json
{
  "level": "info",
  "message": "User logged in",
  "userId": "abc123",
  "email": "user@example.com",
  "timestamp": "2026-04-23T10:30:45.123Z",
  "traceId": "xyz789"
}
```

Now we can easily search for all logs from one user or one request!

---

## IAM - Identity and Access Management

### What is IAM?

**IAM** controls who (or what) can access your AWS resources. It's the security system of AWS.

### Core Concepts

#### 1. Users

A **User** is a person or application that needs access to AWS.

```
Example Users:
- john.doe@example.com (Developer)
- ci-cd-bot (GitHub Actions)
- admin@example.com (System Admin)
```

#### 2. Groups

A **Group** is a collection of users with similar permissions.

```
Example Groups:
- Developers: Can deploy, view logs
- Admins: Can do everything
- Viewers: Can only view resources
```

#### 3. Roles

A **Role** is like a temporary identity that can be assumed by AWS services or users.

**Key Difference:**
```
User: Long-term credentials (access key)
Role: Temporary credentials (assume for short time)
```

**We use Roles for:**
- ECS tasks (ecsTaskRole, ecsTaskExecutionRole)
- GitHub Actions (github-actions-mealstack)

#### 4. Policies

A **Policy** is a JSON document that defines permissions.

**Example Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

**Translation:** "Allow reading objects from my-bucket"

### Our IAM Roles

#### 1. ecsTaskExecutionRole

**Purpose:** Used by the ECS agent to set up tasks

**What it can do:**
- Pull images from ECR
- Fetch secrets from Secrets Manager
- Write logs to CloudWatch

**Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:945488516083:secret:mealstack/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-south-1:945488516083:log-group:/ecs/mealstack-cluster:*"
    }
  ]
}
```

#### 2. ecsTaskRole

**Purpose:** Used by your application code running inside the container

**Currently:** Minimal permissions (can extend later for S3, SES, etc.)

**When would you extend it?**
```
If auth service needs to send emails:
→ Add SES (Simple Email Service) permissions

If order service needs to store invoices:
→ Add S3 permissions for specific bucket
```

#### 3. github-actions-mealstack

**Purpose:** Allows GitHub Actions to deploy to AWS

**Trust Policy (Who can assume this role):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
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
  }]
}
```

**Translation:** "GitHub Actions from the MealStack_Platform repo can assume this role"

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    }
  ]
}
```

**Translation:** "Can push to ECR and update ECS services"

### OIDC Authentication (OpenID Connect)

**Traditional Way (Bad):**
```
Create AWS IAM user → Generate access keys
→ Store in GitHub Secrets
→ Keys never expire → Security risk!
```

**OIDC Way (Good):**
```
GitHub Actions requests token from GitHub
→ Sends token to AWS
→ AWS verifies token with GitHub
→ AWS gives temporary credentials (15 min - 1 hour)
→ Credentials expire automatically ✅
```

**Benefits:**
- No long-term credentials to manage
- Automatic rotation
- Can't be stolen (expires quickly)
- Audit trail in AWS CloudTrail

### Principle of Least Privilege

Always give the minimum permissions needed:

```
❌ Bad:
Give ECS task "AdministratorAccess" policy
Result: Task can delete your entire AWS account!

✅ Good:
Give ECS task only "secretsmanager:GetSecretValue" for specific secrets
Result: Task can only read its secrets, nothing else
```

---

## How Everything Works Together

### Request Flow: Customer Places Order

Let's trace one complete request through all AWS components:

```
Step 1: Customer Request
━━━━━━━━━━━━━━━━━━━━━━
Customer browser → POST http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders
Body: { restaurantId: "...", items: [...] }
Headers: Authorization: Bearer <JWT>

Step 2: Internet Gateway
━━━━━━━━━━━━━━━━━━━━━━━━
Request reaches AWS edge → Routes to ap-south-1 region
→ Hits Internet Gateway (igw-0dbedefb2f0edff29)
→ Routes to VPC (vpc-0181266b9af58e071)

Step 3: Application Load Balancer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Request reaches ALB (mealstack-alb)
→ ALB Security Group checks: "Port 80 from internet? ✅ Allowed"
→ Listener (port 80) matches path: "/orders*"
→ Routes to: order-tg (Target Group)

Step 4: Target Group Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
order-tg has 1 healthy target:
  - IP: 10.0.1.45:4003 ✅
ALB picks this target

Step 5: ECS Security Group
━━━━━━━━━━━━━━━━━━━━━━━━━
Request reaches 10.0.1.45:4003
→ ECS Security Group checks: "Port 4003 from ALB SG? ✅ Allowed"
→ Forwards to ECS Task

Step 6: Order Service Container
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Container receives request at port 4003
→ Express.js routes to POST /orders
→ Middleware checks JWT (from environment variable JWT_SECRET)
→ JWT valid ✅

Step 7: Inter-Service Communication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Service needs to validate items:
→ Calls: POST http://mealstack-alb.../restaurants/:id/menu/validate
→ Request leaves ECS Security Group (outbound allowed)
→ Goes back through ALB (internal routing)
→ ALB routes to restaurant-tg
→ Restaurant Service validates items
→ Returns: { valid: true, items: [...], total: 25.50 }

Step 8: Secrets Manager Access
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Service needs to connect to MongoDB:
→ Uses MONGO_URI from environment (already injected at startup)
→ Connects to MongoDB Atlas
→ Creates order document

Step 9: CloudWatch Logging
━━━━━━━━━━━━━━━━━━━━━━━━
Order Service logs:
logger.info("Order created", { orderId: "abc123", userId: "user1" })
→ Stdout/stderr captured by ECS
→ Sent to CloudWatch via awslogs driver
→ Appears in: /ecs/mealstack-cluster/order/task/xyz789

Step 10: Response Path
━━━━━━━━━━━━━━━━━━━━━
Order Service returns:
{ success: true, data: { orderId: "abc123", checkoutUrl: "..." } }
→ Response travels back through:
  ECS Task → Target Group → ALB → Internet Gateway → Customer
```

### Deployment Flow

When you push code to GitHub:

```
Step 1: GitHub Actions Triggered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Push to main branch → .github/workflows/order-deploy.yml runs

Step 2: OIDC Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━
GitHub Actions:
→ Requests OIDC token from GitHub
→ Sends token to AWS STS (Security Token Service)
→ AWS verifies token with GitHub OIDC provider
→ AWS returns temporary credentials (access key, secret key, session token)

Step 3: ECR Login
━━━━━━━━━━━━━━━━━
GitHub Actions:
→ Uses temporary credentials
→ Calls: aws ecr get-login-password
→ Logs into ECR registry

Step 4: Docker Build
━━━━━━━━━━━━━━━━━━
GitHub Actions:
→ docker build -t mealstack-order:abc123 ./services/order
→ Image built with all dependencies

Step 5: Security Scan
━━━━━━━━━━━━━━━━━━━
Snyk scans image for vulnerabilities
→ If high/critical issues found: ❌ Fail deployment
→ If passed: ✅ Continue

Step 6: Push to ECR
━━━━━━━━━━━━━━━━━━
GitHub Actions:
→ docker tag mealstack-order:abc123 945488516083.dkr.ecr.ap-south-1.amazonaws.com/mealstack-order:latest
→ docker push to ECR
→ Image layers uploaded and stored in S3 (behind the scenes)

Step 7: Register Task Definition
━━━━━━━━━━━━━━━━━━━━━━━━━━━
GitHub Actions:
→ aws ecs register-task-definition --cli-input-json file://order-task-definition.json
→ ECS creates order:5 (new revision)

Step 8: Update Service
━━━━━━━━━━━━━━━━━━━━
GitHub Actions:
→ aws ecs update-service --service order-service --force-new-deployment
→ ECS begins rolling update

Step 9: ECS Rolling Update
━━━━━━━━━━━━━━━━━━━━━━
ECS:
→ Starts new task with order:5
→ Task pulls image from ECR
→ ECS Execution Role fetches secrets from Secrets Manager
→ Task starts, health check begins
→ After 2 successful health checks: ✅ Task is healthy
→ Registers new task with ALB target group
→ Waits for connections to drain from old task
→ Stops old task
→ Deployment complete!

Step 10: CloudWatch Logs
━━━━━━━━━━━━━━━━━━━━━━
New task logs appear in:
/ecs/mealstack-cluster/order/task/new-id
```

### Monitoring and Debugging Flow

```
Issue: "Order service is slow"

Step 1: Check ALB Metrics
━━━━━━━━━━━━━━━━━━━━━━
CloudWatch Metrics → ALB → order-tg
→ Target Response Time: 5 seconds (normally 200ms)
→ Healthy Host Count: 1 (normally 1)
Conclusion: Service is running but slow

Step 2: Check ECS Service
━━━━━━━━━━━━━━━━━━━━━━━
ECS Console → mealstack-cluster → order-service
→ Running Count: 1/1 ✅
→ No recent deployments
→ CPU: 90% 🚨 (high!)
Conclusion: CPU bound, need to scale

Step 3: Check CloudWatch Logs
━━━━━━━━━━━━━━━━━━━━━━━━━━
aws logs tail /ecs/mealstack-cluster --filter-pattern "ERROR"
→ Sees: "MongoDB connection timeout"
Conclusion: MongoDB is slow or unreachable

Step 4: Check Security Groups
━━━━━━━━━━━━━━━━━━━━━━━━━
ECS SG (sg-02b0f7db4a0211a1d)
→ Outbound: All traffic ✅
→ Can reach MongoDB
Conclusion: Not a network issue

Step 5: Check Secrets
━━━━━━━━━━━━━━━━━━━
Task Definition → Secrets
→ MONGO_URI: arn:aws:secretsmanager:...
→ Secret ARN correct ✅
Conclusion: Credentials are correct

Step 6: Solution
━━━━━━━━━━━━━━
Problem: MongoDB Atlas free tier throttling
Solution: Upgrade MongoDB Atlas plan OR add connection pooling
```

---

## Common AWS Terms Explained

### ARN (Amazon Resource Name)

A unique identifier for AWS resources.

```
Format:
arn:partition:service:region:account-id:resource-type/resource-id

Example:
arn:aws:ecs:ap-south-1:945488516083:service/mealstack-cluster/auth-service
│   │   │   │          │               │                          │
│   │   │   │          │               │                          └─ Resource ID
│   │   │   │          │               └─ Resource Type
│   │   │   │          └─ Account ID (your AWS account)
│   │   │   └─ Region
│   │   └─ Service (ECS, S3, RDS, etc.)
│   └─ Partition (aws, aws-cn, aws-us-gov)
└─ Prefix
```

### Tags

Key-value pairs for organizing resources.

```
Example:
Name: mealstack-alb
Environment: production
Project: MealStack
CostCenter: engineering
```

**Uses:**
- Cost tracking (how much does production cost?)
- Automation (backup all resources tagged "production")
- Access control (developers can only touch "dev" tagged resources)

### CIDR Block

**CIDR (Classless Inter-Domain Routing)** is a way to specify IP address ranges.

```
10.0.0.0/16
│       │
│       └─ Subnet mask (how many bits are fixed)
└─ IP address

/16 means:
- First 16 bits are fixed: 10.0
- Last 16 bits are variable: 0.0 to 255.255
- Total IPs: 2^(32-16) = 65,536 addresses
- Range: 10.0.0.0 to 10.0.255.255

/24 means:
- First 24 bits are fixed: 10.0.1
- Last 8 bits are variable: 0 to 255
- Total IPs: 2^(32-24) = 256 addresses
- Range: 10.0.1.0 to 10.0.1.255
```

**Common CIDR blocks:**
```
/8  = 16,777,216 IPs (huge)
/16 = 65,536 IPs (VPC)
/24 = 256 IPs (subnet)
/32 = 1 IP (specific host)
```

### DNS (Domain Name System)

Translates human-readable names to IP addresses.

```
Without DNS:
Customer → http://12.34.56.78/orders

With DNS:
Customer → http://api.mealstack.com/orders
           ↓ DNS lookup
           → 12.34.56.78
```

**Our ALB DNS:**
```
mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com
│                         │         │
│                         │         └─ Domain
│                         └─ Region
└─ Load balancer name + unique ID
```

### Stateful vs Stateless

**Stateful:** Remembers previous interactions
```
Example: Traditional server sessions
Client 1 → Server stores session in memory
Client 1 returns → Server remembers client 1
Problem: Can only go to same server
```

**Stateless:** Each request is independent
```
Example: JWT tokens (what we use)
Client 1 → Server validates JWT, processes, forgets
Client 1 returns → Server validates JWT again (no memory)
Benefit: Can go to any server ✅
```

### High Availability vs Fault Tolerance

**High Availability:** Minimize downtime
```
Multiple servers running
If one fails → Switch to backup
Small downtime window (seconds)
```

**Fault Tolerance:** Zero downtime
```
Redundant systems running simultaneously
If one fails → Already running on backup
Zero downtime
More expensive
```

**Our setup:** High availability (multiple AZs, ALB distributes traffic)

---

## Best Practices We Followed

### 1. Network Isolation ✅
```
✅ Services in private subnets (well, public for now but with SG protection)
✅ Only ALB is internet-facing
✅ Services can't be directly accessed from internet
```

### 2. Secrets Management ✅
```
✅ All secrets in Secrets Manager
✅ No hardcoded credentials
✅ IAM-based access control
```

### 3. Least Privilege IAM ✅
```
✅ Each role has minimum permissions needed
✅ No AdministratorAccess given unnecessarily
✅ OIDC for GitHub Actions (no long-term keys)
```

### 4. Logging & Monitoring ✅
```
✅ All services log to CloudWatch
✅ Structured logging (JSON)
✅ Health checks configured
✅ Can trace requests with trace IDs
```

### 5. High Availability ✅
```
✅ Multiple availability zones
✅ Load balancer distributes traffic
✅ Auto-restarts failed tasks
✅ Rolling deployments (zero downtime)
```

### 6. Security Groups ✅
```
✅ Minimal inbound rules
✅ Port-specific access
✅ Source-based restrictions (ALB SG → ECS SG)
```

### 7. Infrastructure as Code ✅
```
✅ Task definitions in JSON
✅ GitHub Actions for deployments
✅ Version controlled configuration
✅ Reproducible infrastructure
```

---

## Learning Resources

### AWS Official

1. **AWS Free Tier:** https://aws.amazon.com/free/
   - Try services for free
   - 750 hours ECS (Fargate) free for 12 months

2. **AWS Documentation:**
   - ECS: https://docs.aws.amazon.com/ecs/
   - ECR: https://docs.aws.amazon.com/ecr/
   - ALB: https://docs.aws.amazon.com/elasticloadbalancing/

3. **AWS Skill Builder:** https://aws.amazon.com/training/
   - Free online courses
   - Hands-on labs

### Video Courses

1. **freeCodeCamp AWS Course** (YouTube)
   - 10+ hour comprehensive course
   - Free

2. **AWS This Week** (YouTube channel)
   - Weekly updates
   - Service deep-dives

### Hands-on Practice

1. **Create a simple app:**
   ```
   Simple Node.js API → Dockerfile → ECR → ECS Fargate
   ```

2. **Add load balancer:**
   ```
   Create ALB → Target group → Route traffic
   ```

3. **Add monitoring:**
   ```
   CloudWatch Logs → Metrics → Alarms
   ```

### Commands to Practice

```bash
# List all ECS clusters
aws ecs list-clusters --region ap-south-1

# Describe services in cluster
aws ecs describe-services \
  --cluster mealstack-cluster \
  --services auth-service \
  --region ap-south-1

# View CloudWatch logs
aws logs tail /ecs/mealstack-cluster --follow

# List ECR images
aws ecr list-images \
  --repository-name mealstack-auth \
  --region ap-south-1

# Get secret value
aws secretsmanager get-secret-value \
  --secret-id mealstack/auth/JWT_SECRET \
  --region ap-south-1

# Force new deployment
aws ecs update-service \
  --cluster mealstack-cluster \
  --service auth-service \
  --force-new-deployment \
  --region ap-south-1
```

---

## Exercises to Solidify Learning

### Exercise 1: Add Health Check Endpoint
**Task:** Ensure all services have `/health` endpoints that return:
```json
{
  "status": "ok",
  "service": "auth",
  "timestamp": "2026-04-23T10:30:00Z"
}
```

**Learning:** How ECS health checks work

### Exercise 2: Add New Environment Variable
**Task:** Add `LOG_LEVEL=debug` to payment service
1. Update task definition
2. Register new revision
3. Update ECS service
4. Verify logs show debug level

**Learning:** Task definition updates, ECS deployments

### Exercise 3: Create CloudWatch Alarm
**Task:** Create alarm for high CPU usage
1. Go to CloudWatch → Alarms
2. Create alarm for ECS CPU > 80%
3. Send notification to email

**Learning:** CloudWatch metrics and alarms

### Exercise 4: Implement Secret Rotation
**Task:** Update JWT_SECRET in Secrets Manager
1. Create new secret value
2. Update secret
3. Force ECS service redeployment
4. Verify new secret is used

**Learning:** Secrets Manager, ECS service updates

### Exercise 5: Scale Service
**Task:** Run 3 instances of auth service
1. Update desired count to 3
2. Watch tasks start
3. Check ALB target group (should have 3 targets)
4. Test load distribution

**Learning:** ECS scaling, load balancing

---

## Troubleshooting Guide

### Task Won't Start

**Symptoms:**
```
Task state: PENDING → PROVISIONING → STOPPED
```

**Possible Causes & Solutions:**

1. **Can't pull image from ECR**
   ```
   Check: IAM permissions on ecsTaskExecutionRole
   Fix: Add ECR read permissions
   ```

2. **Can't fetch secrets**
   ```
   Check: Secrets Manager ARN correct?
   Check: IAM permissions on ecsTaskExecutionRole
   Fix: Update policy to allow secretsmanager:GetSecretValue
   ```

3. **Not enough resources**
   ```
   Check: CPU/Memory settings in task definition
   Fix: Reduce or increase based on availability
   ```

### Health Check Failing

**Symptoms:**
```
Target health: unhealthy
ALB not sending traffic
```

**Possible Causes:**

1. **/health endpoint returns error**
   ```
   Check CloudWatch logs for errors
   Fix application code
   ```

2. **Security group blocking traffic**
   ```
   Check: ECS SG allows traffic from ALB SG on service port
   Fix: Update inbound rules
   ```

3. **Service takes too long to start**
   ```
   Check: Health check interval vs startup time
   Fix: Increase health check grace period
   ```

### Can't Access Service

**Symptoms:**
```
Request times out or 502 Bad Gateway
```

**Troubleshooting Steps:**

1. **Check ALB target group health**
   ```
   EC2 Console → Target Groups → Select group
   Are targets healthy?
   ```

2. **Check security groups**
   ```
   ALB SG allows inbound on port 80?
   ECS SG allows inbound from ALB SG?
   ```

3. **Check service status**
   ```
   ECS Console → Cluster → Service
   Running count = Desired count?
   ```

4. **Check logs**
   ```
   CloudWatch Logs → /ecs/mealstack-cluster
   Any errors?
   ```

---

## Cost Optimization Tips

### 1. Use Fargate Spot
```
Current: Fargate on-demand (~$30/month)
Fargate Spot: 70% cheaper (~$9/month)
Caveat: Can be interrupted (ok for dev/test)
```

### 2. Right-Size Tasks
```
Current: 0.25 vCPU, 512 MB per task
If usage is low: Try 0.25 vCPU, 256 MB
Savings: ~$15/month
```

### 3. Delete Old ECR Images
```
Set lifecycle policy: Keep only 5 most recent
Saves: ~$0.50/month (small but adds up)
```

### 4. Reduce Log Retention
```
Current: 7 days
For dev: 1 day
Savings: ~$1.75/month
```

### 5. Use Reserved Capacity
```
For production with stable load:
Reserve 1 year: 30% discount
Reserve 3 years: 50% discount
```

### 6. Stop Services When Not Needed
```
For dev environment:
Stop services at night (cron job)
Savings: ~50% (only run 12 hours/day)
```

---

## Next Steps in Your AWS Journey

### Immediate (This Month)
- [ ] Practice AWS CLI commands daily
- [ ] Review CloudWatch logs regularly
- [ ] Understand one IAM policy deeply
- [ ] Create CloudWatch dashboard for your services

### Short-term (Next 3 Months)
- [ ] Learn AWS CloudFormation (Infrastructure as Code)
- [ ] Study RDS (Relational Database Service)
- [ ] Understand S3 (Object Storage)
- [ ] Practice security best practices

### Long-term (Next Year)
- [ ] AWS Solutions Architect certification
- [ ] Build multi-region architecture
- [ ] Implement disaster recovery
- [ ] Master serverless (Lambda, API Gateway)

---

**Congratulations!** You now understand all the AWS components used in MealStack Platform. This knowledge is transferable to any cloud application you build in the future.

**Remember:** The best way to learn is by doing. Don't be afraid to experiment (in a dev environment)!

---

*This guide was created specifically for the MealStack Platform. All examples use real resources from your project.*

**Last Updated:** April 23, 2026
