# 🚀 Quick Action: Configure Stripe Webhook (3 minutes)

## ✅ What's Fixed

1. **Payment redirect pages added** - Customers now see proper success/cancel pages
2. **URLs updated** - Checkout URLs point to AWS ALB instead of localhost  
3. **Deployed to production** - Payment service running with latest code (payment:5)

## ❌ What's Missing

**Stripe webhook is NOT configured** - This is why your orders stay in `PENDING_PAYMENT`.

Stripe doesn't know where to send payment confirmations, so your order service never gets notified.

---

## 🎯 3-Step Fix (Do This Now)

### Step 1: Add Webhook in Stripe (2 minutes)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter this URL:
   ```
   http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/webhook
   ```
4. Select event: `checkout.session.completed`
5. Click **"Add endpoint"**
6. **COPY the signing secret** (looks like `whsec_abc123...`)

### Step 2: Update Secret in AWS (30 seconds)

Run this command with YOUR actual signing secret:

```powershell
aws secretsmanager put-secret-value `
  --secret-id mealstack/payment/STRIPE_WEBHOOK_SECRET `
  --secret-string "whsec_YOUR_ACTUAL_SECRET_HERE" `
  --region ap-south-1
```

### Step 3: Restart Payment Service (30 seconds)

```powershell
aws ecs update-service `
  --cluster mealstack-cluster `
  --service payment-service `
  --force-new-deployment `
  --region ap-south-1
```

Wait 2 minutes for restart, then test!

---

## ✅ Test It Works

### Quick Test: Send Test Webhook from Stripe

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select: `checkout.session.completed`
4. Should show ✅ **Success (200 OK)**

### Real Test: Place an Order

1. Place order via your app
2. Pay with test card: `4242 4242 4242 4242`
3. Check order status:

```powershell
# Replace ORDER_ID and JWT_TOKEN
Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders/ORDER_ID" `
  -Headers @{ "Authorization" = "Bearer JWT_TOKEN" } | ConvertFrom-Json | Select status
```

Should show: **`PAID`** (not `PENDING_PAYMENT`)

---

## 📚 Full Guide

See [STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md) for complete details, troubleshooting, and production checklist.

---

## 🔍 Why This Was Needed

**Before:**
- Checkout URLs pointed to `localhost:8080` ❌
- No webhook configured in Stripe ❌
- Payments succeeded but orders stayed pending ❌

**After (with webhook configured):**
- Checkout URLs point to AWS ALB ✅
- Stripe sends webhook to AWS ✅
- Orders automatically marked PAID ✅
- Delivery jobs created for riders ✅

---

**Do the 3 steps above now, then test your order flow!**
