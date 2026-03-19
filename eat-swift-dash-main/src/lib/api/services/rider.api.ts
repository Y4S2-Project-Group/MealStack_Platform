import { apiClient } from '../client';
import type { Delivery } from '../contracts';

export const riderApi = {
  async listAvailable() {
    const res = await apiClient.get<{ deliveries: Delivery[] }>('/deliveries/available');
    return res.data?.deliveries || (res as unknown as { deliveries?: Delivery[] }).deliveries || [];
  },

  async acceptDelivery(orderId: string) {
    const res = await apiClient.post<{ delivery: Delivery }>(`/deliveries/${orderId}/accept`, {});
    return res.data?.delivery || (res as unknown as { delivery?: Delivery }).delivery;
  },

  async updateStatus(orderId: string, status: 'PICKED_UP' | 'DELIVERED') {
    const res = await apiClient.patch<{ delivery: Delivery }>(`/deliveries/${orderId}/status`, { status });
    return res.data?.delivery || (res as unknown as { delivery?: Delivery }).delivery;
  },
};
