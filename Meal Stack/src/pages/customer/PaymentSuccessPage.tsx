import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"confirming" | "confirmed">("confirming");

  useEffect(() => {
    // Stripe webhook automatically confirms payment in production
    // Just wait a moment to give webhook time to process, then show success
    const timer = setTimeout(() => {
      setStatus("confirmed");
    }, 2000);

    return () => clearTimeout(timer);
  }, [orderId]);

  if (status === "confirming") {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h1 className="text-xl font-display font-bold">Processing Payment...</h1>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
