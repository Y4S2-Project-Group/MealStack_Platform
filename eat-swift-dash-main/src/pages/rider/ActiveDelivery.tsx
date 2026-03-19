import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, Check, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderApi, riderApi, type Delivery } from "@/lib/api";

const ACTIVE_DELIVERY_KEY = "mealstack.rider.activeDelivery";
const DELIVERY_HISTORY_KEY = "mealstack.rider.history";

interface RiderHistoryEntry {
  orderId: string;
  restaurantId: string;
  total: number;
  deliveredAt: string;
}

function loadActiveDelivery(): Delivery | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DELIVERY_KEY);
    return raw ? (JSON.parse(raw) as Delivery) : null;
  } catch {
    return null;
  }
}

function appendHistory(entry: RiderHistoryEntry) {
  try {
    const raw = localStorage.getItem(DELIVERY_HISTORY_KEY);
    const current = raw ? (JSON.parse(raw) as RiderHistoryEntry[]) : [];
    localStorage.setItem(DELIVERY_HISTORY_KEY, JSON.stringify([entry, ...current]));
  } catch {
    localStorage.setItem(DELIVERY_HISTORY_KEY, JSON.stringify([entry]));
  }
}

export default function ActiveDelivery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fallback = loadActiveDelivery();
  const orderId = searchParams.get("orderId") || fallback?.orderId || "";

  const { data: order, isLoading } = useQuery({
    queryKey: ["rider-active-order", orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: Boolean(orderId),
    refetchInterval: 8000,
  });

  const steps = useMemo(() => {
    const status = order?.status;
    const pickedUp = status === "PICKED_UP" || status === "DELIVERED";
    const delivered = status === "DELIVERED";
    return [
      { label: "Picked Up", icon: Package, done: pickedUp, active: status === "PICKED_UP" },
      { label: "En Route", icon: Truck, done: pickedUp && !delivered, active: status === "PICKED_UP" },
      { label: "Delivered", icon: Check, done: delivered, active: delivered },
    ];
  }, [order?.status]);

  const updateStatus = async (status: "PICKED_UP" | "DELIVERED") => {
    if (!orderId) {
      toast.error("No active delivery selected");
      return;
    }

    try {
      await riderApi.updateStatus(orderId, status);

      if (status === "DELIVERED") {
        if (order) {
          appendHistory({
            orderId: order._id,
            restaurantId: order.restaurantId,
            total: order.total,
            deliveredAt: new Date().toISOString(),
          });
        }
        localStorage.removeItem(ACTIVE_DELIVERY_KEY);
        toast.success("Delivery completed!");
        navigate("/rider/history");
        return;
      }

      toast.success("Status updated to picked up");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  if (!orderId) {
    return <div className="p-6 text-center text-muted-foreground">No active delivery selected.</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading active delivery...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Active Delivery</h1>

      {/* Stepper */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {i > 0 && <div className={`flex-1 h-0.5 ${steps[i - 1].done ? "bg-accent" : "bg-border"}`} />}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                    step.done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  } ${step.active ? "ring-2 ring-accent ring-offset-2" : ""}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step.done ? "bg-accent" : "bg-border"}`} />}
                </div>
                <span className={`text-[10px] mt-2 text-center font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 text-xs" variant="outline" onClick={() => void updateStatus("PICKED_UP")}>Mark Picked Up</Button>
            <Button className="flex-1 text-xs" onClick={() => void updateStatus("DELIVERED")}>Mark Delivered</Button>
          </div>
        </CardContent>
      </Card>

      {/* Order details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Delivery Details</h2>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium text-foreground">Pickup</p><p>Restaurant ID: {order?.restaurantId || "-"}</p></div></div>
            <div className="flex items-start gap-2"><Navigation className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium text-foreground">Drop-off</p><p>Customer ID: {fallback?.customerId || "-"}</p></div></div>
          </div>
          <div className="border-t pt-2 space-y-1 text-xs">
            {(order?.items || []).map((item) => (
              <p key={item.menuItemId} className="text-muted-foreground">{item.name} × {item.quantity}</p>
            ))}
            <p className="font-bold mt-1">Order Total: <span className="text-accent">${order?.total?.toFixed(2) || "0.00"}</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
