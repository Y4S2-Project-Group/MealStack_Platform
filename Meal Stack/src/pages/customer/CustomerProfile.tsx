import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Mail, Calendar, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

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
  const navigate = useNavigate();
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => orderApi.getMyOrders(),
  });

  const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
  const activeOrders = orders.filter(o => o.status !== 'DELIVERED').length;

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-display font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and view orders</p>
      </div>

      {/* Profile card */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="w-24 h-24 rounded-2xl bg-card shadow-xl flex items-center justify-center border-4 border-card">
              <User className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>
        <CardContent className="pt-16 pb-6 px-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">Customer Account</p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="h-4 w-4" />
              </div>
              <span>{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 bg-muted rounded-lg">
                  <Phone className="h-4 w-4" />
                </div>
                <span>{user.phone}</span>
              </div>
            )}
            {user?.address && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 bg-muted rounded-lg">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>{user.address}</span>
              </div>
            )}
          </div>

          <Button size="lg" variant="outline" className="w-full mt-4">
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-md border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Package className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order History */}
      <div>
        <h2 className="text-lg font-bold mb-4">Order History</h2>
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order._id} className="shadow-md border-0 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/customer/tracking?orderId=${order._id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-bold">Order #{order._id.slice(-6).toUpperCase()}</h3>
                      <Badge className={`text-xs capitalize shadow-sm ${statusColor[order.status] || ""}`}>
                        {statusLabel[order.status] || order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <Separator className="my-3" />

                <div className="space-y-1.5 text-sm mb-3">
                  {order.items.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                      <span className="font-medium">LKR {item.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">+ {order.items.length - 2} more items</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-primary">LKR {order.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Package className="h-16 w-16 text-muted-foreground/50 mx-auto" />
              <div>
                <p className="text-lg font-semibold">No orders yet</p>
                <p className="text-muted-foreground text-sm mt-1">Start ordering to see your history here</p>
              </div>
              <Button size="lg" onClick={() => navigate("/customer")} className="mt-4">
                Browse Restaurants
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
