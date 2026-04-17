/// <reference types="vite/client" />

/**
 * Base URL for public/data/... assets.
 * In static (file://) build, fetch to local files is blocked by CORS → use raw GitHub.
 */
export function getDataBaseUrl(): string {
  if (import.meta.env.MODE === 'static') {
    return 'https://raw.githubusercontent.com/uji69i/sampo-config/refs/heads/main/public/'
  }
  return import.meta.env.BASE_URL
}
