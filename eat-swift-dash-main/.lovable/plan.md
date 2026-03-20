
# Food Delivery App — "Meal Stack"

## Design System
- **Terracotta Orange** `#E07A5F` — primary actions, CTAs, active states
- **Sage-Mint Green** `#8AB17D` — success states, rider/delivery accents
- **Soft Cream** `#F5EDE4` — backgrounds
- **Blush Peach** `#F4C8A8` — cards, highlights, secondary surfaces
- **Dark charcoal** for text, white for card backgrounds
- Rounded corners, subtle shadows, mobile-first layout

---

## Shared
- **Login/Register page** with role selection (Customer / Restaurant / Rider)
- Mock auth stored in React context — selecting role routes to that dashboard
- **Bottom tab navigation** on mobile, sidebar on desktop
- Notification bell with mock notification dropdown

---

## Customer Flow (6 pages)

1. **Home** — Hero banner, search bar, category filters (Pizza, Sushi, etc.), restaurant cards grid with ratings/delivery time
2. **Restaurant Detail** — Banner image, menu sections with item cards (name, price, image, Add to Cart button), item availability badges
3. **Cart** — Item list with quantity controls, subtotal/delivery fee/total, Proceed to Checkout button
4. **Checkout** — Delivery address input, payment method selector (mock), Place Order button
5. **Order Tracking** — Status stepper (Confirmed → Preparing → Picked Up → Delivered) with estimated time, order summary below
6. **Profile & Order History** — User info section, list of past orders with status badges

---

## Restaurant Flow (4 pages)

1. **Dashboard** — Stats cards (today's orders, revenue, avg rating), incoming orders list with Accept/Reject buttons
2. **Menu Management** — List of menu items with edit/delete/toggle availability, Add New Item form (name, price, description, category)
3. **Order Detail / Active Orders** — Order cards showing items, customer name, status dropdown (Preparing → Ready for Pickup)
4. **Restaurant Profile** — Edit restaurant name, description, cuisine type, operating hours

---

## Rider Flow (4 pages)

1. **Dashboard** — Today's stats (deliveries, earnings), available delivery requests with Accept button showing restaurant → customer info
2. **Active Delivery** — Status stepper from rider's perspective (Picked Up → En Route → Delivered) with update buttons, order details
3. **Delivery History** — List of completed deliveries with date, restaurant, earnings
4. **Earnings Summary** — Weekly/monthly earnings chart placeholder, total stats

---

## Technical Notes
- All data is static mock (hardcoded arrays of restaurants, items, orders)
- React Context for current user role and basic navigation state
- React Router for all routes with role-based route prefixes
- Fully responsive: mobile-first with bottom nav, desktop with sidebar
- Ready for API integration — data structured as typed interfaces
