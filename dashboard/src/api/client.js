/**
 * Universal fetch wrapper for TitanBot REST API with credentials and error handling.
 */
export async function apiFetch(endpoint, options = {}) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}/api${cleanEndpoint}`;

  const defaultHeaders = {
    'Accept': 'application/json',
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 401 && !endpoint.includes('/auth/me')) {
    // Session expired, redirect to home page
    window.location.href = `${base || ''}/?error=session_expired`;
    throw new Error('Unauthorized');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return data;
}
