import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, MapPin, ArrowRight, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

const foodCategories = [
  { name: "Burgers", emoji: "🍔" },
  { name: "Pizza", emoji: "🍕" },
  { name: "Sushi", emoji: "🍣" },
  { name: "Pasta", emoji: "🍝" },
  { name: "Healthy", emoji: "🥗" },
  { name: "Dessert", emoji: "🍰" },
  { name: "Coffee", emoji: "☕" },
  { name: "BBQ", emoji: "🍖" },
];

function getRestaurantImage(restaurant: { _id: string; imageUrl?: string }) {
  // Use Cloudinary image if available, otherwise fallback to placeholder
  return restaurant.imageUrl || `https://picsum.photos/seed/restaurant-${restaurant._id}/800/400`;
}

const promos = [
  { title: "Free Delivery", subtitle: "On your first order", code: "WELCOME", bg: "from-primary to-primary/70" },
  { title: "20% Off", subtitle: "Use code YUMMY20", code: "YUMMY20", bg: "from-accent to-accent/70" },
];

export default function CustomerHome() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const filtered = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.address.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory ||
      r.name.toLowerCase().includes(activeCategory.toLowerCase()) ||
      r.address.toLowerCase().includes(activeCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const popular = restaurants.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-5 py-8 md:py-10 md:px-8 md:mx-4 md:mt-4 md:rounded-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/15 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-xs text-secondary font-medium">Discover local favorites</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground leading-tight">
            What are you<br />craving today?
          </h1>
          <p className="text-sm text-primary-foreground/80 mt-2 max-w-xs">
            Fresh meals from top restaurants, delivered to your door
          </p>

          {/* Search inside hero */}
          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants, cuisines, dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-card border-0 shadow-lg rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-5 pb-6">
        {/* Promo Cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {promos.map((p) => (
            <div
              key={p.code}
              className={`flex-shrink-0 w-52 bg-gradient-to-br ${p.bg} rounded-xl p-4 text-primary-foreground relative overflow-hidden`}
            >
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary-foreground/10 rounded-full" />
              <p className="text-lg font-bold">{p.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{p.subtitle}</p>
              <div className="mt-2 inline-block bg-primary-foreground/20 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded">
                {p.code}
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-base font-semibold mb-3">Browse by Category</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {foodCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                    : "bg-card text-foreground border-border hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Section */}
        {!search && !activeCategory && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">🔥 Popular Near You</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {popular.map((r) => (
                <Card
                  key={r._id}
                  className="flex-shrink-0 w-56 overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border-0 shadow-sm"
                  onClick={() => navigate(`/customer/restaurant/${r._id}`)}
                >
                  <div className="relative">
                    <img src={getRestaurantImage(r)} alt={r.name} className="w-full h-28 object-cover" />
                    <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" />4.6
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-2.5 w-2.5" />20-35 min · LKR 299 delivery
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Restaurants */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            {activeCategory ? `${activeCategory} Restaurants` : "All Restaurants"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <Card
                key={r._id}
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all hover:-translate-y-0.5 border-0 shadow-sm"
                onClick={() => navigate(`/customer/restaurant/${r._id}`)}
              >
                <div className="relative">
                  <img
                    src={getRestaurantImage(r)}
                    alt={r.name}
                    className="w-full h-40 object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  {!r.isOpen && (
                    <div className="absolute inset-0 bg-foreground/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-card text-foreground text-xs font-semibold px-4 py-1.5 rounded-full shadow">
                        Currently Closed
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-card/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-primary text-primary" />4.6
                  </div>
                  {r.isOpen && (
                    <div className="absolute top-2.5 right-2.5">
                      <Badge className="bg-accent text-accent-foreground text-[10px] border-0 shadow-sm">Open</Badge>
                    </div>
                  )}
                  {/* Gradient overlay at bottom */}
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-foreground/40 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <span className="text-primary-foreground text-xs font-medium bg-primary-foreground/10 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                      Local Kitchen
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{r.name}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.address}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />20-35 min
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>$2.99 delivery</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>Open {r.isOpen ? "now" : "later"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Loading restaurants...</p>}
          {filtered.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <span className="text-4xl">🍽️</span>
              <p className="text-muted-foreground text-sm">No restaurants found. Try a different search.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActiveCategory(null); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
