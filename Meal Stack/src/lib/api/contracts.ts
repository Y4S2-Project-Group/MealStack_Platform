export type BackendRole = 'customer' | 'restaurantAdmin' | 'rider';

export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: BackendRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  address: string;
  isOpen: boolean;
  ownerUserId?: string | null;
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  _id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
  status: 'CREATED' | 'PENDING_PAYMENT' | 'PAID' | 'RESTAURANT_ACCEPTED' | 'RESTAURANT_REJECTED' | 'ASSIGNED_TO_RIDER' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'DELIVERED';
  createdAt: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    phone?: string;
  };
  payment?: {
    checkoutSessionId?: string;
    paymentStatus?: 'pending' | 'paid' | 'failed';
  };
  restaurant?: {
    acceptedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  };
  rider?: {
    riderId?: string;
    assignedAt?: string;
  };
}

export interface Delivery {
  _id: string;
  orderId: string;
  restaurantId: string;
  customerId: string;
  riderId?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';
  createdAt: string;
}
