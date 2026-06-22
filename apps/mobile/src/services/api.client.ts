// apps/mobile/src/services/api.client.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function request(method: string, path: string, body?: any, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const apiClient = {
  get:    (path: string, token?: string | null) => request('GET', path, undefined, token),
  post:   (path: string, body: any, token?: string | null) => request('POST', path, body, token),
  patch:  (path: string, body: any, token?: string | null) => request('PATCH', path, body, token),
  delete: (path: string, token?: string | null) => request('DELETE', path, undefined, token),
};
