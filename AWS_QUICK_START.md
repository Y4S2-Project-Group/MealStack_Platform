# 🚀 Quick Start: AWS Deployment

This is a simplified guide to deploy MealStack Platform to AWS in 30 minutes.

---

## Prerequisites

- ✅ AWS account created
- ✅ AWS CLI installed
- ✅ Docker Desktop running
- ✅ GitHub account with MealStack_Platform repository

---

## 🎯 Three Simple Steps

### **Step 1: Setup AWS (10 minutes)**

Open PowerShell in project directory:

```powershell
cd "d:\Sliit Projects\MealStack_Platform"

# Configure AWS CLI (if not done)
aws configure
# Enter your Access Key, Secret Key, Region (us-east-1), Format (json)

# Run automated setup script
.\scripts\aws-setup-helper.ps1
```

**What this does:**
- ✅ Creates 5 ECR repositories (for Docker images)
- ✅ Creates 8 secrets (MongoDB URLs, JWT secret, etc.)
- ✅ Creates 3 IAM roles (permissions)
- ✅ Creates ECS cluster
- ✅ Registers task definitions

**Expected output:**
```
✓ AWS Setup Complete!
```

---

### **Step 2: Build & Push Docker Images (15 minutes)**

```powershell
# Build all services and push to AWS
.\scripts\build-and-push.ps1
```

**What this does:**
- ✅ Builds 5 Docker images
- ✅ Pushes them to Amazon ECR

**Expected output:**
```
✓ Successful (5):
  • auth
  • restaurant
  • order
  • payment
  • rider
```

---

### **Step 3: Create ECS Services (5 minutes)**

```powershell
# Deploy all services to ECS
.\scripts\create-ecs-services.ps1
```

**What this does:**
- ✅ Creates security group
- ✅ Launches 5 services on ECS Fargate
- ✅ Shows you the public URLs

**Expected output:**
```
auth service:
  URL: http://52.23.45.67:4001
  Health: http://52.23.45.67:4001/health

restaurant service:
  URL: http://52.23.45.68:4002
  Health: http://52.23.45.68:4002/health

... (and so on)
```

---

## ✅ Verify Deployment

Test each service:

```powershell
# Replace with your actual IPs from Step 3
curl http://YOUR_IP:4001/health   # Auth
curl http://YOUR_IP:4002/health   # Restaurant
curl http://YOUR_IP:4003/health   # Order
curl http://YOUR_IP:4004/health   # Payment
curl http://YOUR_IP:4005/health   # Rider
```

**Expected response:**
```json
{"status":"ok"}
```

---

## 🎓 For GitHub Auto-Deployment (Optional)

1. **Go to**: https://github.com/YOUR_USERNAME/MealStack_Platform/settings/secrets/actions

2. **Add these secrets:**
   - `AWS_ROLE_TO_ASSUME` = `arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-mealstack`
   - `AWS_ACCOUNT_ID` = Your 12-digit account ID
   - `AWS_REGION` = `us-east-1`

3. **Push to GitHub:**
   ```powershell
   git add .
   git commit -m "AWS deployment configured"
   git push origin main
   ```

4. **GitHub Actions will automatically deploy!**

---

## 🛠️ Useful Commands

### Check service status
```powershell
aws ecs describe-services --cluster mealstack-cluster --services auth-service --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

### View logs
```powershell
aws logs tail /ecs/mealstack-cluster --follow
```

### Stop services (to save costs)
```powershell
aws ecs update-service --cluster mealstack-cluster --service auth-service --desired-count 0
aws ecs update-service --cluster mealstack-cluster --service restaurant-service --desired-count 0
aws ecs update-service --cluster mealstack-cluster --service order-service --desired-count 0
aws ecs update-service --cluster mealstack-cluster --service payment-service --desired-count 0
aws ecs update-service --cluster mealstack-cluster --service rider-service --desired-count 0
```

### Start services again
```powershell
aws ecs update-service --cluster mealstack-cluster --service auth-service --desired-count 1
aws ecs update-service --cluster mealstack-cluster --service restaurant-service --desired-count 1
aws ecs update-service --cluster mealstack-cluster --service order-service --desired-count 1
aws ecs update-service --cluster mealstack-cluster --service payment-service --desired-count 1
aws ecs update-service --cluster mealstack-cluster --service rider-service --desired-count 1
```

---

## 🌐 AWS Console Links

- **ECS Dashboard**: https://console.aws.amazon.com/ecs/v2/clusters/mealstack-cluster
- **ECR Repositories**: https://console.aws.amazon.com/ecr/repositories
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
- **Secrets Manager**: https://console.aws.amazon.com/secretsmanager/home?region=us-east-1
- **IAM Roles**: https://console.aws.amazon.com/iam/home#/roles

---

## ❓ Troubleshooting

### Services won't start?
```powershell
# Check logs
aws logs tail /ecs/mealstack-cluster --follow

# Common issues:
# - MongoDB connection failed → Check secrets in Secrets Manager
# - Task stopped immediately → Check task execution role permissions
# - Can't pull image → Check ECR repository permissions
```

### Can't access service via IP?
- Check security group allows inbound traffic on the port
- Check task has public IP assigned
- Wait 2-3 minutes for task to fully start

### AWS CLI not working?
```powershell
# Reconfigure
aws configure

# Test
aws sts get-caller-identity
```

---

## 💰 Cost Estimate

**With AWS Free Tier (First 12 months):**
- ECS Fargate: 20 GB-hours free → **$0-5/month**
- ECR: 500 MB free → **$0**
- Secrets Manager: First 30 days free → **$2/month after**
- CloudWatch Logs: 5 GB free → **$0-2/month**

**Total: $2-10/month** (or free for first month)

**To minimize costs:**
- Stop services when not using (see commands above)
- Delete resources after demo

---

## 📚 Need More Help?

- **Detailed Guide**: See [AWS_BEGINNER_GUIDE.md](AWS_BEGINNER_GUIDE.md)
- **AWS Documentation**: https://docs.aws.amazon.com/ecs/
- **GitHub Issues**: https://github.com/YOUR_USERNAME/MealStack_Platform/issues

---

## 🎉 You're Done!

Your microservices platform is now running on AWS! 🚀

**What you've accomplished:**
- ✅ Deployed 5 microservices to AWS
- ✅ Containerized with Docker
- ✅ Secured with IAM roles
- ✅ Configured auto-scaling
- ✅ Integrated with MongoDB Atlas
- ✅ Production-ready infrastructure

**Perfect for:**
- ✨ Academic projects
- ✨ Portfolio demonstrations
- ✨ Cloud computing assignments
- ✨ Microservices learning

---

*Generated for MealStack Platform - A Cloud-Native Food Ordering System*
