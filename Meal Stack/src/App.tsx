import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import CustomerHome from "@/pages/customer/CustomerHome";
import RestaurantDetail from "@/pages/customer/RestaurantDetail";
import CartPage from "@/pages/customer/CartPage";
import CheckoutPage from "@/pages/customer/CheckoutPage";
import OrderTracking from "@/pages/customer/OrderTracking";
import PaymentSuccessPage from "@/pages/customer/PaymentSuccessPage";
import PaymentCancelPage from "@/pages/customer/PaymentCancelPage";
import CustomerProfile from "@/pages/customer/CustomerProfile";
import RestaurantDashboard from "@/pages/restaurant/RestaurantDashboard";
import MenuManagement from "@/pages/restaurant/MenuManagement";
import RestaurantOrders from "@/pages/restaurant/RestaurantOrders";
import RestaurantProfilePage from "@/pages/restaurant/RestaurantProfilePage";
import RiderDashboard from "@/pages/rider/RiderDashboard";
import ActiveDelivery from "@/pages/rider/ActiveDelivery";
import DeliveryHistory from "@/pages/rider/DeliveryHistory";
import EarningsSummary from "@/pages/rider/EarningsSummary";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function roleHomePath(role: string) {
  if (role === "restaurantAdmin") {
    return "/restaurant";
  }
  return `/${role}`;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        {/* Customer */}
        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/customer/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/checkout" element={<CheckoutPage />} />
        <Route path="/customer/tracking" element={<OrderTracking />} />
        <Route path="/customer/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/customer/payment/cancel" element={<PaymentCancelPage />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />

        {/* Restaurant */}
        <Route path="/restaurant" element={user.role === "restaurantAdmin" ? <RestaurantDashboard /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/restaurant/menu" element={user.role === "restaurantAdmin" ? <MenuManagement /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/restaurant/orders" element={user.role === "restaurantAdmin" ? <RestaurantOrders /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/restaurant/profile" element={user.role === "restaurantAdmin" ? <RestaurantProfilePage /> : <Navigate to={roleHomePath(user.role)} replace />} />

        {/* Rider */}
        <Route path="/rider" element={user.role === "rider" ? <RiderDashboard /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/rider/active" element={user.role === "rider" ? <ActiveDelivery /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/rider/history" element={user.role === "rider" ? <DeliveryHistory /> : <Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/rider/earnings" element={user.role === "rider" ? <EarningsSummary /> : <Navigate to={roleHomePath(user.role)} replace />} />

        {/* Redirect root to role dashboard */}
        <Route path="/" element={<Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
