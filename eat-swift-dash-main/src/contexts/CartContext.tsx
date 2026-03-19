import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CartItem } from '@/types';
import type { MenuItem } from '@/lib/api';

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (item: MenuItem) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'mealstack-cart';

function loadInitial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextType>({
  items: [],
  restaurantId: null,
  itemCount: 0,
  subtotal: 0,
  deliveryFee: 2.99,
  total: 2.99,
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);

  const persist = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addItem = (item: MenuItem) => {
    setItems((prev) => {
      const sameRestaurant = prev.length === 0 || prev[0].restaurantId === item.restaurantId;
      const base = sameRestaurant ? prev : [];
      const idx = base.findIndex((p) => p.menuItemId === item._id);
      let next: CartItem[];

      if (idx >= 0) {
        next = base.map((p, i) => (i === idx ? { ...p, quantity: p.quantity + 1 } : p));
      } else {
        next = [
          ...base,
          {
            menuItemId: item._id,
            restaurantId: item.restaurantId,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
          },
        ];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    const next = items
      .map((item) => (item.menuItemId === menuItemId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    persist(next);
  };

  const removeItem = (menuItemId: string) => {
    persist(items.filter((item) => item.menuItemId !== menuItemId));
  };

  const clearCart = () => {
    persist([]);
  };

  const computed = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = items.length > 0 ? 2.99 : 0;
    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      restaurantId: items[0]?.restaurantId ?? null,
    };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId: computed.restaurantId,
        itemCount: computed.itemCount,
        subtotal: computed.subtotal,
        deliveryFee: computed.deliveryFee,
        total: computed.total,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
