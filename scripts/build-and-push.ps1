# Build and Push Docker Images to AWS ECR
# This script builds all microservice images and pushes them to Amazon ECR

param(
    [string]$Region = "us-east-1",
    [string[]]$Services = @("auth", "restaurant", "order", "payment", "rider")
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build & Push to AWS ECR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker is running
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Get AWS account ID
Write-Host "`n[2/4] Getting AWS account information..." -ForegroundColor Yellow
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    Write-Host "✓ AWS Account ID: $accountId" -ForegroundColor Green
    Write-Host "✓ Region: $Region" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    Write-Host "  Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Login to ECR
Write-Host "`n[3/4] Logging in to Amazon ECR..." -ForegroundColor Yellow
try {
    $loginCmd = aws ecr get-login-password --region $Region
    $loginCmd | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$Region.amazonaws.com" 2>&1 | Out-Null
    Write-Host "✓ Logged in to ECR" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to login to ECR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Build and push each service
Write-Host "`n[4/4] Building and pushing Docker images..." -ForegroundColor Yellow
$successful = @()
$failed = @()

foreach ($service in $Services) {
    $serviceName = "mealstack-$service"
    $imageName = "$accountId.dkr.ecr.$Region.amazonaws.com/$serviceName"
    
    Write-Host "`n----------------------------------------" -ForegroundColor Cyan
    Write-Host "Building: $service" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Build image
    Write-Host "  [1/3] Building Docker image..." -ForegroundColor Gray
    $buildResult = docker build -t $serviceName -f "services\$service\Dockerfile" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Build failed for $service" -ForegroundColor Red
        $failed += $service
        continue
    }
    Write-Host "  ✓ Built: $serviceName" -ForegroundColor Green
    
    # Tag for ECR
    Write-Host "  [2/3] Tagging image..." -ForegroundColor Gray
    docker tag "${serviceName}:latest" "${imageName}:latest"
    docker tag "${serviceName}:latest" "${imageName}:$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "  ✓ Tagged: $imageName" -ForegroundColor Green
    
    # Push to ECR
    Write-Host "  [3/3] Pushing to ECR (this may take a few minutes)..." -ForegroundColor Gray
    docker push "${imageName}:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Push failed for $service" -ForegroundColor Red
        $failed += $service
        continue
    }
    
    Write-Host "  ✓ Pushed: ${imageName}:latest" -ForegroundColor Green
    $successful += $service
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build & Push Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($successful.Count -gt 0) {
    Write-Host "`n✓ Successful ($($successful.Count)):" -ForegroundColor Green
    foreach ($service in $successful) {
        Write-Host "  • $service" -ForegroundColor White
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`n✗ Failed ($($failed.Count)):" -ForegroundColor Red
    foreach ($service in $failed) {
        Write-Host "  • $service" -ForegroundColor White
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify images in ECR:" -ForegroundColor White
Write-Host "     https://console.aws.amazon.com/ecr/repositories" -ForegroundColor Gray
Write-Host "  2. Create ECS services to run these images" -ForegroundColor White
Write-Host "  3. Or let GitHub Actions handle deployment" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# View images in ECR
Write-Host "ECR Repository URIs:" -ForegroundColor Cyan
foreach ($service in $successful) {
    Write-Host "  $service: $accountId.dkr.ecr.$Region.amazonaws.com/mealstack-$service:latest" -ForegroundColor Gray
}
Write-Host ""
