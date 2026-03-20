# Create ECS Services for MealStack Platform
# This script creates ECS services for all microservices

param(
    [string]$Region = "us-east-1",
    [string]$Cluster = "mealstack-cluster",
    [int]$DesiredCount = 1
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Create ECS Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS account ID
Write-Host "[1/5] Getting AWS information..." -ForegroundColor Yellow
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    Write-Host "✓ AWS Account ID: $accountId" -ForegroundColor Green
    Write-Host "✓ Region: $Region" -ForegroundColor Green
    Write-Host "✓ Cluster: $Cluster" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    exit 1
}

# Get VPC and Subnets
Write-Host "`n[2/5] Getting VPC and subnet information..." -ForegroundColor Yellow
try {
    # Try to get default VPC
    $vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $Region
    
    if ($vpcId -eq "None" -or [string]::IsNullOrWhiteSpace($vpcId)) {
        # If no default VPC, get any VPC
        $vpcId = aws ec2 describe-vpcs --query 'Vpcs[0].VpcId' --output text --region $Region
    }
    
    Write-Host "✓ VPC ID: $vpcId" -ForegroundColor Green
    
    # Get subnets in this VPC
    $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query 'Subnets[0:2].SubnetId' --output text --region $Region
    $subnetArray = $subnets -split "`t"
    Write-Host "✓ Subnets: $($subnetArray -join ', ')" -ForegroundColor Green
    
    if ($subnetArray.Count -lt 1) {
        Write-Host "✗ No subnets found in VPC" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Failed to get VPC/subnet information" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Create security group
Write-Host "`n[3/5] Creating security group..." -ForegroundColor Yellow
$sgName = "mealstack-services-sg"
try {
    # Check if security group already exists
    $existingSg = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" "Name=vpc-id,Values=$vpcId" --query 'SecurityGroups[0].GroupId' --output text --region $Region 2>$null
    
    if ($existingSg -and $existingSg -ne "None") {
        $sgId = $existingSg
        Write-Host "✓ Security group already exists: $sgId" -ForegroundColor Gray
    } else {
        # Create new security group
        $sgId = aws ec2 create-security-group --group-name $sgName --description "Security group for MealStack services" --vpc-id $vpcId --query 'GroupId' --output text --region $Region
        Write-Host "✓ Created security group: $sgId" -ForegroundColor Green
        
        # Add inbound rules for all service ports
        $ports = @(4001, 4002, 4003, 4004, 4005)
        foreach ($port in $ports) {
            aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port $port --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null
        }
        Write-Host "✓ Added inbound rules for ports: $($ports -join ', ')" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed to create security group" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Service definitions
$services = @(
    @{ Name = "auth"; Port = 4001 },
    @{ Name = "restaurant"; Port = 4002 },
    @{ Name = "order"; Port = 4003 },
    @{ Name = "payment"; Port = 4004 },
    @{ Name = "rider"; Port = 4005 }
)

# Create ECS services
Write-Host "`n[4/5] Creating ECS services..." -ForegroundColor Yellow
$successful = @()
$failed = @()
$alreadyExists = @()

foreach ($svc in $services) {
    $serviceName = "$($svc.Name)-service"
    $taskDef = $svc.Name
    
    Write-Host "`n  Creating service: $serviceName" -ForegroundColor Gray
    
    # Check if service already exists
    try {
        $existingService = aws ecs describe-services --cluster $Cluster --services $serviceName --region $Region 2>$null | ConvertFrom-Json
        if ($existingService.services.Count -gt 0 -and $existingService.services[0].status -eq "ACTIVE") {
            Write-Host "  ⚠ Service already exists: $serviceName" -ForegroundColor Yellow
            $alreadyExists += $svc.Name
            continue
        }
    } catch {
        # Service doesn't exist, continue with creation
    }
    
    # Create network configuration
    $networkConfig = @{
        awsvpcConfiguration = @{
            subnets = $subnetArray
            securityGroups = @($sgId)
            assignPublicIp = "ENABLED"
        }
    } | ConvertTo-Json -Compress
    
    # Create service
    try {
        $result = aws ecs create-service `
            --cluster $Cluster `
            --service-name $serviceName `
            --task-definition $taskDef `
            --desired-count $DesiredCount `
            --launch-type FARGATE `
            --network-configuration $networkConfig `
            --region $Region 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Created: $serviceName" -ForegroundColor Green
            $successful += $svc.Name
        } else {
            Write-Host "  ✗ Failed: $serviceName" -ForegroundColor Red
            Write-Host "    $result" -ForegroundColor Red
            $failed += $svc.Name
        }
    } catch {
        Write-Host "  ✗ Failed: $serviceName" -ForegroundColor Red
        Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
        $failed += $svc.Name
    }
    
    Start-Sleep -Seconds 2
}

# Wait for services to start
if ($successful.Count -gt 0) {
    Write-Host "`n[5/5] Waiting for services to start (this may take 2-3 minutes)..." -ForegroundColor Yellow
    Write-Host "  You can monitor progress in AWS Console:" -ForegroundColor Gray
    Write-Host "  https://console.aws.amazon.com/ecs/v2/clusters/$Cluster/services" -ForegroundColor Cyan
    
    Start-Sleep -Seconds 30
    
    # Check service status
    Write-Host "`n  Checking service status..." -ForegroundColor Gray
    foreach ($svc in $services) {
        if ($successful -contains $svc.Name) {
            $serviceName = "$($svc.Name)-service"
            try {
                $service = aws ecs describe-services --cluster $Cluster --services $serviceName --region $Region | ConvertFrom-Json
                $runningCount = $service.services[0].runningCount
                $desiredCount = $service.services[0].desiredCount
                
                if ($runningCount -eq $desiredCount) {
                    Write-Host "  ✓ $serviceName`: $runningCount/$desiredCount tasks running" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠ $serviceName`: $runningCount/$desiredCount tasks running (still starting...)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ⚠ Could not check status of $serviceName" -ForegroundColor Yellow
            }
        }
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Service Creation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($successful.Count -gt 0) {
    Write-Host "`n✓ Successfully created ($($successful.Count)):" -ForegroundColor Green
    foreach ($svc in $successful) {
        Write-Host "  • $svc-service" -ForegroundColor White
    }
}

if ($alreadyExists.Count -gt 0) {
    Write-Host "`n⚠ Already existed ($($alreadyExists.Count)):" -ForegroundColor Yellow
    foreach ($svc in $alreadyExists) {
        Write-Host "  • $svc-service" -ForegroundColor White
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`n✗ Failed ($($failed.Count)):" -ForegroundColor Red
    foreach ($svc in $failed) {
        Write-Host "  • $svc-service" -ForegroundColor White
    }
}

# Get task public IPs
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Getting service endpoints..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

Start-Sleep -Seconds 10

foreach ($svc in $services) {
    if ($successful -contains $svc.Name -or $alreadyExists -contains $svc.Name) {
        $serviceName = "$($svc.Name)-service"
        try {
            # Get task ARN
            $taskArn = aws ecs list-tasks --cluster $Cluster --service-name $serviceName --region $Region --query 'taskArns[0]' --output text
            
            if ($taskArn -and $taskArn -ne "None") {
                # Get ENI ID
                $task = aws ecs describe-tasks --cluster $Cluster --tasks $taskArn --region $Region | ConvertFrom-Json
                $eniId = $task.tasks[0].attachments[0].details | Where-Object { $_.name -eq "networkInterfaceId" } | Select-Object -ExpandProperty value
                
                if ($eniId) {
                    # Get public IP
                    $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --region $Region --query 'NetworkInterfaces[0].Association.PublicIp' --output text
                    
                    if ($publicIp -and $publicIp -ne "None") {
                        Write-Host "`n$($svc.Name) service:" -ForegroundColor Cyan
                        Write-Host "  URL: http://${publicIp}:$($svc.Port)" -ForegroundColor White
                        Write-Host "  Health: http://${publicIp}:$($svc.Port)/health" -ForegroundColor Gray
                        Write-Host "  API Docs: http://${publicIp}:$($svc.Port)/api-docs" -ForegroundColor Gray
                    }
                }
            } else {
                Write-Host "`n$($svc.Name) service: Task not running yet" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "`n$($svc.Name) service: Could not get endpoint (may still be starting)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test health endpoints above" -ForegroundColor White
Write-Host "  2. View services in AWS Console:" -ForegroundColor White
Write-Host "     https://console.aws.amazon.com/ecs/v2/clusters/$Cluster/services" -ForegroundColor Gray
Write-Host "  3. Check CloudWatch Logs for any issues:" -ForegroundColor White
Write-Host "     https://console.aws.amazon.com/cloudwatch/home?region=$Region#logsV2:log-groups" -ForegroundColor Gray
Write-Host "  4. (Optional) Create Application Load Balancer for production" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
