# AWS Deployment Architecture - Change Summary

## Overview

Your MealStack Platform deployment architecture has been migrated from **Microsoft Azure Container Apps** to **Amazon Web Services (AWS) ECS (Elastic Container Service)**.

All 5 microservices now deploy to AWS with CI/CD automation via GitHub Actions.

## Files Created/Modified

### 1. PROJECT_SPEC.md ✅ Modified

**Changes:**

- Updated deployment target from **Azure Container Apps → AWS ECS**
- Changed container registry from **Azure ACR → Amazon ECR**
- Updated technology stack to reference AWS services
- Added ALB (Application Load Balancer) and Service Discovery

### 2. Infrastructure as Code

#### `infra/aws/ecs-cluster.yml` ✅ NEW

**CloudFormation Template** - Core infrastructure

- VPC with 2 public and 2 private subnets across 2 AZs
- Application Load Balancer (ALB)
- ECS Cluster with Container Insights enabled
- Security Groups (ALB and Task)
- Amazon ECR Repository with image scanning
- CloudWatch Log Group
- IAM roles for tasks (Execution & Task roles)

#### `infra/aws/ecs-services.yml` ✅ NEW

**CloudFormation Template** - Service deployment

- ECS Services (one per microservice)
- Fargate launch configuration (256 CPU / 512 MB RAM)
- Auto-scaling policies (min 2, max 4 tasks for production)
- Service discovery integration
- Target group routing

### 3. GitHub Actions Workflows (CI/CD)

#### `.github/workflows/auth-deploy.yml` ✅ NEW

#### `.github/workflows/restaurant-deploy.yml` ✅ NEW

#### `.github/workflows/order-deploy.yml` ✅ NEW

#### `.github/workflows/payment-deploy.yml` ✅ NEW

#### `.github/workflows/rider-deploy.yml` ✅ NEW

**Features:**

- Triggered on push to main (service-specific paths)
- AWS credentials via OIDC (no API keys needed)
- Automatic Docker build and push to ECR
- Snyk security scanning
- Automatic ECS task definition update
- Zero-downtime deployments
- Health checks before marking deployment complete

### 4. ECS Task Definitions

#### `infra/aws/task-definitions/auth-task-definition.json` ✅ NEW

#### `infra/aws/task-definitions/restaurant-task-definition.json` ✅ NEW

#### `infra/aws/task-definitions/order-task-definition.json` ✅ NEW

#### `infra/aws/task-definitions/payment-task-definition.json` ✅ NEW

#### `infra/aws/task-definitions/rider-task-definition.json` ✅ NEW

**Configuration:**

- Fargate task configuration
- Container port mappings
- CloudWatch log configuration
- Health check endpoints
- Environment variables
- AWS Secrets Manager integration for sensitive data

### 5. Documentation & Tools

#### `infra/aws/AWS_DEPLOYMENT_GUIDE.md` ✅ NEW

**Comprehensive deployment guide** including:

- Step-by-step AWS setup instructions
- IAM role creation for GitHub Actions (OIDC)
- CloudFormation stack deployment commands
- Service discovery configuration
- GitHub secrets setup
- Monitoring and logging
- Troubleshooting guide
- Rollback procedures
- Cost optimization tips

#### `infra/aws/ecr-lifecycle-policy.json` ✅ NEW

**ECR image retention policy:**

- Removes images older than 30 days
- Keeps max 10 untagged images

#### `infra/aws/aws-cli-helper.sh` ✅ NEW

**Interactive CLI helper script** for common operations:

- Check service health
- View ECS cluster status
- Stream service logs
- Scale services
- Restart services
- Export CloudWatch metrics
- View deployment history

## Architecture Comparison

### Azure (Old) → AWS (New)

