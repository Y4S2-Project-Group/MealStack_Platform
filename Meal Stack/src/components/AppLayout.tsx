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
      <header className="sticky top-0 z-40 bg-card border-b px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-display font-bold text-primary">Meal Stack</span>
          <Badge className="text-xs px-3 py-1 capitalize shadow-sm">{user.role}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-muted/50">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">{unreadCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="text-xl font-bold mb-5">Notifications</SheetTitle>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-xl border transition-all ${
                    n.read ? "bg-background hover:bg-muted/50" : "bg-secondary/30 hover:bg-secondary/50 border-secondary"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.read && <Badge className="text-xs h-5 px-2">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">{n.time}</p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" className="hover:bg-muted/50" onClick={() => { logout(); navigate("/"); }}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop sidebar + content layout */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-card border-r p-5 gap-2">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 ${
                  active 
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" 
                    : "text-muted-foreground hover:bg-muted/70 hover:scale-[1.02]"
                }`}
              >
                <tab.icon className="h-5 w-5" />
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t z-40 shadow-lg">
        <div className="flex justify-around py-3">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 ${
                  active ? "text-primary scale-110" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
