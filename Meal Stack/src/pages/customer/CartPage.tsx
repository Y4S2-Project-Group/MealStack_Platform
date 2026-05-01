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
    <div className="p-5 max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Your Cart</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your items before checkout</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="text-muted-foreground text-sm mt-1">Add some delicious items to get started</p>
          </div>
          <Button size="lg" onClick={() => navigate("/customer")} className="mt-4">Browse Restaurants</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.menuItemId} className="overflow-hidden shadow-md border-0">
                <CardContent className="p-4 flex items-center gap-4">
                  <img src={imageForMenu(item.menuItemId)} alt={item.name} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold truncate">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">LKR {item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-background" 
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-base font-bold w-8 text-center">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-background" 
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                      onClick={() => removeItem(item.menuItemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">LKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-semibold">LKR {deliveryFee.toFixed(2)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">LKR {total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            size="lg" 
            className="w-full font-bold text-base h-14 rounded-2xl shadow-xl hover:scale-[1.02] transition-all" 
            onClick={() => navigate("/customer/checkout")}
          >
            Proceed to Checkout
          </Button>
        </>
      )}
    </div>
  );
}
