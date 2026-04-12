import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-display font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            Your payment was not processed. Your cart items are still saved — you can try again anytime.
          </p>
          <div className="flex flex-col gap-2 w-full pt-2">
            <Button onClick={() => navigate("/customer/cart")} className="w-full">
              Return to Cart
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
