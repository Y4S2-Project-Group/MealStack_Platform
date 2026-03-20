# AWS Setup Helper Script for MealStack Platform
# This script automates the AWS deployment setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MealStack AWS Deployment Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "[1/10] Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✓ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  Download from: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
Write-Host "`n[2/10] Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    $accountId = $identity.Account
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    Write-Host "  Account ID: $accountId" -ForegroundColor Cyan
    Write-Host "  User/Role: $($identity.Arn)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    Write-Host "  Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Get configuration from user
Write-Host "`n[3/10] Configuration..." -ForegroundColor Yellow
$region = Read-Host "Enter AWS region (default: us-east-1)"
if ([string]::IsNullOrWhiteSpace($region)) {
    $region = "us-east-1"
}

Write-Host "`nMongoDB Configuration:" -ForegroundColor Cyan
$mongoUri = "mongodb+srv://malisha:Lr7dvVGlpTcEzr5P@cluster0.9vniycs.mongodb.net/"
Write-Host "Using MongoDB Atlas: $mongoUri" -ForegroundColor Gray

Write-Host "`nGitHub Configuration:" -ForegroundColor Cyan
$githubUsername = Read-Host "Enter your GitHub username"
if ([string]::IsNullOrWhiteSpace($githubUsername)) {
    Write-Host "✗ GitHub username is required" -ForegroundColor Red
    exit 1
}

$repoName = "MealStack_Platform"

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  AWS Account: $accountId" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host "  GitHub: $githubUsername/$repoName" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
$confirm = Read-Host "`nProceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted by user" -ForegroundColor Yellow
    exit 0
}

# Create ECR repositories
Write-Host "`n[4/10] Creating ECR repositories..." -ForegroundColor Yellow
$services = @("auth", "restaurant", "order", "payment", "rider")
foreach ($service in $services) {
    $repoName = "mealstack-$service"
    try {
        $existing = aws ecr describe-repositories --repository-names $repoName --region $region 2>$null
        if ($existing) {
            Write-Host "  ✓ Repository already exists: $repoName" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Creating repository: $repoName" -ForegroundColor Gray
        aws ecr create-repository --repository-name $repoName --region $region --image-scanning-configuration scanOnPush=true | Out-Null
        Write-Host "  ✓ Created: $repoName" -ForegroundColor Green
    }
}

# Create Secrets Manager secrets
Write-Host "`n[5/10] Creating Secrets Manager secrets..." -ForegroundColor Yellow

$secrets = @{
    "mealstack/auth/MONGO_URI" = "${mongoUri}auth?appName=Cluster0"
    "mealstack/auth/JWT_SECRET" = "super-secret-jwt-key-min-32-chars-change-in-production-please-use-strong-key"
    "mealstack/restaurant/MONGO_URI" = "${mongoUri}restaurant?appName=Cluster0"
    "mealstack/order/MONGO_URI" = "${mongoUri}order?appName=Cluster0"
    "mealstack/payment/MONGO_URI" = "${mongoUri}payment?appName=Cluster0"
    "mealstack/payment/STRIPE_SECRET_KEY" = "sk_test_your_stripe_secret_key_here"
    "mealstack/payment/STRIPE_WEBHOOK_SECRET" = "whsec_your_webhook_secret_here"
    "mealstack/rider/MONGO_URI" = "${mongoUri}rider?appName=Cluster0"
}

foreach ($secretName in $secrets.Keys) {
    try {
        $existing = aws secretsmanager describe-secret --secret-id $secretName --region $region 2>$null
        if ($existing) {
            Write-Host "  ✓ Secret already exists: $secretName" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Creating secret: $secretName" -ForegroundColor Gray
        aws secretsmanager create-secret --name $secretName --secret-string $secrets[$secretName] --region $region | Out-Null
        Write-Host "  ✓ Created: $secretName" -ForegroundColor Green
    }
}

# Create IAM roles
Write-Host "`n[6/10] Creating IAM roles..." -ForegroundColor Yellow

# ECS Task Execution Role
Write-Host "  Creating ecsTaskExecutionRole..." -ForegroundColor Gray
try {
    $role = aws iam get-role --role-name ecsTaskExecutionRole 2>$null
    Write-Host "  ✓ Role already exists: ecsTaskExecutionRole" -ForegroundColor Gray
} catch {
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    $trustPolicy | Out-File -FilePath "trust-policy-exec.json" -Encoding utf8 -NoNewline
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy-exec.json | Out-Null
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy | Out-Null
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
    Remove-Item "trust-policy-exec.json" -Force
    Write-Host "  ✓ Created: ecsTaskExecutionRole" -ForegroundColor Green
}

# ECS Task Role
Write-Host "  Creating ecsTaskRole..." -ForegroundColor Gray
try {
    $role = aws iam get-role --role-name ecsTaskRole 2>$null
    Write-Host "  ✓ Role already exists: ecsTaskRole" -ForegroundColor Gray
} catch {
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    $trustPolicy | Out-File -FilePath "trust-policy-task.json" -Encoding utf8 -NoNewline
    aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy-task.json | Out-Null
    aws iam attach-role-policy --role-name ecsTaskRole --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite | Out-Null
    Remove-Item "trust-policy-task.json" -Force
    Write-Host "  ✓ Created: ecsTaskRole" -ForegroundColor Green
}

# GitHub Actions Role
Write-Host "  Creating github-actions-mealstack role..." -ForegroundColor Gray
try {
    $role = aws iam get-role --role-name github-actions-mealstack 2>$null
    Write-Host "  ✓ Role already exists: github-actions-mealstack" -ForegroundColor Gray
} catch {
    # First create OIDC provider if not exists
    try {
        aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com" 2>$null | Out-Null
    } catch {
        Write-Host "  Creating GitHub OIDC provider..." -ForegroundColor Gray
        aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" --client-id-list "sts.amazonaws.com" | Out-Null
    }
    
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${githubUsername}/MealStack_Platform:*"
        }
      }
    }
  ]
}
"@
    $trustPolicy | Out-File -FilePath "trust-policy-github.json" -Encoding utf8 -NoNewline
    aws iam create-role --role-name github-actions-mealstack --assume-role-policy-document file://trust-policy-github.json | Out-Null
    aws iam attach-role-policy --role-name github-actions-mealstack --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser | Out-Null
    aws iam attach-role-policy --role-name github-actions-mealstack --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess | Out-Null
    Remove-Item "trust-policy-github.json" -Force
    Write-Host "  ✓ Created: github-actions-mealstack" -ForegroundColor Green
}

