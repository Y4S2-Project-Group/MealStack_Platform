import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi, restaurantApi } from "@/lib/api";
import type { Order } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, ChefHat, Truck, CheckCircle2, CreditCard, PackageCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING_PAYMENT: { label: "Awaiting Payment",   color: "bg-yellow-100 text-yellow-800", icon: CreditCard },
  PAID:            { label: "New Order — Action Required", color: "bg-blue-100 text-blue-800", icon: ChefHat },
  RESTAURANT_ACCEPTED: { label: "Accepted — Ready to Proceed", color: "bg-green-100 text-green-800", icon: ChefHat },
  RESTAURANT_REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800", icon: Clock },
  ASSIGNED_TO_RIDER: { label: "Rider Assigned",   color: "bg-purple-100 text-purple-800", icon: Truck },
  READY_FOR_PICKUP:  { label: "Ready for Pickup!", color: "bg-green-100 text-green-800", icon: PackageCheck },
  PICKED_UP:       { label: "Picked Up by Rider", color: "bg-orange-100 text-orange-800", icon: Truck },
  DELIVERED:       { label: "Delivered",           color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

function OrderCard({
  order,
  onMarkReady,
  onAccept,
  onReject,
  onProceed,
}: {
  order: Order;
  onMarkReady?: (orderId: string) => Promise<void>;
  onAccept?: (orderId: string) => Promise<void>;
  onReject?: (orderId: string, reason?: string) => Promise<void>;
  onProceed?: (orderId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const config = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800", icon: Clock };
  const Icon = config.icon;

  const handleMarkReady = async () => {
    if (!onMarkReady) return;
    setLoading(true);
    try {
      await onMarkReady(order._id);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!onAccept) return;
    setLoading(true);
    try {
      await onAccept(order._id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setLoading(true);
    try {
      await onReject(order._id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!onProceed) return;
    setLoading(true);
    try {
      await onProceed(order._id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Order #{order._id.slice(-6).toUpperCase()}</h3>
          <Badge className={`text-[10px] ${config.color} border-0`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
              <span>${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total + time */}
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-sm font-bold text-primary">${order.total.toFixed(2)}</span>
        </div>

        {/* Status-specific actions */}
        {order.status === "PAID" && (
          <div className="space-y-2">
            <p className="text-[11px] text-blue-600 bg-blue-50 p-2 rounded">
              New order received! Review the items and accept or reject this order.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
                onClick={handleAccept}
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? "Processing..." : "Accept Order"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={loading}
                onClick={() => setShowRejectDialog(true)}
              >
                Reject
              </Button>
            </div>
            {showRejectDialog && (
              <div className="space-y-2 p-3 bg-gray-50 rounded border">
                <label className="text-xs font-medium">Reason for rejection:</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 text-xs border rounded"
                  placeholder="e.g., Out of ingredients"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="flex-1" onClick={handleReject} disabled={loading}>
                    {loading ? "Rejecting..." : "Confirm Reject"}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {order.status === "RESTAURANT_ACCEPTED" && (
          <div className="space-y-2">
            <p className="text-[11px] text-green-600 bg-green-50 p-2 rounded">
              Order accepted! Click below to assign a rider and start preparation.
            </p>
            <Button
              size="sm"
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
              onClick={handleProceed}
            >
              <Truck className="h-4 w-4" />
              {loading ? "Processing..." : "Proceed & Assign Rider"}
            </Button>
          </div>
        )}

        {order.status === "ASSIGNED_TO_RIDER" && (
          <div className="space-y-2">
            <p className="text-[11px] text-purple-600 bg-purple-50 p-2 rounded">
              A rider has accepted this delivery. Once packed and ready, tap the button below.
            </p>
            <Button
              size="sm"
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
              onClick={() => void handleMarkReady()}
            >
              <PackageCheck className="h-4 w-4" />
              {loading ? "Updating..." : "Order Ready for Pickup"}
            </Button>
          </div>
        )}

        {order.status === "READY_FOR_PICKUP" && (
          <p className="text-[11px] text-green-700 bg-green-50 p-2 rounded font-medium">
            ✅ Rider is on the way to collect this order.
          </p>
        )}

        {order.status === "PICKED_UP" && (
          <p className="text-[11px] text-orange-600 bg-orange-50 p-2 rounded">
            Order picked up. Rider is on the way to the customer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RestaurantOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const selectedRestaurant = useMemo(() => {
    if (!restaurants.length || !user?.id) return null;
    return restaurants.find((r) => r.ownerUserId === user.id) ?? null;
  }, [restaurants, user?.id]);

  const { data: restaurantOrders = [], isLoading } = useQuery({
    queryKey: ["restaurant-orders", selectedRestaurant?._id],
    queryFn: () => orderApi.getRestaurantOrders(selectedRestaurant?._id || ""),
    enabled: Boolean(selectedRestaurant?._id),
    refetchInterval: 10000,
  });

  const handleMarkReady = async (orderId: string) => {
    try {
      await orderApi.updateRestaurantOrderStatus(orderId, "READY_FOR_PICKUP");
      await queryClient.invalidateQueries({ queryKey: ["restaurant-orders", selectedRestaurant?._id] });
      toast.success("Order marked as Ready for Pickup!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      await orderApi.acceptOrder(orderId);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-orders", selectedRestaurant?._id] });
      toast.success("Order accepted!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept order");
    }
  };

  const handleReject = async (orderId: string, reason?: string) => {
    try {
      await orderApi.rejectOrder(orderId, reason || "No reason provided");
      await queryClient.invalidateQueries({ queryKey: ["restaurant-orders", selectedRestaurant?._id] });
      toast.error("Order rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject order");
    }
  };

  const handleProceed = async (orderId: string) => {
    try {
      await orderApi.proceedWithOrder(orderId);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-orders", selectedRestaurant?._id] });
      toast.success("Rider assigned! Order is now in preparation.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to proceed with order");
    }
  };

  const paidOrders = restaurantOrders.filter((o) => o.status !== "PENDING_PAYMENT" && o.status !== "RESTAURANT_REJECTED");
  const activeOrders = paidOrders.filter((o) => !["DELIVERED"].includes(o.status));
  const completedOrders = paidOrders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-display font-bold">Orders</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Live order queue — auto-refreshes every 10 seconds</p>
        {selectedRestaurant && (
          <p className="text-[11px] text-muted-foreground mt-1">Restaurant: {selectedRestaurant.name}</p>
        )}
      </div>

      {/* Active Orders */}
      <div>
        <h2 className="text-base font-semibold mb-3">Active Orders ({activeOrders.length})</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading orders...</p>}
        {!isLoading && activeOrders.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No active orders right now. New orders will appear here automatically.
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {activeOrders.map((order) => (
            <OrderCard 
              key={order._id} 
              order={order} 
              onMarkReady={handleMarkReady}
              onAccept={handleAccept}
              onReject={handleReject}
              onProceed={handleProceed}
            />
          ))}
        </div>
      </div>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Completed ({completedOrders.length})</h2>
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        Workflow: Paid → Accept/Reject → Proceed & Assign Rider → Mark Ready → Rider picks up → Delivered
      </div>
    </div>
  );
}
