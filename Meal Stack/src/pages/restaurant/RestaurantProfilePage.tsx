import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => restaurantApi.listRestaurants(),
  });

  const myRestaurant = useMemo(() => {
    if (!restaurants.length || !user?.id) {
      return null;
    }
    return restaurants.find((r) => r.ownerUserId === user.id) ?? null;
  }, [restaurants, user?.id]);

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) {
      toast.error("Name and address are required");
      return;
    }
    try {
      await restaurantApi.createRestaurant({ name: name.trim(), address: address.trim(), isOpen: true });
      await queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      setName("");
      setAddress("");
      toast.success("Restaurant created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create restaurant");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myRestaurant?._id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return{myRestaurant?.imageUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted">
                <img src={myRestaurant.imageUrl} alt={myRestaurant.name} className="w-full h-full object-cover" />
                {myRestaurant && (
                  <button
                    onClick={handleDeleteImage}
                    className="absolute top-0 right-0 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    title="Delete image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h2 className="font-semibold">{user?.name}</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {myRestaurant && (
            <div className="space-y-2">
              <Label className="text-xs">Restaurant Image</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="restaurant-image-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {myRestaurant.imageUrl ? 'Change Image' : 'Upload Image'}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Max size: 5MB. Formats: JPG, PNG, GIF, WebP
              </p>
            </div>
          )}

    setUploading(true);
    try {
      await restaurantApi.uploadRestaurantImage(myRestaurant._id, file);
      await queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      toast.success("Restaurant image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!myRestaurant?._id || !myRestaurant.imageUrl) return;
    
    if (!window.confirm('Delete restaurant image?')) return;

    try {
      await restaurantApi.deleteRestaurantImage(myRestaurant._id);
      await queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      toast.success("Restaurant image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete image");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-display font-bold">Restaurant Profile</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{user?.name}</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Loading restaurant profile...</p>}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Restaurant Name</Label>
              <Input value={myRestaurant?.name || name} onChange={(e) => setName(e.target.value)} className="bg-background" placeholder="Restaurant name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={myRestaurant?.address || address} onChange={(e) => setAddress(e.target.value)} className="bg-background" placeholder="Restaurant address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Input value={myRestaurant ? (myRestaurant.isOpen ? "Open" : "Closed") : "Not created"} className="bg-background" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Restaurant ID</Label>
                <Input value={myRestaurant?._id || "-"} className="bg-background" readOnly />
              </div>
            </div>
          </div>

          {myRestaurant ? (
            <Button className="w-full text-xs font-semibold" onClick={() => toast.info("Update endpoint is not exposed in the current contract")}>
              Save Changes
            </Button>
          ) : (
            <Button className="w-full text-xs font-semibold" onClick={() => void handleCreate()}>
              Create Restaurant
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
