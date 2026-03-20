import { useQuery } from "@tanstack/react-query";
import { orderApi, riderApi, type Delivery } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Package, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ACTIVE_DELIVERY_KEY = "mealstack.rider.activeDelivery";

function saveActiveDelivery(delivery: Delivery) {
  localStorage.setItem(ACTIVE_DELIVERY_KEY, JSON.stringify(delivery));
}

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { data: deliveryRequests = [], isLoading } = useQuery({
    queryKey: ["rider-available-deliveries"],
    queryFn: () => riderApi.listAvailable(),
    refetchInterval: 8000,
  });

  const totalAvailable = deliveryRequests.length;

  const handleAccept = async (orderId: string) => {
    try {
      const accepted = await riderApi.acceptDelivery(orderId);
      saveActiveDelivery(accepted);
      toast.success("Delivery accepted!");
      navigate(`/rider/active?orderId=${orderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to accept delivery");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-display font-bold">Rider Dashboard</h1>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalAvailable}</p>
              <p className="text-[10px] text-muted-foreground">Available Deliveries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">Live</p>
              <p className="text-[10px] text-muted-foreground">Use Earnings tab for totals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available requests */}
      <h2 className="text-base font-semibold">Available Deliveries</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading deliveries...</p>}
      <div className="space-y-3">
        {deliveryRequests.map((req) => (
          <Card key={req._id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Order {req.orderId.slice(0, 8)}</h3>
                <Badge variant="secondary" className="text-[10px]">{req.status}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-primary shrink-0" /><span>Restaurant ID: {req.restaurantId}</span></div>
                <div className="flex items-center gap-2"><Navigation className="h-3 w-3 text-accent shrink-0" /><span>Customer ID: {req.customerId}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-accent">Accept and start delivery</span>
                <Button size="sm" className="text-xs h-8" onClick={() => void handleAccept(req.orderId)}>
                  Accept
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && deliveryRequests.length === 0 && <p className="text-sm text-muted-foreground">No delivery jobs available right now.</p>}
      </div>
    </div>
  );
}
