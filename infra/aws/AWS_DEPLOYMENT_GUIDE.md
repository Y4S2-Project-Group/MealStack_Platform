# AWS Deployment Guide for MealStack Platform

## Overview

This guide walks through deploying the MealStack Platform microservices to **AWS ECS (Elastic Container Service)** using Fargate launch type with CI/CD powered by GitHub Actions.

## Architecture

```
GitHub push to main
        ↓
GitHub Actions Workflow (image build & security scan)
        ↓
Amazon ECR (container registry)
        ↓
AWS ECS Fargate (container orchestration)
        ↓
Application Load Balancer (ALB)
        ↓
MongoDB Atlas (managed database)
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** with secrets configured
3. **AWS CLI** installed and configured
4. **AWS IAM Permissions** for CloudFormation, ECS, ECR, etc.

## Step 1: Setup AWS Infrastructure

### 1.1 Create IAM Role for GitHub Actions

GitHub Actions will use OIDC to assume an IAM role in your AWS account. This eliminates the need for long-lived API keys.

```bash
# Create the IAM role for GitHub
aws iam create-role \
  --role-name github-actions-mealstack \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/MealStack_Platform:*"
          }
        }
      }
    ]
  }'

# Attach necessary policies
aws iam attach-role-policy \
  --role-name github-actions-mealstack \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPushOnly

aws iam attach-role-policy \
  --role-name github-actions-mealstack \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

Replace `ACCOUNT_ID` with your AWS account ID and `YOUR_ORG` with your GitHub organization/username.

### 1.2 Deploy ECS Cluster Infrastructure

Deploy the base infrastructure (VPC, ECS Cluster, ALB, ECR):

```bash
aws cloudformation create-stack \
  --stack-name mealstack-cluster \
  --template-body file://infra/aws/ecs-cluster.yml \
  --parameters \
    ParameterKey=ClusterName,ParameterValue=mealstack-cluster \
    ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_NAMED_IAM
```

Monitor the stack creation:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name mealstack-cluster
```

Get the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name mealstack-cluster \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 1.3 Create AWS Secrets Manager Entries

Store your sensitive configuration in AWS Secrets Manager:

```bash
# Auth service secrets
aws secretsmanager create-secret \
  --name mealstack/auth/MONGO_URI \
  --secret-string "mongodb+srv://username:password@cluster.mongodb.net/auth"

aws secretsmanager create-secret \
  --name mealstack/auth/JWT_SECRET \
  --secret-string "your-jwt-secret-key"

# Payment service secrets
aws secretsmanager create-secret \
  --name mealstack/payment/STRIPE_SECRET_KEY \
  --secret-string "sk_test_..."

aws secretsmanager create-secret \
  --name mealstack/payment/STRIPE_WEBHOOK_SECRET \
  --secret-string "whsec_..."

# Repeat for other services (restaurant, order, rider)
```

## Step 2: Configure GitHub Repository Secrets

Add secrets to your GitHub repository settings:

1. Go to **Settings → Secrets and variables → Actions**
2. Add the following secrets:

```
AWS_ROLE_TO_ASSUME        = arn:aws:iam::ACCOUNT_ID:role/github-actions-mealstack
AWS_ECR_REPOSITORY_NAME   = mealstack-cluster
SNYK_TOKEN                = (optional) Your Snyk API token
```

## Step 3: Deploy ECS Services

Deploy each microservice:

```bash
# Auth Service
aws cloudformation create-stack \
  --stack-name mealstack-auth-service \
  --template-body file://infra/aws/ecs-services.yml \
  --parameters \
    ParameterKey=ClusterName,ParameterValue=mealstack-cluster \
    ParameterKey=ServiceName,ParameterValue=auth \
    ParameterKey=ContainerImage,ParameterValue=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mealstack-cluster:auth-latest \
    ParameterKey=ContainerPort,ParameterValue=4001 \
    ParameterKey=DesiredCount,ParameterValue=2 \
    ParameterKey=TaskCpu,ParameterValue=256 \
    ParameterKey=TaskMemory,ParameterValue=512 \
  --capabilities CAPABILITY_NAMED_IAM

# Repeat for restaurant, order, payment, and rider services
```

## Step 4: Create Service Discovery

For inter-service communication:

```bash
# Create private namespace
aws servicediscovery create-private-dns-namespace \
  --name mealstack.local \
  --vpc VpcId=vpc-xxx

