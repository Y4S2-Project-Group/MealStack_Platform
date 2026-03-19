import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColor: Record<string, string> = {
  CREATED: "bg-secondary text-secondary-foreground",
  PENDING_PAYMENT: "bg-primary/10 text-primary",
  PAID: "bg-primary/20 text-primary",
  ASSIGNED_TO_RIDER: "bg-accent/20 text-accent",
  PICKED_UP: "bg-accent/30 text-accent",
  DELIVERED: "bg-accent text-accent-foreground",
};

const statusLabel: Record<string, string> = {
  CREATED: "Created",
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  ASSIGNED_TO_RIDER: "Assigned",
  PICKED_UP: "Picked Up",
  DELIVERED: "Delivered",
};

export default function CustomerProfile() {
  const { user } = useAuth();
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => orderApi.getMyOrders(),
  });

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Profile</h1>

      {/* Profile card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{user?.name}</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{user?.phone}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{user?.address}</div>
          </div>
          <Button variant="outline" size="sm" className="text-xs">Edit Profile</Button>
        </CardContent>
      </Card>

      {/* Order History */}
      <h2 className="text-base font-semibold">Order History</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order._id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Restaurant {order.restaurantId.slice(0, 6)}</h3>
                <Badge className={`text-[10px] capitalize ${statusColor[order.status] || ""}`}>{statusLabel[order.status] || order.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {order.items.map((item, i) => (
                  <p key={i}>{item.name} × {item.quantity}</p>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                <span className="font-bold text-primary">${order.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
