import { API_URL } from "../services/api";

export const WORKSPACE_DOMAIN = (import.meta.env.VITE_WORKSPACE_DOMAIN || "dashhr.app").toLowerCase();

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function isMainDomain(hostname = window.location.hostname) {
  const host = hostname.toLowerCase();
  return host === WORKSPACE_DOMAIN || host === `www.${WORKSPACE_DOMAIN}`;
}

export function normalizeWorkspace(input) {
  const host = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#:]/)[0];
  return host.split(".")[0];
}

export const isValidWorkspace = (slug) => SLUG_RE.test(slug) && slug !== "www";

export function workspaceUrl(slug, path = "/login") {
  const { protocol, port } = window.location;
  return `${protocol}//${slug}.${WORKSPACE_DOMAIN}${port ? `:${port}` : ""}${path}`;
}

export async function checkWorkspace(slug) {
  const res = await fetch(`${API_URL}/api/auth/login-method`, {
    headers: { "x-organization-slug": slug },
  });
  if (res.ok) return "ok";
  if (res.status === 404) return "missing";
  if (res.status === 403) return "inactive";
  throw new Error(`Workspace check failed with ${res.status}`);
}
