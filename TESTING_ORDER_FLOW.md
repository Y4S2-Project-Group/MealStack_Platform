# 🧪 Testing Complete Order Flow

## ✅ Setup Complete

1. ✅ Payment service deployed with success/cancel pages
2. ✅ Webhook secret updated in AWS Secrets Manager
3. ✅ Payment service restarted (task created at 23:52:33)
4. ✅ Stripe webhook configured: `we_1TSLfrCxwlgoDHzPOKKZDZJA`

**Webhook URL:** `https://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/webhook`  
**Signing Secret:** `whsec_ndpLajKJHEv5wzSVpmvt5gtTOFIimj3h` (stored in AWS)

---

## 🧪 Test 1: Verify Webhook Endpoint

### In Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks/we_1TSLfrCxwlgoDHzPOKKZDZJA
2. Click **"Send test webhook"**
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**

**Expected Result:** ✅ Status 200 - Webhook accepted

### Monitor Logs (Optional)

Open another terminal and run:

```powershell
aws logs tail /ecs/mealstack-cluster --follow --filter-pattern "webhook" --region ap-south-1
```

You should see log entries when webhook fires.

---

## 🧪 Test 2: Complete Order Flow (End-to-End)

### Prerequisites

You need:
- JWT token for customer account
- Restaurant ID with menu items
- Stripe test card: `4242 4242 4242 4242`

### Step 1: Login as Customer

```powershell
$loginResponse = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"customer@test.com","password":"password123"}' `
  -UseBasicParsing | ConvertFrom-Json

$customerToken = $loginResponse.token
Write-Host "Customer Token: $customerToken"
```

### Step 2: Create Order

```powershell
$orderBody = @{
  restaurantId = "YOUR_RESTAURANT_ID"
  items = @(
    @{
      itemId = "MENU_ITEM_ID"
      name = "Test Burger"
      quantity = 1
      price = 12.99
    }
  )
  deliveryAddress = @{
    street = "123 Test St"
    city = "Colombo"
    postalCode = "00100"
  }
  specialInstructions = "Test order - please ignore"
} | ConvertTo-Json -Depth 10

$orderResponse = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $customerToken" } `
  -Body $orderBody `
  -UseBasicParsing | ConvertFrom-Json

$orderId = $orderResponse._id
Write-Host "Order Created: $orderId"
Write-Host "Status: $($orderResponse.status)" # Should be PENDING_PAYMENT
```

### Step 3: Create Checkout Session

```powershell
$checkoutResponse = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/checkout-session" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $customerToken" } `
  -Body (@{ orderId = $orderId } | ConvertTo-Json) `
  -UseBasicParsing | ConvertFrom-Json

$checkoutUrl = $checkoutResponse.url
Write-Host "Checkout URL: $checkoutUrl"
Write-Host "`nOpen this URL in your browser to complete payment"
Start-Process $checkoutUrl
```

### Step 4: Complete Payment in Browser

1. Browser opens to Stripe Checkout
2. Enter test card: `4242 4242 4242 4242`
3. Expiry: Any future date (e.g., `12/30`)
4. CVC: Any 3 digits (e.g., `123`)
5. Click **"Pay"**

**Expected:** Redirected to success page at:
```
http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/payments/success
```

### Step 5: Verify Order Status Changed

Wait 5 seconds for webhook processing, then check:

```powershell
Start-Sleep -Seconds 5

$orderCheck = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/orders/$orderId" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $customerToken" } `
  -UseBasicParsing | ConvertFrom-Json

Write-Host "`nOrder Status: $($orderCheck.status)" # Should be PAID
Write-Host "Payment Confirmed: $($orderCheck.paymentConfirmed)"
```

**Expected:** `status: "PAID"`, `paymentConfirmed: true`

### Step 6: Verify Delivery Job Created

Login as rider:

```powershell
$riderLoginResponse = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"rider@test.com","password":"password123"}' `
  -UseBasicParsing | ConvertFrom-Json

$riderToken = $riderLoginResponse.token

