import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi, riderApi, type Delivery } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Package, Navigation, Truck, Check, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// ── localStorage helpers ──────────────────────────────────────────────────────
const ACTIVE_DELIVERY_KEY  = "mealstack.rider.activeDelivery";
const DELIVERY_HISTORY_KEY = "mealstack.rider.history";

function loadActiveDelivery(): Delivery | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DELIVERY_KEY);
    return raw ? (JSON.parse(raw) as Delivery) : null;
  } catch { return null; }
}

function saveActiveDelivery(d: Delivery) {
  localStorage.setItem(ACTIVE_DELIVERY_KEY, JSON.stringify(d));
}

function clearActiveDelivery() {
  localStorage.removeItem(ACTIVE_DELIVERY_KEY);
}

function appendHistory(entry: { orderId: string; restaurantId: string; total: number; deliveredAt: string }) {
  try {
    const raw = localStorage.getItem(DELIVERY_HISTORY_KEY);
    const current = raw ? JSON.parse(raw) : [];
    localStorage.setItem(DELIVERY_HISTORY_KEY, JSON.stringify([entry, ...current]));
  } catch {
    localStorage.setItem(DELIVERY_HISTORY_KEY, JSON.stringify([entry]));
  }
}

// ── Delivery status progression ───────────────────────────────────────────────
// Order statuses that mean the rider has already picked up
const PICKED_UP_STATUSES = ["PICKED_UP", "DELIVERED"];

