import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const PAYMENT_BASE = "http://localhost:4004";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [status, setStatus] = useState<"confirming" | "confirmed" | "error">("confirming");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("confirmed"); // no orderId to confirm, just show success
      return;
    }

    // Call the local dev simulate endpoint to confirm payment
    // (Stripe webhooks can't reach localhost, so we do this manually)
    fetch(`${PAYMENT_BASE}/payments/simulate-success`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d?.message || "Failed"));
        return res.json();
      })
      .then(() => setStatus("confirmed"))
      .catch((err) => {
        console.error("Payment confirmation failed:", err);
        setErrorMsg(typeof err === "string" ? err : "Could not confirm payment");
        setStatus("error");
      });
  }, [orderId]);

  if (status === "confirming") {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h1 className="text-xl font-display font-bold">Confirming Payment...</h1>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-display font-bold">Payment Received</h1>
            <p className="text-muted-foreground text-sm">
              Your payment was processed by Stripe. There was an issue confirming the order status ({errorMsg}), but your order should be updated shortly.
            </p>
            <div className="flex flex-col gap-2 w-full pt-2">
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
