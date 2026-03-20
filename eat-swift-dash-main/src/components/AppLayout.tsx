import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingCart, User, ClipboardList, UtensilsCrossed, Package, MapPin, DollarSign, Bell, LogOut, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const customerTabs = [
  { label: "Home", icon: Home, path: "/customer" },
  { label: "Cart", icon: ShoppingCart, path: "/customer/cart" },
  { label: "Orders", icon: ClipboardList, path: "/customer/tracking" },
  { label: "Profile", icon: User, path: "/customer/profile" },
];

const restaurantTabs = [
  { label: "Dashboard", icon: Home, path: "/restaurant" },
  { label: "Menu", icon: UtensilsCrossed, path: "/restaurant/menu" },
  { label: "Orders", icon: ClipboardList, path: "/restaurant/orders" },
  { label: "Profile", icon: User, path: "/restaurant/profile" },
];

const riderTabs = [
  { label: "Dashboard", icon: Home, path: "/rider" },
  { label: "Delivery", icon: MapPin, path: "/rider/active" },
  { label: "History", icon: Package, path: "/rider/history" },
  { label: "Earnings", icon: DollarSign, path: "/rider/earnings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications: Array<{ id: string; title: string; message: string; time: string; read: boolean }> = [];

  if (!user) return <>{children}</>;

  const tabs = user.role === "customer" ? customerTabs : user.role === "restaurantAdmin" ? restaurantTabs : riderTabs;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-display font-bold text-primary">Meal Stack</span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full capitalize">{user.role}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="text-lg font-semibold mb-4">Notifications</SheetTitle>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 rounded-lg border ${n.read ? "bg-background" : "bg-secondary/50"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <Badge className="text-[10px] h-4">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop sidebar + content layout */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 bg-card border-r p-4 gap-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 pb-20 md:pb-4 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t z-40">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
