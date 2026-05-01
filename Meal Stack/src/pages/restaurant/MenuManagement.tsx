import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, UtensilsCrossed, Package, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { restaurantApi } from "@/lib/api";

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const selectedRestaurant = useMemo(() => {
    if (!restaurants.length || !user?.id) {
      return null;
    }
    return restaurants.find((r) => r.ownerUserId === user.id) ?? null;
  }, [restaurants, user?.id]);

  const { data: myItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["restaurant-menu", selectedRestaurant?._id],
    queryFn: () => restaurantApi.listMenuItems(selectedRestaurant?._id || ""),
    enabled: Boolean(selectedRestaurant?._id),
  });

  const filtered = myItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const availableCount = myItems.filter((i) => i.isAvailable).length;

  const handleCreate = async () => {
    if (!selectedRestaurant?._id) {
      toast.error("No restaurant selected");
      return;
    }
    if (!name.trim() || !price.trim()) {
      toast.error("Name and price are required");
      return;
    }

    try {
      await restaurantApi.createMenuItem(selectedRestaurant._id, {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        isAvailable: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      setName("");
      setDescription("");
      setPrice("");
      setShowAddForm(false);
      toast.success("Item added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add item");
    }
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    if (!selectedRestaurant?._id) return;
    try {
      await restaurantApi.updateMenuItem(selectedRestaurant._id, itemId, { isAvailable });
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      toast.success(`Item marked as ${isAvailable ? "available" : "unavailable"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update availability");
    }
  };

  const handleQuickEditPrice = async (itemId: string, currentPrice: number) => {
    if (!selectedRestaurant?._id) return;
    const input = window.prompt("Enter a new price", currentPrice.toFixed(2));
    if (input === null) return;
    const nextPrice = Number(input);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    try {
      await restaurantApi.updateMenuItem(selectedRestaurant._id, itemId, { price: nextPrice });
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      toast.success("Item price updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedRestaurant?._id) return;
    if (!window.confirm("Delete this menu item? This action cannot be undone.")) return;

    try {
      await restaurantApi.deleteMenuItem(selectedRestaurant._id, itemId);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      toast.success("Item deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    }
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!selectedRestaurant?._id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImageFor(itemId);
    try {
      await restaurantApi.uploadMenuItemImage(selectedRestaurant._id, itemId, file);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      toast.success("Menu item image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingImageFor(null);
      if (fileInputRefs.current[itemId]) {
        fileInputRefs.current[itemId]!.value = '';
      }
    }
  };

  const handleDeleteImage = async (itemId: string) => {
    if (!selectedRestaurant?._id) return;
    
    if (!window.confirm('Delete menu item image?')) return;

    try {
      await restaurantApi.deleteMenuItemImage(selectedRestaurant._id, itemId);
      await queryClient.invalidateQueries({ queryKey: ["restaurant-menu", selectedRestaurant._id] });
      toast.success("Menu item image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete image");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5 pb-8">
      {/* No Restaurant State */}
      {!loadingRestaurants && !selectedRestaurant && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No Restaurant Found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You need to create a restaurant profile before managing menu items.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/restaurant/profile'} 
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Restaurant Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      {selectedRestaurant && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-bold">Menu Items</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{myItems.length} items · {availableCount} available</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Restaurant: {selectedRestaurant.name}</p>
            </div>
            <Button size="sm" className="gap-1.5 rounded-full px-4 shadow-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
        </>
      )}

      {(loadingRestaurants || loadingItems) && <p className="text-sm text-muted-foreground">Loading menu...</p>}

      {/* Stats strip */}
      {selectedRestaurant && (
        <>
        <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Items", value: myItems.length, icon: UtensilsCrossed, color: "text-primary" },
          { label: "Available", value: availableCount, icon: Package, color: "text-accent" },
          { label: "Unavailable", value: myItems.length - availableCount, icon: UtensilsCrossed, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-0 shadow-sm rounded-xl"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Category filtering is unavailable until category is added to the backend menu contract.</p>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> New Menu Item
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Item name" className="bg-background rounded-lg" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Price" type="number" step="0.01" className="bg-background rounded-lg" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Input placeholder="Description" className="bg-background rounded-lg" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="rounded-full px-5 text-xs shadow-sm" onClick={() => void handleCreate()}>
                Save Item
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full px-5 text-xs" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={item._id} className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group ${!item.isAvailable ? "opacity-60" : "hover:-translate-y-0.5"}`}>
            <CardContent className="p-0 flex">
              <div className="relative w-28 h-28 shrink-0 bg-muted flex items-center justify-center group/image">
                {item.imageUrl ? (
                  <>
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeleteImage(item._id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/image:opacity-100 hover:bg-destructive/90 transition-opacity"
                      title="Delete image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No image</span>
                )}
                <input
                  ref={(el) => (fileInputRefs.current[item._id] = el)}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(item._id, file);
                  }}
                  className="hidden"
                  id={`menu-item-image-${item._id}`}
                />
                <button
                  onClick={() => fileInputRefs.current[item._id]?.click()}
                  disabled={uploadingImageFor === item._id}
                  className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover/image:opacity-100 hover:bg-primary/90 transition-opacity disabled:opacity-50"
                  title={item.imageUrl ? "Change image" : "Upload image"}
                >
                  {uploadingImageFor === item._id ? (
                    <span className="text-[8px]">...</span>
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold truncate">{item.name}</h3>
                    <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">{item.isAvailable ? "Available" : "Unavailable"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description || "No description"}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-base font-bold text-primary">${item.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={(checked) => void handleToggleAvailability(item._id, checked)}
                      className="scale-90"
                    />
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-secondary"
                        onClick={() => void handleQuickEditPrice(item._id, item.price)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDeleteItem(item._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <span className="text-3xl">🍽️</span>
          <p className="text-sm text-muted-foreground">No items match your search.</p>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setSearch("")}>
            Clear Filters
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
