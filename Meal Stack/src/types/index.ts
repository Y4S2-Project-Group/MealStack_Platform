export type UserRole = 'customer' | 'restaurantAdmin' | 'rider';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
}

export interface CartItem {
  menuItemId: string;
  restaurantId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}