# Create ECS Cluster
Write-Host "`n[7/10] Creating ECS cluster..." -ForegroundColor Yellow
try {
    $cluster = aws ecs describe-clusters --clusters mealstack-cluster --region $region 2>$null | ConvertFrom-Json
    if ($cluster.clusters[0].status -eq "ACTIVE") {
        Write-Host "  ✓ Cluster already exists: mealstack-cluster" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Creating cluster: mealstack-cluster" -ForegroundColor Gray
    aws ecs create-cluster --cluster-name mealstack-cluster --region $region | Out-Null
    Write-Host "  ✓ Created: mealstack-cluster" -ForegroundColor Green
}

# Update task definition files
Write-Host "`n[8/10] Updating task definition files..." -ForegroundColor Yellow
$taskDefDir = "infra\aws\task-definitions"
if (Test-Path $taskDefDir) {
    Get-ChildItem $taskDefDir -Filter "*.json" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $updated = $content -replace "ACCOUNT_ID", $accountId
        $updated | Out-File -FilePath $_.FullName -Encoding utf8 -NoNewline
        Write-Host "  ✓ Updated: $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ Task definition directory not found: $taskDefDir" -ForegroundColor Yellow
}

# Register task definitions
Write-Host "`n[9/10] Registering task definitions..." -ForegroundColor Yellow
foreach ($service in $services) {
    $taskDefFile = "infra\aws\task-definitions\$service-task-definition.json"
    if (Test-Path $taskDefFile) {
        Write-Host "  Registering task definition: $service" -ForegroundColor Gray
        aws ecs register-task-definition --cli-input-json file://$taskDefFile --region $region | Out-Null
        Write-Host "  ✓ Registered: $service" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Task definition not found: $taskDefFile" -ForegroundColor Yellow
    }
}

# Display GitHub secrets
Write-Host "`n[10/10] GitHub Secrets Configuration" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Add these secrets to your GitHub repository:" -ForegroundColor White
Write-Host "  Repository: https://github.com/$githubUsername/MealStack_Platform/settings/secrets/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "Secret Name: AWS_ROLE_TO_ASSUME" -ForegroundColor Yellow
Write-Host "Value: arn:aws:iam::${accountId}:role/github-actions-mealstack" -ForegroundColor White
Write-Host ""
Write-Host "Secret Name: AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "Value: $accountId" -ForegroundColor White
Write-Host ""
Write-Host "Secret Name: AWS_REGION" -ForegroundColor Yellow
Write-Host "Value: $region" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✓ AWS Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "What was created:" -ForegroundColor Cyan
Write-Host "  ✓ 5 ECR repositories (Docker image storage)" -ForegroundColor White
Write-Host "  ✓ 8 Secrets Manager secrets (environment variables)" -ForegroundColor White
Write-Host "  ✓ 3 IAM roles (permissions)" -ForegroundColor White
Write-Host "  ✓ 1 ECS cluster (container orchestration)" -ForegroundColor White
Write-Host "  ✓ 5 Task definitions (container configs)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Add the GitHub secrets shown above" -ForegroundColor White
Write-Host "  2. Build and push Docker images:" -ForegroundColor White
Write-Host "     Run: .\scripts\build-and-push.ps1" -ForegroundColor Yellow
Write-Host "  3. Create ECS services (one for each microservice)" -ForegroundColor White
Write-Host "  4. Or push to GitHub and let GitHub Actions deploy automatically" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  AWS_BEGINNER_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Need help? Run: Get-Help .\scripts\aws-setup-helper.ps1 -Detailed" -ForegroundColor Gray
Write-Host ""
