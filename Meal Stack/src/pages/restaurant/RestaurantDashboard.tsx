import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingBag, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, restaurantApi } from "@/lib/api";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const selectedRestaurant = useMemo(() => {
    if (!restaurants.length || !user?.id) {
      return null;
    }
    return restaurants.find((r) => r.ownerUserId === user.id) ?? null;
  }, [restaurants, user?.id]);

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["restaurant-menu", selectedRestaurant?._id],
    queryFn: () => restaurantApi.listMenuItems(selectedRestaurant?._id || ""),
    enabled: Boolean(selectedRestaurant?._id),
  });

  const { data: restaurantOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["restaurant-orders", selectedRestaurant?._id],
    queryFn: () => orderApi.getRestaurantOrders(selectedRestaurant?._id || ""),
    enabled: Boolean(selectedRestaurant?._id),
  });

  const estimatedMenuValue = items.reduce((sum, i) => sum + i.price, 0);

  const stats = [
    { label: "Menu Items", value: String(items.length), icon: ShoppingBag, color: "text-primary" },
    { label: "Menu Value", value: formatCurrency(estimatedMenuValue), icon: DollarSign, color: "text-accent" },
    { label: "Available", value: String(items.filter((i) => i.isAvailable).length), icon: Star, color: "text-primary" },
    { label: "Open Status", value: selectedRestaurant?.isOpen ? "Open" : "Closed", icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-display font-bold">Dashboard</h1>
      {(loadingRestaurants || loadingItems || loadingOrders) && <p className="text-sm text-muted-foreground">Loading restaurant metrics...</p>}
      {selectedRestaurant && <p className="text-xs text-muted-foreground">Restaurant: {selectedRestaurant.name}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incoming Orders */}
      <h2 className="text-base font-semibold">Orders</h2>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Badge className="bg-secondary text-secondary-foreground text-[10px]">Live Queue</Badge>
          <p className="text-sm text-muted-foreground">This restaurant currently has {restaurantOrders.length} order(s) in queue.</p>
          <Button size="sm" className="text-xs h-8" onClick={() => toast.info("Use Orders tab to manage status updates")}>Open Orders Queue</Button>
        </CardContent>
      </Card>
    </div>
  );
}
