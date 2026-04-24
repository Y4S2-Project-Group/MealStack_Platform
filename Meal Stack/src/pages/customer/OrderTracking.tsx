import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChefHat, Truck, Package, ChevronRight, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api";
import type { Order } from "@/lib/api";

// ── Status helpers ────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Preparing",
  ASSIGNED_TO_RIDER: "Rider Assigned",
  PICKED_UP: "On The Way",
  DELIVERED: "Delivered",
};

const statusColor: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  ASSIGNED_TO_RIDER: "bg-purple-100 text-purple-800",
  PICKED_UP: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const sequence = ["PAID", "ASSIGNED_TO_RIDER", "PICKED_UP", "DELIVERED"] as const;

// ── Tracking stepper for a single order ─────────────────────────────────────
function TrackingSteps({ order }: { order: Order }) {
  const steps = useMemo(() => {
    const idx = sequence.findIndex((s) => s === order.status);
    return [
      { label: "Preparing", icon: ChefHat, done: idx >= 0, active: idx === 0 },
      { label: "Rider Assigned", icon: Truck, done: idx >= 1, active: idx === 1 },
      { label: "On The Way", icon: Package, done: idx >= 2, active: idx === 2 },
      { label: "Delivered", icon: Check, done: idx >= 3, active: idx === 3 },
    ];
  }, [order.status]);

  return (
    <div className="pt-3 border-t mt-3">
      <div className="flex items-center justify-between mb-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 ${steps[i - 1].done ? "bg-primary" : "bg-border"}`} />}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              } ${step.active ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                <step.icon className="h-3.5 w-3.5" />
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step.done ? "bg-primary" : "bg-border"}`} />}
            </div>
            <span className="text-[9px] mt-1 text-center text-muted-foreground">{step.label}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 text-xs">
        {order.items.map((item) => (
          <div key={item.menuItemId} className="flex justify-between text-muted-foreground">
            <span>{item.name} × {item.quantity}</span>
            <span>${item.lineTotal.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold pt-1 border-t text-sm">
          <span>Total</span>
          <span className="text-primary">${order.total.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Live status — auto-refreshes every 5s</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlOrderId = searchParams.get("orderId");
  const [expandedId, setExpandedId] = useState<string | null>(urlOrderId);

  // Fetch all orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => orderApi.getMyOrders(),
    refetchInterval: 5000,
  });

  // Show only paid/active orders (not incomplete checkouts)
  const visibleOrders = orders.filter((o) => o.status !== "PENDING_PAYMENT");

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground text-sm">Loading your orders...</div>;
  }

  if (visibleOrders.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">No orders yet</h1>
        <p className="text-sm text-muted-foreground">Place your first order to see it here.</p>
        <Button onClick={() => navigate("/customer")} size="sm" className="rounded-full px-6">
          Browse Restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 pb-8">
      <h1 className="text-xl font-display font-bold">My Orders</h1>
      <p className="text-xs text-muted-foreground">Tap an order to track it live</p>

      {visibleOrders.map((order) => {
        const isExpanded = expandedId === order._id;
        return (
          <Card
            key={order._id}
            className={`overflow-hidden border-0 shadow-sm transition-all cursor-pointer hover:shadow-md ${
              isExpanded ? "ring-1 ring-primary/30" : ""
            }`}
            onClick={() => setExpandedId(isExpanded ? null : order._id)}
          >
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Order #{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleString([], {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] border-0 ${statusColor[order.status] || ""}`}>
                    {statusLabel[order.status] || order.status}
                  </Badge>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded tracking */}
              {isExpanded && <TrackingSteps order={order} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


