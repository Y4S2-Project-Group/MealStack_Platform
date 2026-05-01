# Stripe Webhook Configuration Guide for MealStack

## Current Status

✅ Payment service is running on AWS  
✅ Stripe checkout sessions are being created  
✅ Webhook endpoint is publicly accessible  
❌ **Stripe webhook not configured** ← This is why orders stay in PENDING_PAYMENT

## The Problem

When a customer pays on Stripe:
1. ✅ Payment completes successfully on Stripe
2. ❌ Stripe tries to send webhook event but doesn't know where to send it
3. ❌ Payment service never receives confirmation
4. ❌ Order stays in `PENDING_PAYMENT` status
5. ❌ Delivery job is never created
6. ❌ Rider never sees the order

## The Solution: Configure Stripe Webhook

### Step 1: Go to Stripe Dashboard

1. Login to your Stripe account: https://dashboard.stripe.com/
2. Make sure you're in **Test Mode** (toggle in top right)
3. Go to **Developers** → **Webhooks**

### Step 2: Add Endpoint

Click **"Add endpoint"** and enter:

**Endpoint URL:**
```
http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/webhook
```

**Events to listen for:**
Select: `checkout.session.completed`

This is the only event we need - it fires when a customer successfully completes payment.

**Description (optional):**
```
MealStack Production Payment Confirmations
```

Click **"Add endpoint"**

### Step 3: Get Webhook Signing Secret

After creating the endpoint, you'll see a **Signing secret** that looks like:
```
whsec_abcd1234efgh5678ijkl9012mnop3456
```

**IMPORTANT:** Copy this secret - you'll need it in the next step.

### Step 4: Update AWS Secret

Run this command to update the webhook secret in AWS Secrets Manager:

```powershell
aws secretsmanager put-secret-value `
  --secret-id mealstack/payment/STRIPE_WEBHOOK_SECRET `
  --secret-string "whsec_YOUR_ACTUAL_SECRET_HERE" `
  --region ap-south-1
```

Replace `whsec_YOUR_ACTUAL_SECRET_HERE` with the actual signing secret from Stripe.

### Step 5: Restart Payment Service

Force a new deployment to pick up the updated secret:

```powershell
aws ecs update-service `
  --cluster mealstack-cluster `
  --service payment-service `
  --force-new-deployment `
  --region ap-south-1
```

Wait for the new task to start (about 2-3 minutes).

### Step 6: Test the Webhook

#### Option A: Test in Stripe Dashboard

1. Go back to **Developers** → **Webhooks**
2. Click on your endpoint
3. Click **"Send test webhook"**
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**

You should see a ✅ **Success** response.

#### Option B: Make a Real Test Payment

1. Open your app frontend (or use Postman to call order API)
2. Place an order
3. Complete payment with test card: `4242 4242 4242 4242`
4. After payment, check order status:

```powershell
# Replace ORDER_ID and JWT_TOKEN with actual values
curl http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders/ORDER_ID `
  -H "Authorization: Bearer JWT_TOKEN"
```

The order status should now be `PAID` (not `PENDING_PAYMENT`).

### Step 7: Verify Delivery Job Created

Check if a delivery job was created for the rider:

```powershell
# Login as rider and get JWT token first
# Then call:
curl http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/deliveries/available `
  -H "Authorization: Bearer RIDER_JWT_TOKEN"
```

You should see the delivery in the response!

---

## Monitoring Webhooks

### View Webhook Events in Stripe

1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. See all events sent and their responses

### View Logs in CloudWatch

```powershell
# See webhook events
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "webhook" --region ap-south-1

