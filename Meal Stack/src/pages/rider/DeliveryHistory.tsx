import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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
  // useState (not useMemo) so it reads fresh on every mount
  const [deliveries] = useState<RiderHistoryEntry[]>(() => loadHistory());

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-display font-bold">Delivery History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{deliveries.length} completed deliveries</p>
      </div>

      <div className="space-y-3">
        {deliveries.map((d) => (
          <Card key={d.orderId} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Order #{d.orderId.slice(-6).toUpperCase()}</h3>
                  <span className="text-sm font-bold text-green-600">
                    +${(d.total * 0.15).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order total: ${d.total.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(d.deliveredAt).toLocaleString([], {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {deliveries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No completed deliveries yet</p>
            <p className="text-xs text-muted-foreground">Completed deliveries will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
