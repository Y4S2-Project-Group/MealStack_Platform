# Order Flow Changes - Restaurant Approval Workflow

## 🎯 Overview

The order flow has been updated to require **restaurant approval** before rider assignment. This gives restaurants control over which orders they can fulfill.

---

## 📋 New Order Flow

### Old Flow (Automatic)
```
Customer pays → Order PAID → Rider automatically assigned → Restaurant prepares → Delivered
```

### New Flow (Manual Approval)
```
1. Customer pays 
   └─> Order status: PAID

2. Restaurant reviews order
   ├─> ACCEPT → Order status: RESTAURANT_ACCEPTED
   └─> REJECT → Order status: RESTAURANT_REJECTED (end)

3. Restaurant clicks "Proceed & Assign Rider"
   └─> Delivery job created
   └─> Order status: ASSIGNED_TO_RIDER

4. Restaurant marks "Ready for Pickup"
   └─> Order status: READY_FOR_PICKUP

5. Rider picks up
   └─> Order status: PICKED_UP

6. Rider delivers
   └─> Order status: DELIVERED
```

---

## 🔄 Order Statuses

### New Statuses Added:
- **RESTAURANT_ACCEPTED** - Restaurant accepted the order
- **RESTAURANT_REJECTED** - Restaurant rejected the order

### Complete Status List:
1. `CREATED` - Initial state
2. `PENDING_PAYMENT` - Awaiting customer payment
3. `PAID` - Payment successful, awaiting restaurant action
4. `RESTAURANT_ACCEPTED` - Restaurant accepted, ready to proceed
5. `RESTAURANT_REJECTED` - Restaurant rejected (terminal state)
6. `ASSIGNED_TO_RIDER` - Delivery job created, rider can accept
7. `READY_FOR_PICKUP` - Restaurant finished preparing
8. `PICKED_UP` - Rider collected the order
9. `DELIVERED` - Order delivered to customer

---

## 🔧 Backend Changes

### Order Model Updates

**New Fields:**
```javascript
restaurant: {
  acceptedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}
```

### New API Endpoints

#### 1. Accept Order
```http
POST /orders/:id/restaurant/accept
Authorization: Bearer <JWT_TOKEN>
Role: restaurantAdmin

Response: { order: Order }
```

**Behavior:**
- Changes order status from `PAID` → `RESTAURANT_ACCEPTED`
- Sets `restaurant.acceptedAt` timestamp

---

#### 2. Reject Order
```http
POST /orders/:id/restaurant/reject
Authorization: Bearer <JWT_TOKEN>
Role: restaurantAdmin

Body: {
  "reason": "Out of ingredients"  // optional
}

Response: { order: Order }
```

**Behavior:**
- Changes order status from `PAID` → `RESTAURANT_REJECTED`
- Sets `restaurant.rejectedAt` timestamp
- Stores `restaurant.rejectionReason`

---

#### 3. Proceed with Order
```http
POST /orders/:id/restaurant/proceed
Authorization: Bearer <JWT_TOKEN>
Role: restaurantAdmin

Response: { order: Order }
```

**Behavior:**
- Validates order is in `RESTAURANT_ACCEPTED` status
- Creates delivery job in Rider Service
- Rider can now see and accept the delivery

**Important:** Delivery job is NOT created automatically after payment anymore. Restaurant must explicitly proceed.

---

## 🎨 Frontend Changes

### Restaurant Orders Page

**New UI Elements:**

#### For PAID Orders:
```
┌─────────────────────────────────────┐
│ Order #A1B2C3                       │
│ New Order — Action Required         │
├─────────────────────────────────────┤
│ Rice × 1            $8.00           │
│ Total:              $8.00           │
├─────────────────────────────────────┤
│ ℹ New order received! Review and    │
│   accept or reject this order.      │
├─────────────────────────────────────┤
│ [✓ Accept Order]  [✗ Reject]        │
└─────────────────────────────────────┘
```

**If Reject clicked:**
```
┌─────────────────────────────────────┐
│ Reason for rejection:               │
│ ┌─────────────────────────────────┐ │
│ │ Out of ingredients              │ │
│ └─────────────────────────────────┘ │
│ [Confirm Reject] [Cancel]           │
└─────────────────────────────────────┘
```

---

#### For RESTAURANT_ACCEPTED Orders:
```
┌─────────────────────────────────────┐
│ Order #A1B2C3                       │
│ Accepted — Ready to Proceed         │
├─────────────────────────────────────┤
│ Rice × 1            $8.00           │
│ Total:              $8.00           │
├─────────────────────────────────────┤
│ ℹ Order accepted! Click below to    │
│   assign a rider and start prep.    │
├─────────────────────────────────────┤
│ [🚚 Proceed & Assign Rider]         │
└─────────────────────────────────────┘
```

---

