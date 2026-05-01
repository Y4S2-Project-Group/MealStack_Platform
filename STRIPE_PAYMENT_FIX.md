# Fix Stripe Payment Redirect Issue

## Problem
When customers try to pay for orders using Stripe, after clicking the pay button on Stripe's checkout page, the redirect URLs are pointing to `localhost` which doesn't work for deployed applications.

## Root Cause
The Payment Service's environment variables have localhost URLs:
- `CHECKOUT_SUCCESS_URL=http://localhost:8081/customer/payment/success`
- `CHECKOUT_CANCEL_URL=http://localhost:8081/customer/payment/cancel`

## Solution

### Step 1: Get Your Vercel Frontend URL
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your MealStack project
3. Copy the production URL (e.g., `https://meal-stack-platform.vercel.app` or similar)

### Step 2: Update Payment Service Environment Variables

**Option A: Update Local .env (Already Done)**
The file `services/payment/.env` has been updated with placeholder URLs. Replace `your-vercel-app.vercel.app` with your actual Vercel URL.

```env
# Replace this placeholder with your actual Vercel URL
CHECKOUT_SUCCESS_URL=https://your-actual-vercel-url.vercel.app/customer/payment/success
CHECKOUT_CANCEL_URL=https://your-actual-vercel-url.vercel.app/customer/payment/cancel
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081,https://your-actual-vercel-url.vercel.app
```

**Option B: Update AWS ECS Environment Variables (Required for Production)**

You need to update the environment variables for the Payment Service in AWS ECS:

1. **Go to AWS ECS Console**
   - Navigate to: https://ap-south-1.console.aws.amazon.com/ecs/
   - Select your cluster: `mealstack-cluster`

2. **Update Payment Service Task Definition**
   - Click on "Task definitions" in the left sidebar
   - Find and select: `mealstack-payment-task`
   - Click "Create new revision"
   - Scroll to "Environment variables"
   - Update or add these variables:
     ```
     CHECKOUT_SUCCESS_URL = https://YOUR-VERCEL-URL/customer/payment/success
     CHECKOUT_CANCEL_URL = https://YOUR-VERCEL-URL/customer/payment/cancel
     ORDER_SERVICE_URL = http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com
     ```
   - Click "Create"

3. **Update the Service**
   - Go to "Clusters" → `mealstack-cluster`
   - Click on the `mealstack-payment-service`
   - Click "Update service"
   - Under "Task Definition", select the new revision you just created
   - Check "Force new deployment"
   - Click "Update"

4. **Wait for Deployment**
   - Monitor the "Deployments" tab
   - Wait until the new task is running and the old task is drained
   - This usually takes 2-3 minutes

### Step 3: Test the Payment Flow

1. **Place a test order:**
   - Go to your frontend: `https://your-vercel-url.vercel.app`
   - Login as a customer
   - Add items to cart
   - Go to checkout and place order

2. **On Stripe checkout page:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Click "Pay"

3. **Verify redirect:**
   - After payment, you should be redirected to: `https://your-vercel-url.vercel.app/customer/payment/success?order_id=...`
   - If you cancel, should redirect to: `https://your-vercel-url.vercel.app/customer/payment/cancel`

## Verification Commands

### Check Current Payment Service Logs
```bash
aws logs tail /ecs/mealstack-payment --follow --region ap-south-1
```

### Check Payment Service Environment Variables
```bash
aws ecs describe-task-definition --task-definition mealstack-payment-task --region ap-south-1 | jq '.taskDefinition.containerDefinitions[0].environment'
```

## Additional Configuration (If Needed)

### Update Stripe Dashboard
If you want to add additional security, you can configure allowed redirect domains in Stripe:

1. Go to: https://dashboard.stripe.com/settings/checkout
2. Under "Payment success page", add your Vercel domain
3. Under "Payment cancellation page", add your Vercel domain

## Quick Fix Script (After getting Vercel URL)

Create a file `update-payment-urls.sh`:

```bash
#!/bin/bash

# Replace with your actual Vercel URL
VERCEL_URL="https://your-actual-vercel-url.vercel.app"

# Update .env file
cd services/payment
sed -i "s|https://your-vercel-app.vercel.app|$VERCEL_URL|g" .env
sed -i "s|http://localhost:4003|http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com|g" .env

echo "Updated .env file"
echo "Now deploy the payment service to AWS ECS with the new environment variables"
```

Run with:
```bash
chmod +x update-payment-urls.sh
./update-payment-urls.sh
```

## Common Issues

### Issue 1: Still redirecting to localhost
- **Solution**: Make sure you updated the ECS Task Definition and redeployed the service
- Check the actual running task's environment variables

### Issue 2: CORS errors
- **Solution**: Add your Vercel URL to `CORS_ORIGINS` in all services
- Redeploy all services

### Issue 3: Order created but payment fails
- **Solution**: Check Stripe webhook is properly configured
- Verify `STRIPE_WEBHOOK_SECRET` is correct

## Summary

The issue is **100% fixable** by updating environment variables. You need to:

1. ✅ Get your Vercel URL
2. ✅ Update `services/payment/.env` (already done, just replace placeholder)
3. ✅ Update AWS ECS Task Definition for payment service
4. ✅ Redeploy payment service
5. ✅ Test payment flow

**No Vercel redeployment needed** - the frontend is already correct. Only the backend payment service needs to be updated.
