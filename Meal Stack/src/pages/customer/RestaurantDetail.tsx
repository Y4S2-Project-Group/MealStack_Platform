import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Clock, Plus, ChevronRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import type { Restaurant, MenuItem } from "@/lib/api/contracts";

function getRestaurantImage(restaurant: { _id: string; imageUrl?: string }) {
  // Use Cloudinary image if available, otherwise fallback to placeholder
  return restaurant.imageUrl || `https://picsum.photos/seed/restaurant-${restaurant._id}/1200/500`;
}

function getMenuItemImage(item: { _id: string; imageUrl?: string }) {
  // Use Cloudinary image if available, otherwise fallback to placeholder
  return item.imageUrl || `https://picsum.photos/seed/menu-${item._id}/400/300`;
}

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, itemCount } = useCart();
  const { data: restaurant, isLoading: loadingRestaurant } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantApi.getRestaurant(id as string),
    enabled: Boolean(id),
  });

  const { data: items = [], isLoading: loadingMenu } = useQuery({
    queryKey: ["restaurant-menu", id],
    queryFn: () => restaurantApi.listMenuItems(id as string),
    enabled: Boolean(id),
  });

  if (loadingRestaurant || loadingMenu) {
    return <div className="p-8 text-center text-muted-foreground">Loading menu...</div>;
  }

  if (!restaurant)
    return (
      <div className="p-8 text-center text-muted-foreground">Restaurant not found</div>
    );

  const handleAddToCart = (menuItemId: string) => {
    const selected = items.find((item) => item._id === menuItemId);
    if (!selected) {
      return;
    }
    addItem(selected);
    toast.success(`${selected.name} added to cart`, {
      action: {
        label: "View Cart",
        onClick: () => navigate("/customer/cart"),
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto pb-6">
      {/* Hero Banner */}
      <div className="relative">
        <img
          src={getRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="w-full h-56 md:h-64 object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-card transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5 text-primary-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-secondary text-secondary-foreground border-0 text-[10px] font-bold">
              Local Kitchen
            </Badge>
            {restaurant.isOpen ? (
              <Badge className="bg-accent text-accent-foreground border-0 text-[10px]">Open Now</Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px]">Closed</Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">{restaurant.name}</h1>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-card border-b px-5 py-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          4.6
        </span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          20-35 min
        </span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span>LKR 299 delivery</span>
      </div>

      {/* Description */}
      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.address}</p>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        {items.map((item) => (
          <Card
            key={item._id}
            className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-all ${
              !item.isAvailable ? "opacity-50" : "hover:-translate-y-0.5"
            }`}
          >
            <CardContent className="p-0 flex">
              <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0">
                <img
                  src={getMenuItemImage(item)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <span className="text-[10px] bg-card text-foreground font-medium px-2 py-0.5 rounded-full">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold leading-tight">{item.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-bold text-primary">
                    LKR {item.price.toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    disabled={!item.isAvailable}
                    onClick={() => handleAddToCart(item._id)}
                    className="h-8 text-xs gap-1.5 rounded-full px-4 shadow-sm"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floating cart CTA */}
      <div className="fixed bottom-20 md:bottom-6 inset-x-0 px-4 max-w-3xl mx-auto z-30">
        <Button
          className="w-full h-12 rounded-xl shadow-lg text-sm font-bold gap-2"
          onClick={() => navigate("/customer/cart")}
        >
          View Cart ({itemCount})
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
