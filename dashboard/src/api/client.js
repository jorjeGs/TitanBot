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

  if (options.body && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
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
    let errorMsg = data.message || data.error || `HTTP ${response.status}`;

    // If message contains raw Zod json or debug dump, convert to readable text
    if (typeof errorMsg === 'string') {
      if (errorMsg.startsWith('Validation failed: [')) {
        try {
          const raw = errorMsg.replace(/^Validation failed:\s*/, '');
          const issues = JSON.parse(raw);
          if (Array.isArray(issues) && issues.length > 0) {
            errorMsg = issues.map((iss) => {
              const field = iss.path?.length > 0 ? `El campo "${iss.path.join('.')}"` : 'El formulario';
              return `${field}: ${iss.message === 'Required' ? 'es obligatorio' : iss.message}`;
            }).join('. ');
          }
        } catch {}
      } else if (errorMsg === 'Required') {
        errorMsg = 'Faltan campos obligatorios en el formulario.';
      }
    }

    // If issues array was returned directly in JSON payload
    if (Array.isArray(data.issues) && data.issues.length > 0) {
      errorMsg = data.issues.map((iss) => {
        const field = iss.path?.length > 0 ? `"${iss.path.join('.')}"` : 'Formulario';
        return `${field}: ${iss.message === 'Required' ? 'es obligatorio' : iss.message}`;
      }).join(' • ');
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