#### Workflow Display (Bottom of Page):
```
Old: Paid → Rider assigned → Mark Ready → Rider picks up → Delivered

New: Paid → Accept/Reject → Proceed & Assign Rider → Mark Ready → Rider picks up → Delivered
```

---

## 📊 API Methods Added

### Frontend (`orderApi`)

```typescript
// Accept order
async acceptOrder(orderId: string): Promise<Order>

// Reject order with reason
async rejectOrder(orderId: string, reason: string): Promise<Order>

// Proceed and create delivery job
async proceedWithOrder(orderId: string): Promise<Order>
```

---

## 🔄 Migration Notes

### For Existing Orders in PAID Status

Orders that were already `PAID` before this update need manual handling:

**Option 1: Auto-accept existing PAID orders**
```javascript
// Run this script on your database
db.orders.updateMany(
  { status: "PAID", "restaurant.acceptedAt": { $exists: false } },
  { 
    $set: { 
      status: "RESTAURANT_ACCEPTED",
      "restaurant.acceptedAt": new Date()
    }
  }
)
```

**Option 2: Let restaurants manually accept**
- Existing PAID orders will appear in restaurant dashboard
- Restaurants can accept/reject them like new orders

---

## ✅ Testing the New Flow

### Test Scenario 1: Accept Order
1. Customer places order and pays
2. Order appears in restaurant dashboard with status `PAID`
3. Restaurant clicks **"Accept Order"**
4. Order status changes to `RESTAURANT_ACCEPTED`
5. Restaurant clicks **"Proceed & Assign Rider"**
6. Delivery job created, riders can see it

### Test Scenario 2: Reject Order
1. Customer places order and pays
2. Order appears in restaurant dashboard with status `PAID`
3. Restaurant clicks **"Reject"**
4. Popup asks for rejection reason
5. Restaurant enters reason and confirms
6. Order status changes to `RESTAURANT_REJECTED`
7. Order moves out of active queue

### Test API Endpoints

```bash
# Get restaurant orders
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/orders/restaurant/RESTAURANT_ID

# Accept order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/orders/ORDER_ID/restaurant/accept

# Reject order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Out of ingredients"}' \
  http://localhost:8080/orders/ORDER_ID/restaurant/reject

# Proceed with order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/orders/ORDER_ID/restaurant/proceed
```

---

## 🚀 Deployment Steps

### 1. Deploy Backend Changes

```bash
# The order service needs to be redeployed
# GitHub Actions will handle this automatically

# Or manually:
cd services/order
docker build -t order:latest .
# Push and deploy to ECS
```

### 2. Update Database (if needed)

If you have existing PAID orders, run the migration script above.

### 3. Deploy Frontend

```bash
cd "Meal Stack"
npm run build
# Deploy to your hosting (Vercel, Netlify, etc.)
```

### 4. Test End-to-End

1. Place a test order
2. Login as restaurant admin
3. Accept the order
4. Proceed with order
5. Verify delivery job created
6. Login as rider
7. Verify delivery appears in available list

---

## 📈 Benefits of New Flow

✅ **Restaurant Control** - Restaurants can reject orders they can't fulfill  
✅ **Better UX** - Customers don't get disappointed by late cancellations  
✅ **Reduced Waste** - No rider assigned to rejected orders  
✅ **Transparency** - Rejection reasons help identify restaurant issues  
✅ **Flexible** - Restaurants can batch-accept orders during peak times  

---

## 🔍 Monitoring

### CloudWatch Logs to Watch

**Order acceptance:**
```
[order] Restaurant accepted order { orderId, restaurantId }
```

**Order rejection:**
```
[order] Restaurant rejected order { orderId, restaurantId, reason }
```

**Delivery creation:**
```
[order] Delivery job created after restaurant proceed { orderId }
```

**Errors:**
```
[order] Rider job creation failed { orderId, error }
```

---

## 🐛 Troubleshooting

### Order stuck in PAID status
**Cause:** Restaurant hasn't accepted yet  
**Solution:** Restaurant needs to accept the order

### "Proceed" button not creating delivery job
**Cause:** Rider service may be down or unreachable  
**Solution:** Check rider service logs and connectivity

### Orders not appearing in restaurant dashboard
**Cause:** Role permission or restaurantId mismatch  
**Solution:** Verify user has `restaurantAdmin` role and restaurant ownership

---

## 📝 Summary

This update adds a **manual approval step** for restaurants, giving them control over order acceptance. The changes are:

1. ✅ Order model updated with restaurant acceptance fields
2. ✅ Three new API endpoints for accept/reject/proceed
3. ✅ Frontend updated with action buttons and rejection dialog
4. ✅ Delivery job creation moved from payment confirmation to restaurant proceed
5. ✅ Order status flow extended with RESTAURANT_ACCEPTED/REJECTED

**The flow is now more realistic and gives restaurants the control they need to manage capacity!** 🎉

---

**Last Updated:** May 2, 2026  
**Commit:** ae3caab  
**Author:** GitHub Copilot
