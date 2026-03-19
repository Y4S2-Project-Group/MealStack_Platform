import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, Calendar } from "lucide-react";
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

const weeklyData = [
  { day: "Mon", amount: 28 },
  { day: "Tue", amount: 35 },
  { day: "Wed", amount: 22 },
  { day: "Thu", amount: 41 },
  { day: "Fri", amount: 38 },
  { day: "Sat", amount: 52 },
  { day: "Sun", amount: 32 },
];

const maxAmount = Math.max(...weeklyData.map((d) => d.amount));

export default function EarningsSummary() {
  const deliveries = useMemo(() => loadHistory(), []);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const entries = deliveries.map((d) => ({ ...d, earnings: d.total * 0.15, at: new Date(d.deliveredAt) }));
  const today = entries.filter((e) => e.at >= startOfDay).reduce((sum, e) => sum + e.earnings, 0);
  const thisWeek = entries.filter((e) => e.at >= startOfWeek).reduce((sum, e) => sum + e.earnings, 0);
  const thisMonth = entries.filter((e) => e.at >= startOfMonth).reduce((sum, e) => sum + e.earnings, 0);
  const totalDeliveries = entries.length;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Earnings</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Today", value: `$${today.toFixed(2)}`, icon: DollarSign },
          { label: "This Week", value: `$${thisWeek.toFixed(2)}`, icon: TrendingUp },
          { label: "This Month", value: `$${thisMonth.toFixed(2)}`, icon: Calendar },
          { label: "Total Deliveries", value: totalDeliveries.toString(), icon: Package },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center space-y-1">
              <s.icon className="h-5 w-5 text-accent mx-auto" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly chart (simple bar chart) */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold mb-4">Weekly Earnings</h2>
          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium">${d.amount}</span>
                <div
                  className="w-full rounded-t-md bg-accent/80"
                  style={{ height: `${(d.amount / maxAmount) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