| Component         | Azure                | AWS                             |
| ----------------- | -------------------- | ------------------------------- |
| Compute           | Container Apps       | ECS Fargate                     |
| Registry          | ACR                  | Amazon ECR                      |
| Load Balancer     | Built-in             | ALB (ALB)                       |
| Service Discovery | Built-in             | AWS Service Discovery           |
| Database          | MongoDB Atlas        | MongoDB Atlas ✅ (kept)         |
| CI/CD             | GitHub Actions       | GitHub Actions ✅ (kept)        |
| Secrets           | Azure Key Vault      | AWS Secrets Manager             |
| Monitoring        | Application Insights | CloudWatch + Container Insights |
| Auto-scaling      | Built-in             | Target Tracking (custom)        |

## Key Features

✅ **Multi-AZ Deployment** - Services spread across 2 availability zones  
✅ **Zero-Downtime Deployments** - Blue/green deployment capability  
✅ **Auto-Scaling** - Scale based on CPU utilization (70%)  
✅ **Health Checks** - Automated endpoint health monitoring  
✅ **Container Insights** - Enhanced CloudWatch monitoring  
✅ **Security Best Practices**:

- Secrets stored in AWS Secrets Manager
- Private subnets for ECS tasks
- Security group isolation
- OIDC for GitHub Actions (no long-lived credentials)
- ECR image scanning

✅ **Service Discovery** - Internal DNS-based service communication  
✅ **Centralized Logging** - All logs in CloudWatch  
✅ **Infrastructure as Code** - Entire infrastructure in CloudFormation

## Deployment Path

### 1. Initial Setup (One-time)

```bash
# Create IAM role for GitHub Actions
# Deploy base infrastructure (cluster, VPC, ALB)
# Configure AWS Secrets Manager
# Add GitHub secrets
```

### 2. Deploy Services

```bash
# Deploy each microservice using CloudFormation
# Every service gets 2-4 tasks running
```

### 3. CI/CD Pipeline (Automatic)

```
Developer pushes code → GitHub Actions builds image
→ Pushes to ECR → Updates ECS task definition
→ Rolls out new version → Health checks pass
→ Service updates complete
```

## Environment Configuration

### Secrets (AWS Secrets Manager)

```
mealstack/auth/MONGO_URI
mealstack/auth/JWT_SECRET
mealstack/restaurant/MONGO_URI
mealstack/order/MONGO_URI
mealstack/payment/MONGO_URI
mealstack/payment/STRIPE_SECRET_KEY
mealstack/payment/STRIPE_WEBHOOK_SECRET
mealstack/rider/MONGO_URI
```

### GitHub Secrets

```
AWS_ROLE_TO_ASSUME
AWS_ECR_REPOSITORY_NAME
SNYK_TOKEN (optional)
```

## Cost Estimates

**Approximate monthly cost** (production with 2 AZs):

- ECS Fargate: ~$150-200 (2 tasks × 5 services × all-month)
- ALB: ~$30
- Data transfer: ~$20-50
- ECR storage: ~$10
- **Total: ~$250-300/month**

_Cost can be reduced with:_

- Fargate Spot instances (-50%)
- Smaller task sizes (-30%)
- Reserved capacity discounts (-30%)

## Next Steps

1. **Setup AWS Account** - Ensure you have permissions
2. **Create IAM Role** - Follow `AWS_DEPLOYMENT_GUIDE.md` Step 1.1
3. **Deploy Infrastructure** - Run CloudFormation templates
4. **Configure Secrets** - Add credentials to AWS Secrets Manager
5. **Add GitHub Secrets** - Configure GitHub repository
6. **Push Code** - Trigger first deployment via GitHub
7. **Monitor** - Watch deployments in AWS Console or CLI

## Migration Notes

- ✅ MongoDB Atlas continues to work (no changes needed)
- ✅ GitHub Actions workflows stay the same (adapted for AWS)
- ✅ Database-per-service pattern maintained
- ✅ Swagger documentation unaffected
- ✅ All health endpoints continue working
- ✅ Service-to-service communication uses internal DNS

## Rollback Plan

If you need to revert to Azure:

1. All files are modular
2. Azure infrastructure files can be recreated
3. GitHub workflows can be reverted
4. No changes to application code

## Support Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [CloudFormation Best Practices](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/userguide/)

---

**Last Updated:** March 20, 2026
**Status:** ✅ Ready for Deployment
