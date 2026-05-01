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
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="space-y-4">
        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Delivery Address</h2>
            </div>
            <Input placeholder="Street address" defaultValue="123 Main St, Apt 4B" className="bg-background" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" defaultValue="San Francisco" className="bg-background" />
              <Input placeholder="ZIP Code" defaultValue="94102" className="bg-background" />
            </div>
            <Input placeholder="Delivery instructions (optional)" className="bg-background" />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Payment</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be securely redirected to Stripe to complete your payment after placing the order.
            </p>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <h2 className="font-semibold">Order Summary</h2>
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span>LKR {(item.unitPrice * item.quantity).toFixed(2)}</span></div>
            ))}
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>LKR {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>LKR {deliveryFee.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">LKR {total.toFixed(2)}</span></div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full font-semibold" disabled={submitting || items.length === 0}>{submitting ? "Placing Order..." : "Place Order"}</Button>
      </form>
    </div>
  );
}
