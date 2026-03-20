# 🚀 AWS Deployment for Absolute Beginners – MealStack Platform

This guide assumes **ZERO AWS experience** and will walk you through every single step with screenshots descriptions and exact button locations.

---

## 📋 Table of Contents

1. [AWS Account Setup](#1-aws-account-setup)
2. [AWS Console Navigation](#2-aws-console-navigation)
3. [AWS CLI Configuration](#3-aws-cli-configuration)
4. [IAM Setup (Security & Permissions)](#4-iam-setup)
5. [Create ECR Repositories](#5-create-ecr-repositories)
6. [Setup Secrets Manager](#6-setup-secrets-manager)
7. [Create VPC & Networking](#7-create-vpc--networking)
8. [Create ECS Cluster](#8-create-ecs-cluster)
9. [GitHub Integration](#9-github-integration)
10. [Deploy Your First Service](#10-deploy-your-first-service)
11. [Verify Deployment](#11-verify-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. AWS Account Setup

### Step 1.1: Create AWS Account (if you don't have one)

1. **Go to**: https://aws.amazon.com/
2. **Click**: Orange "Create an AWS Account" button (top right)
3. **Fill in**:
   - Root user email address
   - AWS account name (e.g., "MealStack-Dev")
4. **Verify email**: Check your inbox for verification code
5. **Set password**: Create a strong password (save it!)
6. **Enter personal information**:
   - Full name
   - Phone number
   - Country/Region
   - Address
7. **Payment information**:
   - Enter credit/debit card (required, but we'll use free tier)
   - AWS charges $1 temporarily for verification (refunded)
8. **Identity verification**:
   - Choose SMS or Voice call
   - Enter verification code
9. **Choose Support Plan**:
   - ✅ **Select "Basic Support - Free"**
   - Click "Complete sign up"

**✅ Result**: You'll receive "Welcome to AWS" email

---

### Step 1.2: Enable Free Tier Alerts (Important!)

1. **Go to**: https://console.aws.amazon.com/billing/
2. **Left menu**: Click "Billing Preferences"
3. **Scroll down**: Find "Alert Preferences"
4. **Enable**:
   - ✅ Receive Free Tier Usage Alerts
   - ✅ Receive Billing Alerts
5. **Enter email**: Your email address
6. **Click**: "Save preferences"

**Why?** You'll get notified before exceeding free tier limits.

---

## 2. AWS Console Navigation

### Understanding the AWS Console

When you log in to AWS Console, here's what you see:

```
┌─────────────────────────────────────────────────────────────┐
│  AWS Logo    [Search for services]         🔔  User ▼      │  ← Top Bar
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Recently Visited:                                           │
│  [EC2] [ECS] [ECR] [IAM]                                    │
│                                                               │
│  Build a solution:                                           │
│  • Compute                                                   │
│  • Containers                                                │
│  • Storage                                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Important Buttons:**
- **Search bar (top)**: Type any service name (e.g., "ECS", "IAM")
- **Region selector (top right)**: Shows your region (e.g., "US East (N. Virginia)")
- **User dropdown (top right)**: Your account menu

---

### Step 2.1: Choose Your Region

**IMPORTANT**: All resources must be in the same region!

1. **Top right corner**: Click region name (e.g., "N. Virginia")
2. **Select**: **US East (N. Virginia)** - `us-east-1` (recommended)
3. **Remember**: Use this same region throughout!

**Other good options:**
- `us-west-2` (Oregon) - Good for West Coast
- `ap-south-1` (Mumbai) - Good for Sri Lanka/India

---

## 3. AWS CLI Configuration

You mentioned you already installed AWS CLI. Let's configure it!

### Step 3.1: Create Access Keys

**Via AWS Console:**

1. **Search bar**: Type "IAM" and press Enter
2. **Left menu**: Click "Users"
3. **Click**: "Create user" (orange button, top right)
4. **User name**: Enter `github-actions-user`
5. **Click**: "Next"
6. **Permissions**: 
   - Select "Attach policies directly"
   - Search and check these policies:
     - ✅ `AmazonEC2ContainerRegistryFullAccess`
     - ✅ `AmazonECS_FullAccess`
     - ✅ `IAMFullAccess`
     - ✅ `SecretsManagerReadWrite`
     - ✅ `AWSCloudFormationFullAccess`
7. **Click**: "Next" → "Create user"
8. **Click** on the user you just created
9. **Click** "Security credentials" tab
10. **Scroll to**: "Access keys"
11. **Click**: "Create access key"
12. **Select**: "Command Line Interface (CLI)"
13. **Check**: "I understand..." checkbox
14. **Click**: "Next" → "Create access key"
15. **IMPORTANT**: Copy both:
    - Access key ID (starts with `AKIA...`)
    - Secret access key (shown once - SAVE IT!)
16. **Click**: "Download .csv file" (backup)

---

### Step 3.2: Configure AWS CLI

**Open PowerShell** (as Administrator preferably) and run:

```powershell
# Configure AWS CLI
aws configure

# You'll be prompted - enter these:
# AWS Access Key ID: [Paste your AKIA... key]
# AWS Secret Access Key: [Paste your secret key]
# Default region name: us-east-1
# Default output format: json
```

**Example:**
```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

**Verify it works:**
```powershell
# This should show your account ID
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/github-actions-user"
}
```

✅ **Copy your Account ID** (12-digit number) - you'll need it later!

---

## 4. IAM Setup

IAM = Identity and Access Management (who can do what in AWS)

### Step 4.1: Create Execution Role for ECS Tasks

**Why?** ECS needs permission to pull Docker images and access secrets.

**Via AWS Console:**

1. **Search**: "IAM" → Click "IAM"
2. **Left menu**: Click "Roles"
3. **Click**: "Create role" (orange button)
4. **Trusted entity type**: Select "AWS service"
5. **Use case**: 
   - Scroll down and select **"Elastic Container Service"**
   - Below that, select **"Elastic Container Service Task"**
6. **Click**: "Next"
7. **Permissions**: These should be pre-selected:
   - ✅ `AmazonECSTaskExecutionRolePolicy`
8. **Click**: "Next"
9. **Role name**: Enter `ecsTaskExecutionRole`
10. **Click**: "Create role"

**✅ Save this ARN**: 
- Click on the role you created
- Copy the ARN: `arn:aws:iam::123456789012:role/ecsTaskExecutionRole`

---

### Step 4.2: Create Task Role (for application permissions)

**Via AWS Console:**

1. **Still in IAM → Roles**
2. **Click**: "Create role"
3. **Trusted entity**: "AWS service"
4. **Use case**: "Elastic Container Service" → "Elastic Container Service Task"
5. **Click**: "Next"
6. **Search and add** these policies:
   - ✅ `AmazonSSMReadOnlyAccess`
   - ✅ `SecretsManagerReadWrite`
7. **Click**: "Next"
8. **Role name**: Enter `ecsTaskRole`
9. **Click**: "Create role"

**✅ Save this ARN too**: `arn:aws:iam::123456789012:role/ecsTaskRole`

---

### Step 4.3: Create Role for GitHub Actions (OIDC)

**This allows GitHub to deploy without storing AWS keys!**

**First, create OIDC Provider:**

**Via AWS CLI (easier):**
```powershell
aws iam create-open-id-connect-provider `
  --url https://token.actions.githubusercontent.com `
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" `
  --client-id-list "sts.amazonaws.com"
```

**Via AWS Console:**
1. **IAM** → **Left menu** → "Identity providers"
2. **Click**: "Add provider"
3. **Provider type**: "OpenID Connect"
4. **Provider URL**: `https://token.actions.githubusercontent.com`
5. **Click**: "Get thumbprint"
6. **Audience**: `sts.amazonaws.com`
7. **Click**: "Add provider"

**Now create the role:**

**Via AWS CLI** (replace YOUR_GITHUB_USERNAME and YOUR_ACCOUNT_ID):
```powershell
# Save this to a file first: trust-policy.json
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/MealStack_Platform:*"
        }
      }
    }
  ]
}
"@ | Out-File -FilePath trust-policy.json -Encoding utf8

# Create the role
aws iam create-role `
  --role-name github-actions-mealstack `
  --assume-role-policy-document file://trust-policy.json

# Attach permissions
aws iam attach-role-policy `
  --role-name github-actions-mealstack `
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-role-policy `
  --role-name github-actions-mealstack `
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy `
  --role-name github-actions-mealstack `
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess
```

**✅ Save the role ARN**: `arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-mealstack`

---

## 5. Create ECR Repositories

ECR = Elastic Container Registry (stores your Docker images)

### Step 5.1: Create Repository

**Via AWS Console:**

1. **Search**: "ECR" → Click "Elastic Container Registry"
2. **Click**: "Get started" (if first time) or "Create repository"
3. **Repository name**: `mealstack-auth`
4. **Tag immutability**: Disabled (default)
5. **Scan on push**: Enabled (for security)
6. **Click**: "Create repository"

**Repeat for each service:**
- `mealstack-restaurant`
- `mealstack-order`
- `mealstack-payment`
- `mealstack-rider`

**Via AWS CLI (faster):**
```powershell
# Create all repositories at once
$services = @("auth", "restaurant", "order", "payment", "rider")
foreach ($service in $services) {
    aws ecr create-repository --repository-name "mealstack-$service" --region us-east-1
}
```

**✅ Get repository URIs:**
```powershell
aws ecr describe-repositories --region us-east-1 --query 'repositories[].repositoryUri' --output table
```

Save these - you'll need them!

---

## 6. Setup Secrets Manager

Secrets Manager = Secure storage for passwords, API keys, etc.

### Step 6.1: Create Secrets for Each Service

**Via AWS Console:**

1. **Search**: "Secrets Manager" → Click it
2. **Click**: "Store a new secret" (orange button)
3. **Secret type**: Select "Other type of secret"
4. **Key/value pairs**:
   - Click "Plaintext" tab
   - Delete example text
   - Paste your MongoDB connection string:
     ```
     mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/auth?appName=Cluster0
     ```
5. **Encryption key**: Leave as default (aws/secretsmanager)
6. **Click**: "Next"
7. **Secret name**: `mealstack/auth/MONGO_URI`
8. **Click**: "Next" → "Next" → "Store"

**Repeat for all services:**

| Secret Name | Value |
|-------------|-------|
| `mealstack/auth/MONGO_URI` | `mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/auth?appName=Cluster0` |
| `mealstack/auth/JWT_SECRET` | `your-super-secret-jwt-key-min-32-characters-long-change-this` |
| `mealstack/restaurant/MONGO_URI` | `mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/restaurant?appName=Cluster0` |
| `mealstack/order/MONGO_URI` | `mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/order?appName=Cluster0` |
| `mealstack/payment/MONGO_URI` | `mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/payment?appName=Cluster0` |
| `mealstack/payment/STRIPE_SECRET_KEY` | `sk_test_your_stripe_key_here` |
| `mealstack/payment/STRIPE_WEBHOOK_SECRET` | `whsec_your_webhook_secret` |
| `mealstack/rider/MONGO_URI` | `mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/rider?appName=Cluster0` |

**Via AWS CLI (faster):**
```powershell
# Auth secrets
aws secretsmanager create-secret `
  --name "mealstack/auth/MONGO_URI" `
  --secret-string "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/auth?appName=Cluster0"

aws secretsmanager create-secret `
  --name "mealstack/auth/JWT_SECRET" `
  --secret-string "your-super-secret-jwt-key-min-32-characters-long-change-this"

# Restaurant
aws secretsmanager create-secret `
  --name "mealstack/restaurant/MONGO_URI" `
  --secret-string "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/restaurant?appName=Cluster0"

# Order
aws secretsmanager create-secret `
  --name "mealstack/order/MONGO_URI" `
  --secret-string "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/order?appName=Cluster0"

# Payment
aws secretsmanager create-secret `
  --name "mealstack/payment/MONGO_URI" `
  --secret-string "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/payment?appName=Cluster0"

aws secretsmanager create-secret `
  --name "mealstack/payment/STRIPE_SECRET_KEY" `
  --secret-string "sk_test_your_stripe_key"

aws secretsmanager create-secret `
  --name "mealstack/payment/STRIPE_WEBHOOK_SECRET" `
  --secret-string "whsec_your_webhook_secret"

# Rider
aws secretsmanager create-secret `
  --name "mealstack/rider/MONGO_URI" `
  --secret-string "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/rider?appName=Cluster0"
```

**✅ Verify:**
```powershell
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `mealstack`)].Name' --output table
```

---

## 7. Create VPC & Networking

VPC = Virtual Private Cloud (your private network in AWS)

### Option A: Use Default VPC (Easiest for beginners)

**Check if you have default VPC:**
```powershell
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text
```

If you see a VPC ID (like `vpc-12345...`), you're good! **Skip to Section 8**.

### Option B: Create New VPC (if no default)

**Via AWS Console:**

1. **Search**: "VPC" → Click "VPC"
2. **Click**: "Create VPC"
3. **Select**: "VPC and more" (this creates everything at once!)
4. **Settings**:
   - **Name**: `mealstack-vpc`
   - **IPv4 CIDR**: `10.0.0.0/16` (default)
   - **Number of AZs**: 2
   - **Number of public subnets**: 2
   - **Number of private subnets**: 2
   - **NAT gateways**: None (to save costs - use "None" for learning)
   - **VPC endpoints**: None
5. **Click**: "Create VPC"

**Wait 2-3 minutes** for resources to be created.

**✅ Save these IDs:**
```powershell
# Get VPC ID
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=mealstack-vpc" --query 'Vpcs[0].VpcId' --output text

# Get Subnet IDs
aws ec2 describe-subnets --filters "Name=vpc-id,Values=YOUR_VPC_ID" --query 'Subnets[].SubnetId' --output table
```

---

## 8. Create ECS Cluster

ECS = Elastic Container Service (runs your Docker containers)

### Step 8.1: Create Cluster

**Via AWS Console:**

1. **Search**: "ECS" → Click "Elastic Container Service"
2. **Left menu**: Click "Clusters"
3. **Click**: "Create cluster" (orange button)
4. **Cluster configuration**:
   - **Cluster name**: `mealstack-cluster`
   - **Infrastructure**: ✅ AWS Fargate (serverless - no servers to manage!)
5. **Monitoring** (optional):
   - ✅ Use Container Insights (helps with debugging)
6. **Click**: "Create"

**Via AWS CLI:**
```powershell
aws ecs create-cluster --cluster-name mealstack-cluster
```

✅ **Cluster created!** Now you have a place to run containers.

---

### Step 8.2: Create Task Definitions

**Task Definition** = Recipe for how to run your container

We'll create one for the Auth service first.

**Via AWS CLI (recommended):**

First, let's update the task definition file with your account ID:

```powershell
# Get your account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "Your Account ID: $accountId"

# Navigate to project
cd "d:\Sliit Projects\MealStack_Platform"

# Update auth task definition
$taskDefPath = "infra\aws\task-definitions\auth-task-definition.json"
$content = Get-Content $taskDefPath -Raw
$content = $content -replace "ACCOUNT_ID", $accountId
$content | Out-File -FilePath $taskDefPath -Encoding utf8 -NoNewline

# Register the task definition
aws ecs register-task-definition --cli-input-json file://$taskDefPath
```

**Via AWS Console:**

1. **ECS Console** → **Left menu** → "Task definitions"
2. **Click**: "Create new task definition" → "Create new task definition"
3. **Name**: `auth`
4. **Infrastructure**:
   - Launch type: **AWS Fargate**
   - OS: Linux/X86_64
   - CPU: 0.25 vCPU
   - Memory: 0.5 GB
5. **Task execution role**: Select `ecsTaskExecutionRole` (created earlier)
6. **Task role**: Select `ecsTaskRole`
7. **Container section**:
   - **Name**: `auth`
   - **Image URI**: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mealstack-auth:latest`
   - **Port mappings**: 
     - Container port: `4001`
     - Protocol: TCP
     - App protocol: HTTP
8. **Environment variables** (click "Add"):
   - `PORT` = `4001`
   - `NODE_ENV` = `production`
9. **Secrets** (click "Add" → "ValueFrom"):
   - `MONGO_URI` → Select `mealstack/auth/MONGO_URI`
   - `JWT_SECRET` → Select `mealstack/auth/JWT_SECRET`
10. **Logging**: CloudWatch Logs should be auto-configured
11. **Click**: "Create"

**Repeat for other services** (restaurant, order, payment, rider) with their respective ports and secrets.

---

## 9. GitHub Integration

### Step 9.1: Add Secrets to GitHub

1. **Go to**: Your GitHub repository
2. **Navigate**: Settings → Secrets and variables → Actions
3. **Click**: "New repository secret"
4. **Add these secrets one by one:**

| Secret Name | Value | Where to get it |
|-------------|-------|----------------|
| `AWS_ROLE_TO_ASSUME` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-mealstack` | From Step 4.3 |
| `AWS_ACCOUNT_ID` | Your 12-digit account ID | `aws sts get-caller-identity --query Account --output text` |
| `AWS_REGION` | `us-east-1` | The region you chose |
| `SNYK_TOKEN` | (Optional) Your Snyk token | From snyk.io if you signed up |

**Example:**
```
Name: AWS_ROLE_TO_ASSUME
Secret: arn:aws:iam::123456789012:role/github-actions-mealstack
```

---

## 10. Deploy Your First Service

### Step 10.1: Build and Push Docker Image Manually (First Time)

Let's deploy the Auth service first to understand the process.

```powershell
# Navigate to project
cd "d:\Sliit Projects\MealStack_Platform"

# Get ECR login command
$accountId = aws sts get-caller-identity --query Account --output text
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$accountId.dkr.ecr.us-east-1.amazonaws.com"

# Build the image
docker build -t mealstack-auth -f services/auth/Dockerfile .

# Tag it for ECR
docker tag mealstack-auth:latest "$accountId.dkr.ecr.us-east-1.amazonaws.com/mealstack-auth:latest"

# Push to ECR
docker push "$accountId.dkr.ecr.us-east-1.amazonaws.com/mealstack-auth:latest"
```

**This will take 5-10 minutes** depending on your internet speed.

---

### Step 10.2: Create ECS Service

**Via AWS Console:**

1. **ECS** → **Clusters** → Click `mealstack-cluster`
2. **Click**: "Create" button in Services section
3. **Deployment configuration**:
   - Launch type: **Fargate**
   - Application type: Service
   - Task definition: Select `auth` (latest)
4. **Service configuration**:
   - **Service name**: `auth-service`
   - **Desired tasks**: 1 (for testing)
5. **Networking**:
   - **VPC**: Select your VPC
   - **Subnets**: Select at least 2 subnets
   - **Security group**: 
     - Click "Create new security group"
     - Name: `mealstack-auth-sg`
     - Inbound rules:
       - Type: Custom TCP
       - Port: 4001
       - Source: Anywhere (0.0.0.0/0) for testing
   - **Public IP**: ✅ ENABLED (important!)
6. **Load balancing**: None (for now - we'll add later)
7. **Click**: "Create"

**Via AWS CLI:**
```powershell
# Get subnet IDs (use your VPC ID)
$subnets = aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[0:2].SubnetId' --output text

# Create security group
$sgId = aws ec2 create-security-group `
  --group-name mealstack-auth-sg `
  --description "Security group for Auth service" `
  --query 'GroupId' --output text

# Allow inbound traffic on port 4001
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 4001 `
  --cidr 0.0.0.0/0

# Create ECS service
aws ecs create-service `
  --cluster mealstack-cluster `
  --service-name auth-service `
  --task-definition auth `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$sgId],assignPublicIp=ENABLED}"
```

---

## 11. Verify Deployment

### Step 11.1: Check Service Status

**Via AWS Console:**

1. **ECS** → **Clusters** → `mealstack-cluster`
2. **Services tab** → Click `auth-service`
3. **Check**:
   - Status: ACTIVE ✅
   - Running tasks: 1
4. **Click**: "Tasks" tab
5. **Click** on the task ID
6. **Find**: Public IP address (under Network section)

**Via AWS CLI:**
```powershell
# Check service status
aws ecs describe-services `
  --cluster mealstack-cluster `
  --services auth-service `
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' `
  --output table

# Get task details
$taskArn = aws ecs list-tasks --cluster mealstack-cluster --service-name auth-service --query 'taskArns[0]' --output text

aws ecs describe-tasks --cluster mealstack-cluster --tasks $taskArn --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text | ForEach-Object {
    $eniId = $_
    aws ec2 describe-network-interfaces --network-interface-ids $eniId --query 'NetworkInterfaces[0].Association.PublicIp' --output text
}
```

**✅ Save the Public IP!**

---

### Step 11.2: Test the Service

```powershell
# Replace with your actual public IP
$publicIp = "YOUR_PUBLIC_IP_HERE"

# Test health endpoint
curl "http://${publicIp}:4001/health"

# Should return: {"status":"ok"}
```

**If it works** 🎉 **Congratulations!** Your first service is running on AWS!

---

## 12. Troubleshooting

### Problem: Task stops immediately

**Check logs:**
```powershell
aws logs tail /ecs/mealstack-cluster --follow
```

**Common causes:**
- MongoDB connection failed (check MONGO_URI in Secrets Manager)
- Missing environment variables
- Container crashed on startup

---

### Problem: Can't access service via public IP

**Checks:**
1. **Security group**: Make sure port 4001 is open
   ```powershell
   aws ec2 describe-security-groups --group-ids YOUR_SG_ID
   ```
2. **Public IP enabled**: Check network configuration
3. **Container is running**: Check ECS task status

---

### Problem: "Access Denied" errors

**Checks:**
1. **Task execution role** has `AmazonECSTaskExecutionRolePolicy`
2. **Task role** has permissions to Secrets Manager
3. IAM roles are correctly attached to task definition

---

## 13. Next Steps Overview

Once Auth service works, you'll need to:

1. ✅ Deploy remaining services (restaurant, order, payment, rider)
2. ✅ Create Application Load Balancer for production routing
3. ✅ Setup GitHub Actions for automatic deployments
4. ✅ (Optional) Add custom domain with Route 53

Let's do each step in detail below!

---

## 14. Deploy Remaining Services

Now that Auth service is working, let's deploy the other 4 services!

### Step 14.1: Prepare All Task Definitions

```powershell
# Get your account ID
$accountId = aws sts get-caller-identity --query Account --output text

cd "d:\Sliit Projects\MealStack_Platform"

# Update and register ALL task definitions
$services = @("auth", "restaurant", "order", "payment", "rider")
foreach ($service in $services) {
    Write-Host "Registering $service task definition..." -ForegroundColor Cyan
    
    $taskDefPath = "infra\aws\task-definitions\$service-task-definition.json"
    $content = Get-Content $taskDefPath -Raw
    $content = $content -replace "ACCOUNT_ID", $accountId
    [System.IO.File]::WriteAllText("$PWD\$taskDefPath", $content)
    
    aws ecs register-task-definition --cli-input-json file://$taskDefPath
}
```

---

### Step 14.2: Build and Push All Docker Images

```powershell
# Login to ECR
$accountId = aws sts get-caller-identity --query Account --output text
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$accountId.dkr.ecr.us-east-1.amazonaws.com"

# Build and push each service
$services = @(
    @{name="auth"; port=4001},
    @{name="restaurant"; port=4002},
    @{name="order"; port=4003},
    @{name="payment"; port=4004},
    @{name="rider"; port=4005}
)

foreach ($svc in $services) {
    $serviceName = $svc.name
    Write-Host "`n=== Building $serviceName service ===" -ForegroundColor Green
    
    # Build
    docker build -t "mealstack-$serviceName" -f "services/$serviceName/Dockerfile" .
    
    # Tag
    docker tag "mealstack-$serviceName:latest" "$accountId.dkr.ecr.us-east-1.amazonaws.com/mealstack-$serviceName:latest"
    
    # Push
    docker push "$accountId.dkr.ecr.us-east-1.amazonaws.com/mealstack-$serviceName:latest"
    
    Write-Host "✅ $serviceName pushed successfully!" -ForegroundColor Green
}
```

**⏱️ This will take 20-30 minutes** depending on your internet speed.

---

### Step 14.3: Create Security Groups for Each Service

```powershell
# Create security groups for all services
$services = @(
    @{name="restaurant"; port=4002},
    @{name="order"; port=4003},
    @{name="payment"; port=4004},
    @{name="rider"; port=4005}
)

# Store security group IDs
$securityGroups = @{}

foreach ($svc in $services) {
    $serviceName = $svc.name
    $port = $svc.port
    
    Write-Host "Creating security group for $serviceName..." -ForegroundColor Cyan
    
    # Create security group
    $sgId = aws ec2 create-security-group `
        --group-name "mealstack-$serviceName-sg" `
        --description "Security group for $serviceName service" `
        --query 'GroupId' --output text
    
    # Allow inbound traffic
    aws ec2 authorize-security-group-ingress `
        --group-id $sgId `
        --protocol tcp `
        --port $port `
        --cidr 0.0.0.0/0
    
    $securityGroups[$serviceName] = $sgId
    Write-Host "✅ $serviceName SG: $sgId" -ForegroundColor Green
}

# Display all security groups
Write-Host "`n📋 Security Groups Created:" -ForegroundColor Yellow
$securityGroups.GetEnumerator() | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)"
}
```

---

### Step 14.4: Create ECS Services

```powershell
# Get subnet IDs
$subnet1 = aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[0].SubnetId' --output text
$subnet2 = aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[1].SubnetId' --output text

# Create all ECS services
$services = @(
    @{name="restaurant"; port=4002; sg=$securityGroups["restaurant"]},
    @{name="order"; port=4003; sg=$securityGroups["order"]},
    @{name="payment"; port=4004; sg=$securityGroups["payment"]},
    @{name="rider"; port=4005; sg=$securityGroups["rider"]}
)

foreach ($svc in $services) {
    $serviceName = $svc.name
    $sgId = $svc.sg
    
    Write-Host "`nCreating ECS service for $serviceName..." -ForegroundColor Cyan
    
    aws ecs create-service `
        --cluster mealstack-cluster `
        --service-name "${serviceName}-service" `
        --task-definition "${serviceName}:1" `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=[$subnet1,$subnet2],securityGroups=[${sgId}],assignPublicIp=ENABLED}"
    
    Write-Host "✅ $serviceName service created!" -ForegroundColor Green
}
```

---

### Step 14.5: Get Public IPs for All Services

```powershell
# Wait a bit for tasks to start
Write-Host "`n⏳ Waiting 60 seconds for tasks to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Get public IPs
$services = @("auth", "restaurant", "order", "payment", "rider")
$ports = @{auth=4001; restaurant=4002; order=4003; payment=4004; rider=4005}

Write-Host "`n🌐 Service Public IPs:" -ForegroundColor Green
foreach ($service in $services) {
    $taskArn = aws ecs list-tasks --cluster mealstack-cluster --service-name "$service-service" --query 'taskArns[0]' --output text
    
    if ($taskArn -and $taskArn -ne "None") {
        $eniId = aws ecs describe-tasks --cluster mealstack-cluster --tasks $taskArn --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text
        $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --query 'NetworkInterfaces[0].Association.PublicIp' --output text
        
        $port = $ports[$service]
        Write-Host "  $service`: http://$publicIp`:$port/health" -ForegroundColor Cyan
    }
}
```

---

### Step 14.6: Test All Services

```powershell
# Test each service health endpoint
Write-Host "`n🧪 Testing all services..." -ForegroundColor Yellow

# Define ports
$ports = @{auth=4001; restaurant=4002; order=4003; payment=4004; rider=4005}

$services = @("auth", "restaurant", "order", "payment", "rider")
foreach ($service in $services) {
    $taskArn = aws ecs list-tasks --cluster mealstack-cluster --service-name "${service}-service" --query 'taskArns[0]' --output text
    
    if ($taskArn -and $taskArn -ne "None") {
        $eniId = aws ecs describe-tasks --cluster mealstack-cluster --tasks $taskArn --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text
        $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --query 'NetworkInterfaces[0].Association.PublicIp' --output text
        
        $port = $ports[$service]
        Write-Host "`nTesting $service service..." -ForegroundColor Cyan
        Write-Host "  URL: http://${publicIp}:${port}/health" -ForegroundColor Gray
        curl "http://${publicIp}:${port}/health"
    } else {
        Write-Host "`n⚠️ No task found for $service service" -ForegroundColor Yellow
    }
}
```

**✅ All services should return `{"status":"ok"}`**

---

## 15. Create Application Load Balancer

Now let's create a Load Balancer to route traffic to all services!

> **⚠️ Important:** AWS Console now requires target groups to exist BEFORE creating a load balancer. We'll create target groups first!

### Step 15.1: Create Target Groups First

Target groups are needed before you can create the load balancer.

**Via AWS CLI (Fastest method):**

```powershell
# Get your VPC ID
$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text
Write-Host "Using VPC: $vpcId" -ForegroundColor Cyan

# Create target groups for all services
$targetGroups = @(
    @{name="auth"; port=4001},
    @{name="restaurant"; port=4002},
    @{name="order"; port=4003},
    @{name="payment"; port=4004},
    @{name="rider"; port=4005}
)

foreach ($tg in $targetGroups) {
    $serviceName = $tg.name
    $port = $tg.port
    
    Write-Host "`nCreating target group for $serviceName..." -ForegroundColor Cyan
    
    aws elbv2 create-target-group `
        --name "mealstack-$serviceName-tg" `
        --protocol HTTP `
        --port $port `
        --vpc-id $vpcId `
        --target-type ip `
        --health-check-enabled `
        --health-check-path "/health" `
        --health-check-interval-seconds 30 `
        --health-check-timeout-seconds 5 `
        --healthy-threshold-count 2 `
        --unhealthy-threshold-count 3
    
    Write-Host "✅ $serviceName target group created!" -ForegroundColor Green
}

Write-Host "`n✅ All target groups created!" -ForegroundColor Green
```

**Via AWS Console (Alternative):**

For each service, create a target group:

1. **Search**: "EC2" → Click "EC2"
2. **Left menu** → "Target Groups"
3. **Click**: "Create target group"
4. **Choose target type**: **IP addresses** (important!)
5. **Target group name**: `mealstack-auth-tg`
6. **Protocol**: HTTP
7. **Port**: 4001
8. **VPC**: Select your VPC
9. **Health check settings**:
   - **Health check path**: `/health`
   - **Health check interval**: 30 seconds
   - **Healthy threshold**: 2
   - **Unhealthy threshold**: 3
10. **Click**: "Next"
11. **Register targets**: Skip (ECS will auto-register)
12. **Click**: "Create target group"

**Repeat for other services:**
- Restaurant: `mealstack-restaurant-tg`, Port 4002, Health check: `/health`
- Order: `mealstack-order-tg`, Port 4003, Health check: `/health`
- Payment: `mealstack-payment-tg`, Port 4004, Health check: `/health`
- Rider: `mealstack-rider-tg`, Port 4005, Health check: `/health`

---

### Step 15.2: Create Load Balancer

Now that target groups exist, we can create the load balancer!

**Via AWS Console (Recommended for beginners):**

1. **EC2 Console** → **Left menu** → "Load Balancers"
2. **Click**: "Create load balancer" (orange button)
3. **Select**: "Application Load Balancer" → Click "Create"

**Configure Load Balancer:**

4. **Basic configuration**:
   - **Name**: `mealstack-alb`
   - **Scheme**: Internet-facing
   - **IP address type**: IPv4

5. **Network mapping**:
   - **VPC**: Select your default VPC
   - **Mappings**: ✅ Check at least 2 availability zones
   - For each AZ, select the public subnet

6. **Security groups**:
   - **Click**: "Create new security group"
   - **Name**: `mealstack-alb-sg`
   - **Description**: "Security group for MealStack ALB"
   - **Inbound rules**:
     - Type: HTTP, Port: 80, Source: 0.0.0.0/0
     - (Optional) Type: Custom TCP, Port: 4001-4005, Source: 0.0.0.0/0
   - **Click**: "Create security group"
   - **Back to ALB**: Refresh and select the new `mealstack-alb-sg`

7. **Listeners and routing**:
   - Protocol: HTTP
   - Port: 80
   - **Default action**: Select `mealstack-auth-tg` (or any target group - you can change this later)

8. **Click**: "Create load balancer"

**⏱️ Wait 3-5 minutes** for the ALB to become active.

**Via AWS CLI:**

```powershell
# Get subnet IDs
$subnets = aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[0:2].SubnetId' --output json | ConvertFrom-Json

# Create security group for ALB
$albSgId = aws ec2 create-security-group `
    --group-name mealstack-alb-sg `
    --description "Security group for MealStack ALB" `
    --query 'GroupId' --output text

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress `
    --group-id $albSgId `
    --protocol tcp `
    --port 80 `
    --cidr 0.0.0.0/0

# Get auth target group ARN
$authTgArn = aws elbv2 describe-target-groups `
    --names mealstack-auth-tg `
    --query 'TargetGroups[0].TargetGroupArn' --output text

# Create load balancer
aws elbv2 create-load-balancer `
    --name mealstack-alb `
    --subnets $subnets[0] $subnets[1] `
    --security-groups $albSgId `
    --scheme internet-facing `
    --type application `
    --ip-address-type ipv4

Write-Host "⏳ Waiting for ALB to become active..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Get ALB ARN
$albArn = aws elbv2 describe-load-balancers `
    --names mealstack-alb `
    --query 'LoadBalancers[0].LoadBalancerArn' --output text

# Create HTTP listener
aws elbv2 create-listener `
    --load-balancer-arn $albArn `
    --protocol HTTP `
    --port 80 `
    --default-actions Type=forward,TargetGroupArn=$authTgArn

Write-Host "✅ Load balancer created!" -ForegroundColor Green
```

---

### Step 15.3: Verify Load Balancer Configuration

The load balancer is configured with a default rule that routes traffic to the auth target group. This simple setup works perfectly for microservices!

> **📝 Note on Path-Based Routing:**
> 
> You might wonder about path-based routing (e.g., `/auth/*`, `/restaurant/*`). While ALB supports this, it requires your services to handle those prefixed paths. Since your services use endpoints like `/health` (not `/auth/health`), we use the simpler default routing approach.
>
> For production with a frontend application, you'd typically:
> - Have a frontend that calls services directly
> - Use AWS Service Discovery for service-to-service communication
> - Or modify service routes to handle path prefixes

**Verify your setup:**

```powershell
# Check that listener has default rule
$listenerArn = aws elbv2 describe-listeners `
    --load-balancer-arn $(aws elbv2 describe-load-balancers --names mealstack-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text) `
    --query 'Listeners[0].ListenerArn' --output text

aws elbv2 describe-rules --listener-arn $listenerArn --query 'Rules[?Priority==`default`]' --output table
```

You should see a default rule forwarding to `mealstack-auth-tg` (or whichever target group you selected during ALB creation).

---

### Step 15.4: Update ECS Services to Use Load Balancer

Now update each ECS service to register with the ALB:

**Via AWS Console:**

1. **ECS** → **Clusters** → `mealstack-cluster`
2. **Services** → Select `auth-service`
3. **Click**: "Update"
4. **Load balancing**:
   - **Load balancer type**: Application Load Balancer
   - **Load balancer**: Select `mealstack-alb`
   - **Target group**: Select `mealstack-auth-tg`
5. **Click**: "Update"

**Repeat for all other services.**

---

### Step 15.5: Test Load Balancer

```powershell
# Get ALB DNS name
$albDns = aws elbv2 describe-load-balancers --names mealstack-alb --query 'LoadBalancers[0].DNSName' --output text
Write-Host "`n🌐 Your Load Balancer URL: http://$albDns" -ForegroundColor Green

# Test health endpoint through ALB
Write-Host "`n🧪 Testing ALB..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "http://$albDns/health" -TimeoutSec 10
$content = $response.Content | ConvertFrom-Json

Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host "✅ Service: $($content.data.service)" -ForegroundColor Green
Write-Host "✅ Message: $($content.message)" -ForegroundColor Green
```

**Expected output:**
```
🌐 Your Load Balancer URL: http://mealstack-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com

🧪 Testing ALB...
✅ Status: 200
✅ Service: auth
✅ Message: Auth service healthy
```

**✅ Success!** Your load balancer is routing traffic to your services!

**📝 How Your Services Communicate:**

In your microservices setup:
- **Frontend → ALB:** A frontend application would call the ALB URL
- **Service → Service:** Services call each other directly using environment variables (e.g., `AUTH_SERVICE_URL`, `ORDER_SERVICE_URL`)
- **Health Checks:** ALB monitors service health via the `/health` endpoint in each target group
- **Auto-Recovery:** If a container fails health checks, ECS automatically replaces it and ALB routes around it

---

## 16. Setup Auto-Deployment with GitHub Actions

Your GitHub Actions workflows are already configured! Let's activate them.

### Step 16.1: Add GitHub Secrets

1. **Go to**: https://github.com/YOUR_USERNAME/MealStack_Platform
2. **Click**: Settings → Secrets and variables → Actions
3. **Click**: "New repository secret" for each:

| Secret Name | Value | How to get it |
|-------------|-------|---------------|
| `AWS_ROLE_TO_ASSUME` | `arn:aws:iam::013052902701:role/github-actions-mealstack` | You created this in Section 4.3 |
| `AWS_ACCOUNT_ID` | `013052902701` | Your account ID |
| `AWS_REGION` | `us-east-1` | The region you're using |
| `SNYK_TOKEN` | (Optional) `your-snyk-token` | From snyk.io if you have it |

**Quick way to get values:**

```powershell
# Get your account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "AWS_ACCOUNT_ID: $accountId"

# Get role ARN
$roleArn = "arn:aws:iam::$accountId`:role/github-actions-mealstack"
Write-Host "AWS_ROLE_TO_ASSUME: $roleArn"

Write-Host "AWS_REGION: us-east-1"
```

---

### Step 16.2: Test Auto-Deployment

1. **Make a small change** in your code:

```powershell
# Example: Update a comment in auth service
cd "d:\Sliit Projects\MealStack_Platform"

# Edit services/auth/src/app.js and add a comment
# Then commit and push
git add .
git commit -m "Test GitHub Actions deployment"
git push origin main
```

2. **Watch the deployment**:
   - Go to GitHub → Actions tab
   - You should see workflows running for each service
   - Each workflow will:
     - ✅ Run tests
     - ✅ Scan with Snyk (if configured)
     - ✅ Build Docker image
     - ✅ Push to ECR
     - ✅ Deploy to ECS

3. **Check deployment status**:

```powershell
# Watch service updates
aws ecs describe-services --cluster mealstack-cluster --services auth-service --query 'services[0].deployments' --output table
```

**✅ Your services now auto-deploy on every push to main branch!**

---

## 17. Add Custom Domain (Optional)

Want a custom domain like `api.mealstack.com` instead of the long ALB URL?

### Step 17.1: Register Domain in Route 53

1. **Search**: "Route 53" → Click it
2. **Left menu**: Click "Registered domains"
3. **Click**: "Register domain"
4. **Enter domain**: e.g., `mealstack.com`
5. **Check availability** → **Add to cart** → **Continue**
6. **Fill in contact details** → **Continue**
7. **Review** → **Complete purchase**

**💰 Cost**: ~$12/year for .com domains

---

### Step 17.2: Create SSL Certificate (HTTPS)

1. **Search**: "Certificate Manager" → Click it
2. **Click**: "Request certificate"
3. **Select**: "Request a public certificate"
4. **Domain names**: 
   - `mealstack.com`
   - `*.mealstack.com` (wildcard for subdomains)
5. **Validation method**: DNS validation
6. **Click**: "Request"
7. **Click**: "Create records in Route 53" (validates automatically)

**⏱️ Wait 5-10 minutes** for validation.

---

### Step 17.3: Add HTTPS Listener to ALB

1. **EC2** → **Load Balancers** → Click `mealstack-alb`
2. **Listeners** → **Add listener**
3. **Protocol**: HTTPS
4. **Port**: 443
5. **Default action**: Forward to `mealstack-auth-tg`
6. **SSL certificate**: Select your certificate
7. **Click**: "Add"

---

### Step 17.4: Create DNS Records

1. **Route 53** → **Hosted zones** → Click your domain
2. **Click**: "Create record"
3. **Record name**: `api`
4. **Record type**: A
5. **Alias**: Yes
6. **Route traffic to**: Alias to Application Load Balancer
7. **Region**: us-east-1
8. **Load balancer**: Select `mealstack-alb`
9. **Click**: "Create records"

**✅ Now access your API at `https://api.mealstack.com`**

---

## 📊 Cost Estimate

With AWS Free Tier (first 12 months):

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| ECS Fargate | 20 GB-hours/month | $0 - $5/month |
| ECR | 500 MB storage | $0 |
| Secrets Manager | Free for 30 days | $0.40/secret/month after |
| CloudWatch Logs | 5 GB/month | $0 - $2/month |
| **Total** | | **$0 - $10/month** |

**To minimize costs:**
- Stop services when not using: `aws ecs update-service --cluster mealstack-cluster --service auth-service --desired-count 0`
- Delete unused resources
- Set up billing alerts

---

## 🎓 Summary

✅ You've learned:
- AWS account setup and navigation
- IAM roles and permissions
- ECR for Docker images
- Secrets Manager for sensitive data
- ECS for running containers
- GitHub Actions integration
- Service deployment and testing

**Your production-ready microservices platform is now on AWS!** 🚀

---

## 📝 Quick Command Reference

```powershell
# Check AWS CLI is configured
aws sts get-caller-identity

# List all ECS services
aws ecs list-services --cluster mealstack-cluster

# View service logs
aws logs tail /ecs/mealstack-cluster --follow

# Stop all services (to save costs)
aws ecs update-service --cluster mealstack-cluster --service auth-service --desired-count 0

# Start service
aws ecs update-service --cluster mealstack-cluster --service auth-service --desired-count 1

# Delete everything (cleanup)
aws ecs delete-service --cluster mealstack-cluster --service auth-service --force
aws ecs delete-cluster --cluster mealstack-cluster
```

---

Need help? Check:
- AWS Documentation: https://docs.aws.amazon.com/
- AWS Support Forums: https://forums.aws.amazon.com/
- This project's GitHub Issues

Good luck! 🍀