# Create service discovery service for each microservice
aws servicediscovery create-service \
  --name auth-service \
  --namespace-id ns-xxx \
  --dns-config NamespaceId=ns-xxx,DnsRecords=[{Type=A,TTL=300}]
```

## Step 5: Setup CI/CD Pipeline

Push your code to trigger deployments:

```bash
git push origin main
```

GitHub Actions will automatically:

1. Build Docker image
2. Push to ECR
3. Run security scans (Snyk)
4. Update ECS task definition
5. Deploy to ECS

## Step 6: Verify Deployment

Check service health:

```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name mealstack-cluster \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDnsName`].OutputValue' \
  --output text)

# Test endpoints
curl http://$ALB_DNS/auth/health
curl http://$ALB_DNS/restaurant/health
curl http://$ALB_DNS/order/health
curl http://$ALB_DNS/payment/health
curl http://$ALB_DNS/rider/health
```

Check ECS service status:

```bash
aws ecs describe-services \
  --cluster mealstack-cluster \
  --services auth-service restaurant-service order-service payment-service rider-service \
  --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}'
```

View logs:

```bash
aws logs tail /ecs/mealstack-cluster --follow
```

## Step 7: Domain Setup (Optional)

To use a custom domain instead of ALB DNS:

```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name mealstack-cluster \
  --query 'Stacks[0].Outputs[?OutputKey==`ALBDnsName`].OutputValue' \
  --output text)

# In Route 53, create CNAME record:
# mealstack.yourdomain.com → $ALB_DNS
```

## Step 8: Auto-Scaling Configuration

Scaling is configured in `ecs-services.yml` for production environments:

- **Min tasks**: 2
- **Max tasks**: 4
- **Scale trigger**: 70% CPU utilization
- **Scale-out cooldown**: 60 seconds
- **Scale-in cooldown**: 300 seconds

## Monitoring & Logging

### CloudWatch Logs

View real-time logs:

```bash
aws logs tail /ecs/mealstack-cluster --follow --log-stream-name-pattern auth
```

### CloudWatch Metrics

Available metrics:

- CPU utilization
- Memory utilization
- Network in/out
- ECS task count

View in AWS Console → CloudWatch → Dashboards

### Container Insights

Enable enhanced monitoring:

```bash
# Already enabled in ecs-cluster.yml
# View in ECS Console → Clusters → mealstack-cluster → Container Insights
```

## Rollback Procedure

If deployment fails:

```bash
# Revert to previous task definition
aws ecs update-service \
  --cluster mealstack-cluster \
  --service auth-service \
  --task-definition auth:$(aws ecs describe-task-definition \
    --task-definition auth \
    --query 'taskDefinition.revision' \
    --output text | tail -n 2 | head -n 1)
```

## Cost Optimization

1. **Fargate Spot**: Use Spot instances for non-critical services (30-70% savings)
2. **Reserved Capacity**: For production services
3. **Auto-scaling**: Prevents over-provisioning
4. **ECR lifecycle policies**: Clean old images

```bash
aws ecr put-lifecycle-policy \
  --repository-name mealstack-cluster \
  --lifecycle-policy-text file://ecr-lifecycle-policy.json
```

## Cleanup

To remove all resources:

```bash
# Delete ECS services first
aws cloudformation delete-stack --stack-name mealstack-auth-service
aws cloudformation delete-stack --stack-name mealstack-restaurant-service
aws cloudformation delete-stack --stack-name mealstack-order-service
aws cloudformation delete-stack --stack-name mealstack-payment-service
aws cloudformation delete-stack --stack-name mealstack-rider-service

# Wait for services to be deleted
sleep 60

# Delete cluster
aws cloudformation delete-stack --stack-name mealstack-cluster
```

## Troubleshooting

### Task won't start

```bash
# Check task logs
aws ecs describe-tasks \
  --cluster mealstack-cluster \
  --tasks (get task ARN from service)

# Check service events
aws ecs describe-services \
  --cluster mealstack-cluster \
  --services auth-service \
  --query 'services[0].events[0:5]'
```

### Service unreachable

1. Check ALB target health: AWS Console → Load Balancers → Targets
2. Check security groups allow traffic between ALB and tasks
3. Verify service health check endpoint is responding

### High latency between services

1. Use Service Discovery (internal DNS) instead of IP addresses
2. Ensure instances are in same AZ
3. Check network ACLs and security group rules

## Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-best-practices.html)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
