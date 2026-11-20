const API_BASE_URL = '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...customConfig } = options;
  
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customConfig.headers as Record<string, string>),
  };

  const config: RequestInit = {
    ...customConfig,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export const inventoryService = {
  getAll: () => api.get<any[]>('/items'),
  getItems: () => api.get<any[]>('/items'),
  create: (data: any) => api.post<any>('/items', data),
  addItem: (data: any | string, price?: number) => {
    if (typeof data === 'string') {
      return api.post<any>('/items', { name: data, price });
    }
    return api.post<any>('/items', data);
  },
  createItem: (data: any) => api.post<any>('/items', data),
  update: (id: number | string, data: any) => api.patch<any>(`/items/${id}`, data),
  updateItem: (id: number | string, data: any) => api.patch<any>(`/items/${id}`, data),
  delete: (id: number | string) => api.delete<any>(`/items/${id}`),
  deleteItem: (id: number | string) => api.delete<any>(`/items/${id}`),
};