import { AppApiError, type ApiEnvelope, type ApiFailure } from './types';
import { tokenStore } from './token';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

// Use Vite's built-in environment variable support
// Empty string = same-origin (used with Vercel rewrites to proxy API calls)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);

function normalizeError(payload: unknown, status: number): ApiFailure {
  const obj = payload as {
    message?: string;
    error?: { code?: string; details?: unknown };
    meta?: { traceId?: string };
  };

  return {
    success: false,
    message: obj?.message || 'Request failed',
    code: obj?.error?.code || 'API_ERROR',
    status,
    details: obj?.error?.details,
    traceId: obj?.meta?.traceId,
  };
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildHeaders(custom?: Record<string, string>, isFormData = false) {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...custom,
  };

  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!isFormData && !custom?.['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const traceId = crypto.randomUUID();
  headers['x-trace-id'] = traceId;

  return headers;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

  try {
    // Check if body is FormData (for file uploads)
    const isFormData = options.body instanceof FormData;
    
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: buildHeaders(options.headers, isFormData),
      body: options.body !== undefined ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      signal: controller.signal,
    });

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw new AppApiError(normalizeError(payload, response.status));
    }

    return (payload as ApiEnvelope<T>) || { success: true, data: {} as T };
  } catch (error) {
    if (error instanceof AppApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppApiError({
        success: false,
        status: 408,
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
      });
    }

    throw new AppApiError({
      success: false,
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach server',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, headers?: Record<string, string>) => apiRequest<T>(path, { method: 'GET', headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'POST', body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'PATCH', body, headers }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'PUT', body, headers }),
  delete: <T>(path: string, headers?: Record<string, string>) => apiRequest<T>(path, { method: 'DELETE', headers }),
};