$availableDeliveries = Invoke-WebRequest -Uri "http://mealstack-alb-1222463843.ap-south-1.elb.amazonaws.com/deliveries/available" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $riderToken" } `
  -UseBasicParsing | ConvertFrom-Json

Write-Host "`nAvailable Deliveries:"
$availableDeliveries | ForEach-Object {
  Write-Host "  - Delivery ID: $($_.id)"
  Write-Host "    Order ID: $($_.orderId)"
  Write-Host "    Status: $($_.status)" # Should be AVAILABLE
  Write-Host "    Pickup: $($_.pickupAddress)"
  Write-Host ""
}
```

**Expected:** Your order appears with `status: "AVAILABLE"`

---

## ✅ Success Criteria

After completing all steps:

1. ✅ Order created with status `PENDING_PAYMENT`
2. ✅ Checkout session created, customer redirected to Stripe
3. ✅ Payment completed successfully
4. ✅ Customer redirected to `/payments/success` page
5. ✅ **Webhook fired and processed** (check Stripe dashboard or logs)
6. ✅ Order status changed to `PAID`
7. ✅ Delivery job created with status `AVAILABLE`
8. ✅ Rider can see delivery in available list

---

## 🐛 Troubleshooting

### Order Stays PENDING_PAYMENT

**Check webhook in Stripe:**
1. Go to: https://dashboard.stripe.com/test/webhooks/we_1TSLfrCxwlgoDHzPOKKZDZJA
2. Click **"Events"** tab
3. Look for recent `checkout.session.completed` events
4. Check response code (should be 200)

**If webhook shows error:**
- 401 Unauthorized → Signing secret mismatch, re-run secret update command
- 500 Server Error → Check CloudWatch logs for errors
- No events showing → Webhook not triggered, verify checkout session completed

**Check CloudWatch Logs:**

```powershell
aws logs filter-log-events `
  --log-group-name /ecs/mealstack-cluster `
  --filter-pattern "webhook" `
  --start-time $([DateTimeOffset]::UtcNow.AddMinutes(-15).ToUnixTimeMilliseconds()) `
  --region ap-south-1 `
  --query 'events[*].message' `
  --output text
```

Look for:
- `"Received Stripe webhook"` - Webhook received
- `"Payment confirmed for order"` - Payment processed
- Any error messages

### No Delivery Job Created

**Verify rider service is running:**

```powershell
aws ecs describe-services `
  --cluster mealstack-cluster `
  --services rider-service `
  --region ap-south-1 `
  --query 'services[0].{running:runningCount,desired:desiredCount}'
```

**Check order service logs:**

```powershell
aws logs filter-log-events `
  --log-group-name /ecs/mealstack-cluster `
  --filter-pattern "delivery" `
  --start-time $([DateTimeOffset]::UtcNow.AddMinutes(-15).ToUnixTimeMilliseconds()) `
  --region ap-south-1 `
  --query 'events[*].message' `
  --output text
```

### Rider Can't See Delivery

**Verify rider is logged in correctly:**
- Check JWT token is valid
- Verify rider role in token

**Check delivery was created:**

```powershell
aws logs filter-log-events `
  --log-group-name /ecs/mealstack-cluster `
  --filter-pattern "Delivery created" `
  --start-time $([DateTimeOffset]::UtcNow.AddMinutes(-15).ToUnixTimeMilliseconds()) `
  --region ap-south-1 `
  --query 'events[*].message' `
  --output text
```

---

## 📊 Monitor Complete Flow

Run this to monitor all services during testing:

```powershell
aws logs tail /ecs/mealstack-cluster --follow --format short --region ap-south-1
```

You'll see:
1. Order created log (order service)
2. Checkout session created (payment service)
3. Webhook received (payment service)
4. Payment confirmed (order service)
5. Delivery created (rider service)

---

## 🎯 Quick Smoke Test

If you just want to verify webhook works without full order flow:

1. Send test webhook from Stripe dashboard
2. Check it returns 200 OK
3. Done! ✅

For production readiness, run the full end-to-end test above.

---

**Last Updated:** May 1, 2026  
**MealStack Platform** - Order Flow Testing Guide
