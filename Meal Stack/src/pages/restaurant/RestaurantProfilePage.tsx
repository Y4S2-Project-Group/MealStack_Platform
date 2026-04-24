import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

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
