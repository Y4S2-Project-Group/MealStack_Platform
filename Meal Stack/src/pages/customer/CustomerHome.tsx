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
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 py-10 md:py-12 md:px-10 md:mx-4 md:mt-4 md:rounded-3xl shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-secondary animate-pulse" />
            <span className="text-sm text-secondary font-semibold tracking-wide">Discover local favorites</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground leading-tight mb-3">
            What are you<br />craving today?
          </h1>
          <p className="text-base text-primary-foreground/90 max-w-md leading-relaxed">
            Fresh meals from top restaurants, delivered to your door
          </p>

          {/* Search inside hero */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search restaurants, cuisines, dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-card border-0 shadow-2xl rounded-2xl text-base font-medium"
            />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8 mt-6 pb-8">
        {/* Promo Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {promos.map((p) => (
            <div
              key={p.code}
              className={`flex-shrink-0 w-60 bg-gradient-to-br ${p.bg} rounded-2xl p-5 text-primary-foreground relative overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer`}
            >
              <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-primary-foreground/15 rounded-full" />
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-primary-foreground/10 rounded-full" />
              <div className="relative z-10">
                <p className="text-xl font-bold mb-1">{p.title}</p>
                <p className="text-sm opacity-90 mb-3">{p.subtitle}</p>
                <div className="inline-block bg-primary-foreground/25 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                  {p.code}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-lg font-bold mb-4">Browse by Category</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {foodCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md hover:scale-105"
                }`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Section */}
        {!search && !activeCategory && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">🔥</span> Popular Near You
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {popular.map((r) => (
                <Card
                  key={r._id}
                  className="flex-shrink-0 w-64 overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-0 shadow-md"
                  onClick={() => navigate(`/customer/restaurant/${r._id}`)}
                >
                  <div className="relative">
                    <img src={getRestaurantImage(r)} alt={r.name} className="w-full h-36 object-cover" />
                    <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />4.6
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-base truncate">{r.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                      <Clock className="h-3.5 w-3.5" />20-35 min · LKR 299 delivery
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Restaurants */}
        <div>
          <h2 className="text-lg font-bold mb-4">
            {activeCategory ? `${activeCategory} Restaurants` : "All Restaurants"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtered.map((r) => (
              <Card
                key={r._id}
                className="overflow-hidden cursor-pointer group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md"
                onClick={() => navigate(`/customer/restaurant/${r._id}`)}
              >
                <div className="relative">
                  <img
                    src={getRestaurantImage(r)}
                    alt={r.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {!r.isOpen && (
                    <div className="absolute inset-0 bg-foreground/70 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-card text-foreground text-sm font-bold px-5 py-2 rounded-xl shadow-lg">
                        Currently Closed
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />4.6
                  </div>
                  {r.isOpen && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-accent text-accent-foreground text-xs border-0 shadow-lg px-3 py-1">Open Now</Badge>
                    </div>
                  )}
                  {/* Gradient overlay at bottom */}
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-foreground/50 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-primary-foreground text-xs font-bold bg-primary-foreground/20 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md">
                      Local Kitchen
                    </span>
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base leading-tight">{r.name}</h3>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{r.address}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />20-35 min
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    <span>LKR 299</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {isLoading && <p className="text-center text-muted-foreground py-8">Loading restaurants...</p>}
          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-16 space-y-4">
              <span className="text-6xl">🍽️</span>
              <div>
                <p className="text-lg font-semibold text-foreground">No restaurants found</p>
                <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
              </div>
              <Button variant="outline" size="lg" onClick={() => { setSearch(""); setActiveCategory(null); }} className="mt-4">
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
