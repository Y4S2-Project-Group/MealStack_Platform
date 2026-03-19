import { apiClient } from '../client';
import type { MenuItem, Restaurant } from '../contracts';

export const restaurantApi = {
  async listRestaurants() {
    const res = await apiClient.get<{ restaurants: Restaurant[] }>('/restaurants');
    return res.data?.restaurants || (res as unknown as { restaurants?: Restaurant[] }).restaurants || [];
  },

  async getRestaurant(id: string) {
    const res = await apiClient.get<{ restaurant: Restaurant }>(`/restaurants/${id}`);
    return res.data?.restaurant || (res as unknown as { restaurant?: Restaurant }).restaurant;
  },

  async createRestaurant(payload: { name: string; address: string; isOpen?: boolean }) {
    const res = await apiClient.post<{ restaurant: Restaurant }>('/restaurants', payload);
    return res.data?.restaurant || (res as unknown as { restaurant?: Restaurant }).restaurant;
  },

  async listMenuItems(restaurantId: string) {
    const res = await apiClient.get<{ items: MenuItem[] }>(`/restaurants/${restaurantId}/menu/items`);
    return res.data?.items || (res as unknown as { items?: MenuItem[] }).items || [];
  },

  async createMenuItem(restaurantId: string, payload: { name: string; description?: string; price: number; isAvailable?: boolean }) {
    const res = await apiClient.post<{ item: MenuItem }>(`/restaurants/${restaurantId}/menu/items`, payload);
    return res.data?.item || (res as unknown as { item?: MenuItem }).item;
  },

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    payload: { name?: string; description?: string; price?: number; isAvailable?: boolean }
  ) {
    const res = await apiClient.patch<{ item: MenuItem }>(`/restaurants/${restaurantId}/menu/items/${itemId}`, payload);
    return res.data?.item || (res as unknown as { item?: MenuItem }).item;
  },

  async deleteMenuItem(restaurantId: string, itemId: string) {
    await apiClient.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`);
  },
};
