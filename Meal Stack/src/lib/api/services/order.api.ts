import { apiClient } from '../client';
import type { Order } from '../contracts';

interface CreateOrderResponse {
  orderId: string;
  status: string;
  total: number;
  checkoutUrl: string;
}

export const orderApi = {
  async createOrder(payload: { restaurantId: string; items: { menuItemId: string; quantity: number }[] }) {
    const res = await apiClient.post<CreateOrderResponse>('/orders', payload);
    const body = res.data || (res as unknown as CreateOrderResponse);
    return {
      orderId: body.orderId,
      status: body.status,
      total: body.total,
      checkoutUrl: body.checkoutUrl,
    };
  },

  async getMyOrders() {
    const res = await apiClient.get<{ orders: Order[] }>('/orders/my');
    return res.data?.orders || (res as unknown as { orders?: Order[] }).orders || [];
  },

  async getOrder(id: string) {
    const res = await apiClient.get<{ order: Order }>(`/orders/${id}`);
    return res.data?.order || (res as unknown as { order?: Order }).order;
  },

  async getRestaurantOrders(restaurantId: string) {
    const res = await apiClient.get<{ orders: Order[] }>(`/orders/restaurant/${restaurantId}`);
    return res.data?.orders || (res as unknown as { orders?: Order[] }).orders || [];
  },

  async updateRestaurantOrderStatus(orderId: string, status: 'ASSIGNED_TO_RIDER' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'DELIVERED') {
    const res = await apiClient.patch<{ order: Order }>(`/orders/${orderId}/restaurant-status`, { status });
    return res.data?.order || (res as unknown as { order?: Order }).order;
  },

  async acceptOrder(orderId: string) {
    const res = await apiClient.post<{ order: Order }>(`/orders/${orderId}/restaurant/accept`, {});
    return res.data?.order || (res as unknown as { order?: Order }).order;
  },

  async rejectOrder(orderId: string, reason: string) {
    const res = await apiClient.post<{ order: Order }>(`/orders/${orderId}/restaurant/reject`, { reason });
    return res.data?.order || (res as unknown as { order?: Order }).order;
  },

  async proceedWithOrder(orderId: string) {
    const res = await apiClient.post<{ order: Order }>(`/orders/${orderId}/restaurant/proceed`, {});
    return res.data?.order || (res as unknown as { order?: Order }).order;
  },
};