# See payment confirmations
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "Payment confirmed" --region ap-south-1
```

---

## Troubleshooting

### Webhook Returns 401 Unauthorized

**Problem:** Signing secret is incorrect or not updated.

**Solution:**
1. Verify you copied the correct signing secret from Stripe
2. Update the secret in AWS Secrets Manager (Step 4 above)
3. Restart the payment service (Step 5 above)

### Webhook Returns 500 Error

**Problem:** Payment service is crashing or can't reach Order service.

**Solution:**
1. Check CloudWatch logs:
   ```powershell
   aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "ERROR" --region ap-south-1
   ```
2. Verify ORDER_SERVICE_URL is correct in payment task definition
3. Verify INTERNAL_API_KEY matches between services

### Order Still Shows PENDING_PAYMENT

**Problem:** Webhook event not being sent or failing.

**Solution:**
1. Check Stripe Dashboard → Webhooks → Your endpoint → Recent deliveries
2. Look for `checkout.session.completed` events
3. Check response codes (should be 200)
4. If no events showing up, verify endpoint URL is correct

### Rider Can't See Delivery

**Problem:** Delivery job creation failed.

**Solution:**
1. Check order was marked as PAID first
2. Check CloudWatch logs for "Rider job creation failed"
3. Verify Rider service is running:
   ```powershell
   aws ecs describe-services --cluster mealstack-cluster --services rider-service --region ap-south-1
   ```

---

## What Changed in Latest Deployment

### 1. Added Success/Cancel Pages

After payment, customers are now redirected to:
- Success: `http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/success`
- Cancel: `http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/cancel`

These show simple HTML pages explaining what happened.

### 2. Updated Task Definition

Checkout URLs now point to ALB instead of localhost, so they work in production.

---

## Complete Order Flow (After Configuration)

```
1. Customer places order
   → POST /orders
   → Order created (status: PENDING_PAYMENT)

2. Order Service calls Payment Service
   → POST /payments/checkout-session
   → Stripe checkout session created
   → Customer redirected to Stripe

3. Customer pays on Stripe
   → Stripe processes payment
   → Payment successful ✅

4. Stripe sends webhook
   → POST /payments/webhook (to AWS ALB)
   → Payment Service receives event
   → Verifies signature with STRIPE_WEBHOOK_SECRET
   → Calls Order Service: POST /orders/:id/payment/confirmed

5. Order Service processes confirmation
   → Updates order status to PAID
   → Calls Rider Service: POST /deliveries
   → Delivery job created (status: AVAILABLE)

6. Rider sees delivery
   → GET /deliveries/available
   → Delivery appears in rider dashboard
   → Rider can accept and deliver
```

---

## Production Checklist

Before going live with real payments:

- [ ] Switch Stripe to **Live Mode** (not Test Mode)
- [ ] Create webhook endpoint for live mode
- [ ] Update `STRIPE_SECRET_KEY` secret with live key
- [ ] Update `STRIPE_WEBHOOK_SECRET` secret with live webhook secret
- [ ] Deploy frontend to a real domain (Vercel/Netlify/S3)
- [ ] Update `CHECKOUT_SUCCESS_URL` to point to frontend success page
- [ ] Update `CHECKOUT_CANCEL_URL` to point to frontend cancel page
- [ ] Test with small real payment
- [ ] Monitor CloudWatch logs for any issues
- [ ] Set up CloudWatch alarms for webhook failures

---

## Quick Reference

**Webhook URL:**
```
http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/webhook
```

**Event to Listen:**
```
checkout.session.completed
```

**Secret Location:**
```
AWS Secrets Manager
Secret: mealstack/payment/STRIPE_WEBHOOK_SECRET
Region: ap-south-1
```

**Test Card:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

---

## Need Help?

If webhooks still aren't working after configuration:

1. Check recent logs:
   ```powershell
   aws logs tail /ecs/mealstack-cluster --since 30m --region ap-south-1
   ```

2. Test webhook endpoint manually:
   ```powershell
   Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/webhook" -Method POST -Body '{"test":"data"}' -ContentType "application/json"
   ```
   (Should return error about missing Stripe-Signature - that's correct!)

3. Verify all services are running:
   ```powershell
   aws ecs describe-services --cluster mealstack-cluster --services payment-service order-service rider-service --region ap-south-1 --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount}'
   ```

---

**Last Updated:** May 1, 2026  
**MealStack Platform** - Production Payment Configuration
