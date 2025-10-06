/**
 * API Helper for environment-aware URL construction
 * Handles local development (direct backend calls) vs production (nginx proxy)
 */

const getApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (process.env.NODE_ENV === 'development') {
    // Local development: call backend directly on port 3001
    return `http://localhost:3001/${cleanPath}`;
  } else {
    // Production: use relative URL (nginx will proxy)
    return `/${cleanPath}`;
  }
};

export { getApiUrl };
