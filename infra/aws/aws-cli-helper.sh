#!/bin/bash

# MealStack Platform - AWS Deployment Quick Reference
# This script provides common AWS CLI commands for managing the deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="mealstack-cluster"
REGION="us-east-1"
ACCOUNT_ID="${AWS_ACCOUNT_ID}"

echo -e "${YELLOW}MealStack Platform - AWS CLI Helper${NC}\n"

# Function to check prerequisites
check_prerequisites() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed${NC}"
        exit 1
    fi
    
    if [ -z "$ACCOUNT_ID" ]; then
        echo -e "${RED}AWS_ACCOUNT_ID environment variable not set${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites checked${NC}\n"
}

# Function to get ALB DNS
get_alb_dns() {
    echo -e "${YELLOW}Getting ALB DNS...${NC}"
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name $CLUSTER_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ALBDnsName`].OutputValue' \
        --output text)
    echo -e "${GREEN}ALB DNS: $ALB_DNS${NC}\n"
}

# Function to check service health
check_health() {
    local service=$1
    local port=$2
    
    if [ -z "$ALB_DNS" ]; then
        get_alb_dns
    fi
    
    echo -e "${YELLOW}Checking health for $service...${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" http://$ALB_DNS/$service/health)
    if [ $response -eq 200 ]; then
        echo -e "${GREEN}✓ $service is healthy${NC}\n"
    else
        echo -e "${RED}✗ $service returned HTTP $response${NC}\n"
    fi
}

# Function to check all services
check_all_services() {
    echo -e "${YELLOW}Checking all service health...${NC}\n"
    
    local services=("auth" "restaurant" "order" "payment" "rider")
    for service in "${services[@]}"; do
        check_health $service
    done
}

# Function to view ECS service status
view_ecs_status() {
    echo -e "${YELLOW}ECS Cluster Status:${NC}\n"
    
    aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services auth-service restaurant-service order-service payment-service rider-service \
        --region $REGION \
        --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' \
        --output table
}

# Function to view logs
view_logs() {
    local service=$1
    
    echo -e "${YELLOW}Showing logs for $service (last 100 lines)...${NC}\n"
    
    aws logs tail /ecs/$CLUSTER_NAME \
        --region $REGION \
        --follow \
        --log-stream-name-pattern $service \
        | head -n 100
}

# Function to scale service
scale_service() {
    local service=$1
    local count=$2
    
    echo -e "${YELLOW}Scaling $service to $count tasks...${NC}"
    
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service ${service}-service \
        --desired-count $count \
        --region $REGION
    
    echo -e "${GREEN}✓ Scaled $service to $count tasks${NC}\n"
}

# Function to restart service
restart_service() {
    local service=$1
    
    echo -e "${YELLOW}Restarting $service...${NC}"
    
    # Get current desired count
    local desired_count=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services ${service}-service \
        --region $REGION \
        --query 'services[0].desiredCount' \
        --output text)
    
    # Force new deployment
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service ${service}-service \
        --force-new-deployment \
        --region $REGION
    
    echo -e "${GREEN}✓ $service restarted${NC}\n"
}

# Function to update ECR lifecycle policy
update_ecr_lifecycle() {
    echo -e "${YELLOW}Updating ECR lifecycle policy...${NC}"
    
    aws ecr put-lifecycle-policy \
        --repository-name $CLUSTER_NAME \
        --lifecycle-policy-text file://infra/aws/ecr-lifecycle-policy.json \
        --region $REGION
    
    echo -e "${GREEN}✓ ECR lifecycle policy updated${NC}\n"
}

# Function to export metrics
export_metrics() {
    local service=$1
    local days=${2:-7}
    
    echo -e "${YELLOW}Exporting CPU metrics for $service (last $days days)...${NC}\n"
    
    aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name CPUUtilization \
        --dimensions Name=ServiceName,Value=${service}-service Name=ClusterName,Value=$CLUSTER_NAME \
        --start-time $(date -u -d "$days days ago" +"%Y-%m-%dT%H:%M:%S") \
        --end-time $(date -u +"%Y-%m-%dT%H:%M:%S") \
        --period 3600 \
        --statistics Average Maximum \
        --region $REGION \
        --output table
}

# Function to show deployment history
show_deployment_history() {
    local service=$1
    
    echo -e "${YELLOW}Deployment history for $service:${NC}\n"
    
    aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services ${service}-service \
        --region $REGION \
        --query 'services[0].deployments' \
        --output table
}

# Main menu
show_menu() {
    echo "Select an option:"
    echo "1. Check all services health"
    echo "2. View ECS cluster status"
    echo "3. View service logs"
    echo "4. Scale service"
    echo "5. Restart service"
    echo "6. Update ECR lifecycle policy"
    echo "7. Export CloudWatch metrics"
    echo "8. Show deployment history"
    echo "9. Get ALB DNS address"
    echo "0. Exit"
}

# Main script logic
main() {
    check_prerequisites
    
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Enter option [0-9]: " option
            
            case $option in
                1)
                    check_all_services
                    ;;
                2)
                    view_ecs_status
                    ;;
                3)
                    read -p "Enter service name (auth/restaurant/order/payment/rider): " service
                    view_logs $service
                    ;;
                4)
                    read -p "Enter service name: " service
                    read -p "Enter desired count: " count
                    scale_service $service $count
                    ;;
                5)
                    read -p "Enter service name: " service
                    restart_service $service
                    ;;
                6)
                    update_ecr_lifecycle
                    ;;
                7)
                    read -p "Enter service name: " service
                    read -p "Enter days back [default: 7]: " days
                    export_metrics $service ${days:-7}
                    ;;
                8)
                    read -p "Enter service name: " service
                    show_deployment_history $service
                    ;;
                9)
                    get_alb_dns
                    ;;
                0)
                    echo "Exiting..."
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Invalid option${NC}"
                    ;;
            esac
            
            read -p "Press Enter to continue..."
        done
    else
        # Command mode
        case $1 in
            health)
                check_all_services
                ;;
            status)
                view_ecs_status
                ;;
            logs)
                view_logs ${2:-auth}
                ;;
            scale)
                if [ -z "$2" ] || [ -z "$3" ]; then
                    echo "Usage: $0 scale <service> <count>"
                    exit 1
                fi
                scale_service $2 $3
                ;;
            restart)
                restart_service ${2:-auth}
                ;;
            alb-dns)
                get_alb_dns
                ;;
            *)
                echo "Usage: $0 {health|status|logs|scale|restart|alb-dns}"
                echo "  or run without arguments for interactive mode"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
