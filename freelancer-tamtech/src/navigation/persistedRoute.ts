import type { UserRole } from "../types"

export type AuthenticatedRoute = `/${string}`

const ROLE_PREFIXES: Partial<Record<UserRole, string>> = {
  admin: "/(admin)",
  sales_agent: "/(sales-record)",
  freelancer: "/(freelancer)",
}

const TRANSIENT_ROUTES = new Set<string>([
  "/(sales-record)/form",
])

export function getDefaultAuthenticatedRoute(role: UserRole): AuthenticatedRoute {
  return (ROLE_PREFIXES[role] || "/login") as AuthenticatedRoute
}

export function isAuthenticatedRouteForRole(pathname: string, role: UserRole): boolean {
  const prefix = ROLE_PREFIXES[role]
  return Boolean(prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`)))
}

export function shouldPersistAuthenticatedRoute(pathname: string, role: UserRole): boolean {
  return isAuthenticatedRouteForRole(pathname, role)
}

export function getRestorableAuthenticatedRoute(
  savedPathname: string | null | undefined,
  role: UserRole,
): AuthenticatedRoute {
  const fallback = getDefaultAuthenticatedRoute(role)
  if (!savedPathname || !isAuthenticatedRouteForRole(savedPathname, role)) return fallback
  if (TRANSIENT_ROUTES.has(savedPathname)) return fallback
  return savedPathname as AuthenticatedRoute
}
