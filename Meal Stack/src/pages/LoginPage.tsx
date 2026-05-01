import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { BackendRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, Truck, Store } from "lucide-react";
import { toast } from "sonner";

const roles: { role: BackendRole; label: string; desc: string; icon: React.ElementType }[] = [
  { role: "customer", label: "Customer", desc: "Order delicious food", icon: UtensilsCrossed },
  { role: "restaurantAdmin", label: "Restaurant", desc: "Manage your restaurant", icon: Store },
  { role: "rider", label: "Rider", desc: "Deliver and earn", icon: Truck },
];

function roleHomePath(role: BackendRole) {
  return role === "restaurantAdmin" ? "/restaurant" : `/${role}`;
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<BackendRole>("customer");
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ name, email, password, role: selectedRole });
        navigate(roleHomePath(selectedRole));
        return;
      }

      await login(email, password);
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-2">
            <UtensilsCrossed className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-5xl font-display font-bold text-primary">Meal Stack</h1>
          <p className="text-muted-foreground text-base">Delicious food, delivered fast</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-3 gap-4">
          {roles.map(({ role, label, desc, icon: Icon }) => (
            <Card
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`cursor-pointer transition-all duration-200 ${
                selectedRole === role
                  ? "ring-2 ring-primary bg-primary/10 border-primary shadow-lg scale-105"
                  : "hover:border-primary/50 hover:shadow-md hover:scale-105 border-0 shadow-sm"
              }`}
            >
              <CardContent className="p-4 text-center space-y-2">
                <Icon className={`h-8 w-8 mx-auto transition-colors ${selectedRole === role ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Login form */}
        <Card className="shadow-2xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold text-center">
                {isRegister ? "Create Account" : "Welcome Back"}
              </h2>

              {isRegister && (
                <Input 
                  placeholder="Full Name" 
                  className="bg-background" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              )}
              <Input 
                type="email" 
                placeholder="Email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-background" 
                autoComplete="email" 
                required 
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-background" 
                autoComplete={isRegister ? "new-password" : "current-password"} 
                required 
              />

              <Button 
                type="submit" 
                size="lg"
                className="w-full text-base font-bold h-12 shadow-lg" 
                disabled={submitting}
              >
                {isRegister ? "Create Account" : "Sign In"} as {roles.find(r => r.role === selectedRole)?.label}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-primary font-bold hover:underline"
                >
                  {isRegister ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
