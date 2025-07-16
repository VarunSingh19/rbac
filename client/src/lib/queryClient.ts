import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "../config/api";
import Cookies from 'js-cookie';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Try to get token from cookie first, then localStorage as fallback
  let token = Cookies.get('sessionId');
  if (!token) {
    token = localStorage.getItem('sessionId');
    console.log('[API DEBUG] Retrieved token from localStorage:', token);
  } else {
    console.log('[API DEBUG] Retrieved token from cookie:', token);
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`;
    console.log('[API DEBUG] Added Authorization header:', headers['Authorization']);
  } else {
    console.log('[API DEBUG] No token found in cookie or localStorage');
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Always use Django API URL for all requests
  const fullUrl = url.startsWith('http') ? url : getApiUrl(url.startsWith('/api') ? url.substring(4) : url);

  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  console.log('[API DEBUG] Making request to:', fullUrl);
  console.log('[API DEBUG] Request headers:', headers);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('[API DEBUG] Response status:', res.status);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Always use Django API URL for all requests
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url.startsWith('/api') ? url.substring(4) : url);

    const headers = getAuthHeaders();

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
