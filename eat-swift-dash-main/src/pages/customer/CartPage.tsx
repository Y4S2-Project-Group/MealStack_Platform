import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";

function imageForMenu(id: string) {
  return `https://picsum.photos/seed/cart-${id}/100/100`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items, subtotal, deliveryFee, total, updateQuantity, removeItem } = useCart();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">Your cart is empty</p>
          <Button variant="outline" onClick={() => navigate("/customer")}>Browse Restaurants</Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Review your items before checkout</p>
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.menuItemId}>
                <CardContent className="p-3 flex items-center gap-3">
                  <img src={imageForMenu(item.menuItemId)} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <p className="text-sm font-bold text-primary">${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.menuItemId)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>${deliveryFee.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
            </CardContent>
          </Card>

          <Button className="w-full font-semibold" onClick={() => navigate("/customer/checkout")}>
            Proceed to Checkout
          </Button>
        </>
      )}
    </div>
  );
}
