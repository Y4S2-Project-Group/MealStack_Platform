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

  async uploadRestaurantImage(restaurantId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<{ imageUrl: string }>(`/restaurants/${restaurantId}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.imageUrl || (res as unknown as { imageUrl?: string }).imageUrl;
  },

  async deleteRestaurantImage(restaurantId: string) {
    await apiClient.delete(`/restaurants/${restaurantId}/image`);
  },

  async uploadMenuItemImage(restaurantId: string, itemId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<{ imageUrl: string }>(`/restaurants/${restaurantId}/menu/items/${itemId}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.imageUrl || (res as unknown as { imageUrl?: string }).imageUrl;
  },

  async deleteMenuItemImage(restaurantId: string, itemId: string) {
    await apiClient.delete(`/restaurants/${restaurantId}/menu/items/${itemId}/image`);
  },
};
