import { Card, CardContent } from "@/components/ui/card";
import { Check, ChefHat, Truck, Package } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api";

const sequence = ["CREATED", "PAID", "PICKED_UP", "DELIVERED"] as const;

const statusLabel: Record<string, string> = {
  CREATED: "Order Confirmed",
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Preparing",
  ASSIGNED_TO_RIDER: "Assigned To Rider",
  PICKED_UP: "Picked Up",
  DELIVERED: "Delivered",
};

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.getOrder(orderId as string),
    enabled: Boolean(orderId),
    refetchInterval: 5000,
  });

  const steps = useMemo(() => {
    const status = order?.status || "CREATED";
    const stepIndex = sequence.findIndex((value) => value === status);
    return [
      { label: "Order Confirmed", icon: Check, done: stepIndex >= 0, active: stepIndex === 0 },
      { label: "Preparing", icon: ChefHat, done: stepIndex >= 1, active: stepIndex === 1 },
      { label: "Picked Up", icon: Package, done: stepIndex >= 2, active: stepIndex === 2 },
      { label: "Delivered", icon: Truck, done: stepIndex >= 3, active: stepIndex === 3 },
    ];
  }, [order]);

  if (!orderId) {
    return <div className="p-6 text-center text-muted-foreground">No order selected.</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading order tracking...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Order Tracking</h1>

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

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold">{statusLabel[order?.status || "CREATED"] || order?.status}</p>
            <p className="text-xs text-muted-foreground">Order status updates every 5 seconds</p>
          </div>
        </CardContent>
      </Card>

      {/* Order details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Restaurant ID</span><span>{order?.restaurantId || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Order #</span><span>{order?._id || orderId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{statusLabel[order?.status || "CREATED"] || order?.status}</span></div>
          </div>
          <div className="border-t pt-2 space-y-1 text-sm">
            {(order?.items || []).map((item) => (
              <div key={item.menuItemId} className="flex justify-between"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span>${item.lineTotal.toFixed(2)}</span></div>
            ))}
            <div className="flex justify-between font-bold mt-1"><span>Total</span><span className="text-primary">${order?.total?.toFixed(2) || "0.00"}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
