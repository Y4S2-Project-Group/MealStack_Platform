import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { orderApi } from "@/lib/api";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Try to find the order associated with this payment session
    orderApi.getMyOrders().then((orders) => {
      // Most recent order is likely the one just paid
      if (orders.length > 0) {
        setOrderId(orders[0]._id);
      }
    }).catch(() => {
      // Silently handle error - user can still navigate manually
    });
  }, [sessionId]);

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Your order has been confirmed and is being prepared. You can track your order in real-time.
          </p>
          <div className="flex flex-col gap-2 w-full pt-2">
            {orderId && (
              <Button onClick={() => navigate(`/customer/tracking?orderId=${orderId}`)} className="w-full">
                Track My Order
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/customer/profile")} className="w-full">
              View Order History
            </Button>
            <Button variant="ghost" onClick={() => navigate("/customer")} className="w-full">
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
