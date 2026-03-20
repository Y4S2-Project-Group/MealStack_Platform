import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi, restaurantApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function RestaurantOrders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const selectedRestaurant = useMemo(() => {
    if (!restaurants.length) return null;
    return restaurants.find((r) => r.ownerUserId === user?.id) || restaurants[0];
  }, [restaurants, user?.id]);

  const { data: restaurantOrders = [], isLoading } = useQuery({
    queryKey: ["restaurant-orders", selectedRestaurant?._id],
    queryFn: () => orderApi.getRestaurantOrders(selectedRestaurant?._id || ""),
    enabled: Boolean(selectedRestaurant?._id),
  });

  const updateStatus = async (orderId: string, status: "ASSIGNED_TO_RIDER" | "PICKED_UP" | "DELIVERED") => {
    if (!selectedRestaurant?._id) return;
    try {
      await orderApi.updateRestaurantOrderStatus(orderId, status);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-orders", selectedRestaurant._id] });
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-display font-bold">Orders</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Restaurant queue management powered by live order endpoints</p>
        {selectedRestaurant && <p className="text-[11px] text-muted-foreground mt-1">Restaurant: {selectedRestaurant.name}</p>}
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Order Queue</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading orders...</p>}
        {!isLoading && restaurantOrders.length === 0 && <p className="text-sm text-muted-foreground">No orders in this restaurant queue.</p>}
        <div className="space-y-3">
          {restaurantOrders.map((order) => (
            <Card key={order._id} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Order {order._id.slice(0, 8)}</h3>
                  <Badge className="text-[10px]">{order.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Restaurant ID: {order.restaurantId}</p>
                <p className="text-xs text-muted-foreground">Total: ${order.total.toFixed(2)}</p>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => void updateStatus(order._id, "ASSIGNED_TO_RIDER")}>Assign Rider</Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => void updateStatus(order._id, "PICKED_UP")}>Picked Up</Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => void updateStatus(order._id, "DELIVERED")}>Delivered</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        Queue updates sync through the order contract in real time via query invalidation.
      </div>
    </div>
  );
}