export default function RiderDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);

  // Reactive state for active delivery — initialised from localStorage
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(() => loadActiveDelivery());

  // Sync activeDelivery state whenever localStorage changes (e.g. after accept)
  useEffect(() => {
    const stored = loadActiveDelivery();
    if (stored?.orderId !== activeDelivery?.orderId) {
      setActiveDelivery(stored);
    }
  });

  // Fetch available delivery jobs (only shown when no active delivery)
  const { data: deliveryRequests = [], isLoading } = useQuery({
    queryKey: ["rider-available-deliveries"],
    queryFn: () => riderApi.listAvailable(),
    refetchInterval: 8000,
  });

  // Live order status for the active delivery
  const { data: activeOrder, isError: orderFetchError } = useQuery({
    queryKey: ["rider-active-order", activeDelivery?.orderId],
    queryFn: () => orderApi.getOrder(activeDelivery!.orderId),
    enabled: Boolean(activeDelivery?.orderId),
    refetchInterval: 6000,
    retry: 1, // Only retry once
  });

  // Clear stale active delivery if order doesn't exist
  useEffect(() => {
    if (activeDelivery && orderFetchError) {
      console.warn("Active delivery order not found in database, clearing localStorage");
      clearActiveDelivery();
      setActiveDelivery(null);
      toast.error("Active delivery no longer exists");
    }
  }, [activeDelivery, orderFetchError]);

  // ── Accept a new delivery ─────────────────────────────────────────────────
  const handleAccept = async (orderId: string) => {
    try {
      const accepted = await riderApi.acceptDelivery(orderId);
      saveActiveDelivery(accepted);
      setActiveDelivery(accepted);
      toast.success("Delivery accepted!");
      await queryClient.invalidateQueries({ queryKey: ["rider-available-deliveries"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to accept delivery");
    }
  };

  // ── Update delivery status (Picked Up / Delivered) ────────────────────────
  const handleUpdateStatus = async (status: "PICKED_UP" | "DELIVERED") => {
    if (!activeDelivery?.orderId) return;
    setUpdating(true);
    try {
      await riderApi.updateStatus(activeDelivery.orderId, status);

      if (status === "DELIVERED") {
        // Save to history before clearing
        appendHistory({
          orderId:      activeDelivery.orderId,
          restaurantId: activeDelivery.restaurantId,
          total:        activeOrder?.total ?? 0,
          deliveredAt:  new Date().toISOString(),
        });
        clearActiveDelivery();
        setActiveDelivery(null);
        await queryClient.invalidateQueries({ queryKey: ["rider-active-order"] });
        toast.success("🎉 Delivery completed!");
        navigate("/rider/history");
      } else {
        // PICKED_UP — invalidate to refresh the stepper
        await queryClient.invalidateQueries({ queryKey: ["rider-active-order", activeDelivery.orderId] });
        toast.success("✅ Marked as Picked Up!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Derive stepper state from live order status
  const liveStatus = activeOrder?.status;
  // Rider can mark picked up when order is READY_FOR_PICKUP (restaurant packed it)
  // or even directly from ASSIGNED_TO_RIDER (in case restaurant skipped the step)
  const canMarkPickedUp = liveStatus === "READY_FOR_PICKUP" || liveStatus === "ASSIGNED_TO_RIDER";
  const isPickedUp      = PICKED_UP_STATUSES.includes(liveStatus ?? "");
  const isDelivered     = liveStatus === "DELIVERED";

  const stepDone = {
    preparing:  true, // always done once assigned
    pickUp:     isPickedUp,
    enRoute:    isPickedUp && !isDelivered,
    delivered:  isDelivered,
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5 pb-8">
      <h1 className="text-xl font-display font-bold">Rider Dashboard</h1>

      {/* ── Active Delivery Card ─────────────────────────────────────────── */}
      {activeDelivery && !isDelivered && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-4 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Active Delivery</h2>
                <p className="text-[11px] text-muted-foreground">
                  Order #{activeDelivery.orderId.slice(-6).toUpperCase()}
                </p>
              </div>
              <Badge className={`text-[10px] border-0 ${
                liveStatus === "PICKED_UP"        ? "bg-orange-100 text-orange-800"  :
                liveStatus === "READY_FOR_PICKUP" ? "bg-green-100 text-green-800"   :
                liveStatus === "ASSIGNED_TO_RIDER"? "bg-purple-100 text-purple-800" :
                "bg-blue-100 text-blue-800"
              }`}>
                {liveStatus === "PICKED_UP"         ? "Picked Up · En Route"   :
                 liveStatus === "READY_FOR_PICKUP"  ? "Ready — Go Pick Up!"    :
                 liveStatus === "ASSIGNED_TO_RIDER" ? "Assigned · Prep in Progress" :
                 liveStatus ?? "Loading..."}
              </Badge>
            </div>

            {/* Delivery Address */}
            {activeOrder?.deliveryAddress && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Delivery Address:</p>
                    <p className="text-muted-foreground">{activeOrder.deliveryAddress.street}</p>
                    <p className="text-muted-foreground">{activeOrder.deliveryAddress.city}, {activeOrder.deliveryAddress.postalCode}</p>
                    {activeOrder.deliveryAddress.phone && (
                      <p className="text-muted-foreground mt-1">📞 {activeOrder.deliveryAddress.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress stepper */}
            <div className="flex items-center justify-between">
              {[
                { label: "Preparing",  icon: ChefHat,  done: stepDone.preparing },
                { label: "Pick Up",    icon: Package,  done: stepDone.pickUp,   active: canMarkPickedUp },
                { label: "En Route",   icon: Truck,    done: stepDone.enRoute,  active: isPickedUp },
                { label: "Delivered",  icon: Check,    done: stepDone.delivered },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 ${arr[i - 1].done ? "bg-primary" : "bg-border"}`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    } ${"active" in step && step.active ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                      <step.icon className="h-3.5 w-3.5" />
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 ${step.done ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  <span className="text-[9px] mt-1 text-center text-muted-foreground">{step.label}</span>
                </div>
              ))}
            </div>

            {/* Order items */}
            {activeOrder && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                {activeOrder.items.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between text-muted-foreground">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t text-sm">
                  <span>Total</span>
                  <span className="text-primary">${activeOrder.total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {!isPickedUp && (
                <Button
                  className="flex-1 gap-2"
                  variant={canMarkPickedUp ? "default" : "outline"}
                  disabled={updating || !canMarkPickedUp}
                  onClick={() => void handleUpdateStatus("PICKED_UP")}
                >
                  <Package className="h-4 w-4" />
                  {updating ? "Updating..." : canMarkPickedUp ? "Mark Picked Up ✓" : "Waiting for Restaurant..."}
                </Button>
              )}
              {isPickedUp && (
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  disabled={updating}
                  onClick={() => void handleUpdateStatus("DELIVERED")}
                >
                  <Check className="h-4 w-4" />
                  {updating ? "Completing..." : "Complete Delivery"}
                </Button>
              )}
            </div>

            {!isPickedUp && !canMarkPickedUp && activeOrder && (
              <p className="text-[10px] text-muted-foreground text-center">
                Waiting for restaurant to mark order as ready. Status: {liveStatus}
              </p>
            )}
            {!isPickedUp && !activeOrder && (
              <p className="text-[10px] text-muted-foreground text-center">
                Loading order details...
              </p>
            )}
            {isPickedUp && (
              <p className="text-[10px] text-muted-foreground text-center">
                You've picked up the order. Tap Complete Delivery when done.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{deliveryRequests.length}</p>
              <p className="text-[10px] text-muted-foreground">Available Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">15%</p>
              <p className="text-[10px] text-muted-foreground">Per-delivery earnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Available Jobs (only when idle) ──────────────────────────────── */}
      {!activeDelivery && (
        <>
          <h2 className="text-base font-semibold">Available Deliveries</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Loading deliveries...</p>}
          <div className="space-y-3">
            {deliveryRequests.map((req) => (
              <Card key={req._id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Order #{req.orderId.slice(-6).toUpperCase()}</h3>
                    <Badge variant="secondary" className="text-[10px]">{req.status}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      <span>Restaurant: {req.restaurantId.slice(0, 10)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3 w-3 text-accent shrink-0" />
                      <span>Customer: {req.customerId?.slice(0, 10)}...</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => void handleAccept(req.orderId)}
                  >
                    <Truck className="h-3.5 w-3.5" /> Accept Delivery
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!isLoading && deliveryRequests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No delivery jobs available right now.
              </p>
            )}
          </div>
        </>
      )}

      {activeDelivery && !isDelivered && (
        <p className="text-xs text-muted-foreground text-center">
          Complete your current delivery before accepting a new one.
        </p>
      )}
    </div>
  );
}
