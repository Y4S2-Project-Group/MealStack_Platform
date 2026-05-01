import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { MapPin, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { orderApi } from "@/lib/api";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { items, restaurantId, subtotal, deliveryFee, total, clearCart } = useCart();

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId || items.length === 0) {
      toast.error("Your cart is empty.");
      navigate("/customer/cart");
      return;
    }

    setSubmitting(true);
    try {
      const created = await orderApi.createOrder({
        restaurantId,
        items: items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
      });
      clearCart();

      if (created.checkoutUrl) {
        window.location.href = created.checkoutUrl;
        return;
      }

      navigate(`/customer/tracking?orderId=${created.orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Checkout</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete your order details</p>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-5">
        {/* Delivery Address */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Delivery Address</h2>
            </div>
            <Input 
              placeholder="Street address" 
              defaultValue="123 Main St, Apt 4B" 
              className="bg-background" 
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input 
                placeholder="City" 
                defaultValue="San Francisco" 
                className="bg-background" 
                required
              />
              <Input 
                placeholder="ZIP Code" 
                defaultValue="94102" 
                className="bg-background" 
                required
              />
            </div>
            <Input 
              placeholder="Delivery instructions (optional)" 
              className="bg-background" 
            />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Payment</h2>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                You will be securely redirected to Stripe to complete your payment after placing the order.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold">Order Summary</h2>
            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span className="font-semibold">LKR {(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2.5 text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">LKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-semibold">LKR {deliveryFee.toFixed(2)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">LKR {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          size="lg"
          className="w-full font-bold text-base h-14 rounded-2xl shadow-xl hover:scale-[1.02] transition-all" 
          disabled={submitting || items.length === 0}
        >
          {submitting ? "Placing Order..." : "Place Order"}
        </Button>
      </form>
    </div>
  );
}
