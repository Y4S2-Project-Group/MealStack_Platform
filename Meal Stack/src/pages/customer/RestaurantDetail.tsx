import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Star,
  Clock,
  Plus,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

function getRestaurantImage(restaurant: { _id: string; imageUrl?: string }) {
  // Use Cloudinary image if available, otherwise fallback to placeholder
  return (
    restaurant.imageUrl ||
    `https://picsum.photos/seed/restaurant-${restaurant._id}/1200/500`
  );
}

function getMenuItemImage(item: { _id: string; imageUrl?: string }) {
  // Use Cloudinary image if available, otherwise fallback to placeholder
  return (
    item.imageUrl ||
    `https://picsum.photos/seed/menu-${item._id}/400/300`
  );
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
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading menu...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Restaurant not found
      </div>
    );
  }

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
    <div className="max-w-3xl mx-auto pb-28">
      {/* Hero Banner */}
      <div className="relative">
        <img
          src={getRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="w-full h-64 md:h-72 object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 left-5 bg-card/95 backdrop-blur-sm rounded-xl p-2.5 shadow-xl hover:bg-card hover:scale-105 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-secondary/90 text-secondary-foreground border-0 text-xs font-bold px-3 py-1 shadow-md">
              Local Kitchen
            </Badge>

            {restaurant.isOpen ? (
              <Badge className="bg-accent/90 text-accent-foreground border-0 text-xs px-3 py-1 shadow-md">
                Open Now
              </Badge>
            ) : (
              <Badge className="bg-destructive/90 text-destructive-foreground border-0 text-xs px-3 py-1 shadow-md">
                Closed
              </Badge>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold drop-shadow-lg">
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-card border-b px-6 py-4 flex items-center gap-5 text-sm text-muted-foreground shadow-sm">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Star className="h-4 w-4 fill-primary text-primary" />
          4.6
        </span>

        <span className="w-1.5 h-1.5 rounded-full bg-border" />

        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          20-35 min
        </span>

        <span className="w-1.5 h-1.5 rounded-full bg-border" />

        <span className="font-medium">LKR 299 delivery</span>
      </div>

      {/* Description */}
      <div className="px-6 py-5 bg-card/50">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {restaurant.address}
        </p>
      </div>

      {/* Menu Items */}
      <div className="px-5 space-y-4 mt-2">
        <h2 className="text-lg font-bold px-1">Menu</h2>

        {items.map((item) => (
          <Card
            key={item._id}
            className={`overflow-hidden border-0 shadow-md transition-all duration-300 ${
              !item.isAvailable
                ? "opacity-60"
                : "hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            <CardContent className="p-0 flex">
              <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0">
                <img
                  src={getMenuItemImage(item)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />

                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs bg-card text-foreground font-bold px-3 py-1 rounded-lg shadow-lg">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold leading-tight">
                      {item.name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-primary">
                    LKR {item.price.toFixed(2)}
                  </span>

                  <Button
                    size="sm"
                    disabled={!item.isAvailable}
                    onClick={() => handleAddToCart(item._id)}
                    className="h-9 text-sm gap-2 rounded-xl px-5 shadow-md hover:shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floating cart CTA - fixed alignment */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 md:left-[170px] right-0 z-30 pointer-events-none">
          <div className="max-w-3xl mx-auto px-5 pointer-events-auto">
            <Button
              className="w-full h-14 rounded-2xl shadow-2xl text-base font-bold gap-2 hover:scale-[1.02] transition-all"
              onClick={() => navigate("/customer/cart")}
            >
              View Cart ({itemCount})
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}