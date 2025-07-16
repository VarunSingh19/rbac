// API Configuration
// Local Development Setup - Django-only backend

export const API_CONFIG = {
  // Django server (primary and only backend)
  DJANGO: {
    baseUrl: 'http://127.0.0.1:8000/api',
    port: 8000,
    name: 'Django Server'
  }
};

// Active server is Django only
export const ACTIVE_SERVER = API_CONFIG.DJANGO;

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (ACTIVE_SERVER.baseUrl.startsWith('http')) {
    // Full URL for external servers (like Django)
    return `${ACTIVE_SERVER.baseUrl}/${cleanEndpoint}`;
  } else {
    // Relative URL for same-origin servers (like Express)
    return `${ACTIVE_SERVER.baseUrl}/${cleanEndpoint}`;
  }
}

export function getServerInfo() {
  return {
    name: ACTIVE_SERVER.name,
    baseUrl: ACTIVE_SERVER.baseUrl,
    port: ACTIVE_SERVER.port
  };
}