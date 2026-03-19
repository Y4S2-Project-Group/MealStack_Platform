import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar } from "lucide-react";
import { useMemo } from "react";

const DELIVERY_HISTORY_KEY = "mealstack.rider.history";

interface RiderHistoryEntry {
  orderId: string;
  restaurantId: string;
  total: number;
  deliveredAt: string;
}

function loadHistory(): RiderHistoryEntry[] {
  try {
    const raw = localStorage.getItem(DELIVERY_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as RiderHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export default function DeliveryHistory() {
  const deliveries = useMemo(() => loadHistory(), []);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Delivery History</h1>

      <div className="space-y-3">
        {deliveries.map((d) => (
          <Card key={d.orderId}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">Order {d.orderId.slice(0, 8)}</h3>
                <p className="text-xs text-muted-foreground">Restaurant {d.restaurantId.slice(0, 8)}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(d.deliveredAt).toLocaleString()}
                </div>
              </div>
              <span className="text-sm font-bold text-accent">${(d.total * 0.15).toFixed(2)}</span>
            </CardContent>
          </Card>
        ))}
        {deliveries.length === 0 && <p className="text-sm text-muted-foreground">No completed deliveries yet.</p>}
      </div>
    </div>
  );
}
