import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/config/api";
import type { User, LoginData, RegisterData } from "@shared/schema";
import Cookies from 'js-cookie';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const apiUrl = getApiUrl("auth/me");
      console.log('[AUTH DEBUG] Checking auth at:', apiUrl);

      // Get token from cookie or localStorage for Authorization header
      let token = Cookies.get('sessionId');
      if (!token) {
        token = localStorage.getItem('sessionId');
        console.log('[AUTH DEBUG] Token from localStorage:', token);
      } else {
        console.log('[AUTH DEBUG] Token from cookie:', token);
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
        console.log('[AUTH DEBUG] Added Authorization header');
      } else {
        console.log('[AUTH DEBUG] No token found for auth check');
      }

      const res = await fetch(apiUrl, {
        method: "GET",
        headers,
        credentials: "include",
      });

      console.log('[AUTH DEBUG] Auth check response status:', res.status);

      if (res.status === 401) {
        console.log('[AUTH DEBUG] User not authenticated');
        return null; // Not authenticated
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      const userData = await res.json();
      console.log('[AUTH DEBUG] User authenticated:', userData);
      return userData;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnMount: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('[AUTH DEBUG] Login successful, data:', data);
      // Set the token as a cookie for Django backend compatibility
      if (data && data.sessionId) {
        console.log('[AUTH DEBUG] Setting sessionId cookie:', data.sessionId);

        // Store in both cookie and localStorage for reliability
        Cookies.set('sessionId', data.sessionId, {
          path: '/',
          sameSite: 'lax',   // Use 'lax' for localhost development
          secure: false      // Set to true in production with HTTPS
        });
        localStorage.setItem('sessionId', data.sessionId);

        // Verify cookie was set
        const setCookie = Cookies.get('sessionId');
        const localToken = localStorage.getItem('sessionId');
        console.log('[AUTH DEBUG] Cookie verification - retrieved:', setCookie);
        console.log('[AUTH DEBUG] LocalStorage verification - retrieved:', localToken);
        console.log('[AUTH DEBUG] All cookies:', document.cookie);
      }
      // Immediately set the user data in the cache
      queryClient.setQueryData(["/api/auth/me"], data.user);
      // Also invalidate to ensure fresh data after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }, 100);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Convert camelCase to snake_case for Django backend
      const backendData = {
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
      };

      console.log('[REGISTER DEBUG] Sending registration data:', backendData);
      const response = await apiRequest("POST", "/api/auth/register", backendData);
      return response.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      // Clear both cookie and localStorage
      Cookies.remove('sessionId', { path: '/' });
      localStorage.removeItem('sessionId');
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    loginLoading: loginMutation.isPending,
    registerLoading: registerMutation.isPending,
    logoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}