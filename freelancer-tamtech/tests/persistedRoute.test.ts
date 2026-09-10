import assert from "node:assert/strict"
import test from "node:test"
import {
  getDefaultAuthenticatedRoute,
  getRestorableAuthenticatedRoute,
  getRestoreStack,
  isAuthenticatedRouteForRole,
  shouldPersistAuthenticatedRoute,
} from "../src/navigation/persistedRoute.ts"

test("role homes are stable authenticated defaults", () => {
  assert.equal(getDefaultAuthenticatedRoute("admin"), "/(admin)")
  assert.equal(getDefaultAuthenticatedRoute("sales_agent"), "/(sales-record)")
  assert.equal(getDefaultAuthenticatedRoute("freelancer"), "/(freelancer)")
  assert.equal(getDefaultAuthenticatedRoute("guest"), "/login")
})

test("authenticated routes are restricted to their role", () => {
  assert.equal(isAuthenticatedRouteForRole("/(admin)/review", "admin"), true)
  assert.equal(isAuthenticatedRouteForRole("/(sales-record)/form", "sales_agent"), true)
  assert.equal(isAuthenticatedRouteForRole("/(freelancer)/showroom/know-your-bike", "freelancer"), true)
  assert.equal(isAuthenticatedRouteForRole("/(admin)/review", "freelancer"), false)
  assert.equal(isAuthenticatedRouteForRole("/login", "admin"), false)
})

test("only role-owned authenticated locations are persisted", () => {
  assert.equal(shouldPersistAuthenticatedRoute("/(admin)/reports", "admin"), true)
  assert.equal(shouldPersistAuthenticatedRoute("/(public)/register", "admin"), false)
  assert.equal(shouldPersistAuthenticatedRoute("/login", "sales_agent"), false)
  assert.equal(shouldPersistAuthenticatedRoute("/", "freelancer"), false)
})

test("restoration uses the saved route or falls back to role home", () => {
  assert.equal(
    getRestorableAuthenticatedRoute("/(freelancer)/showroom", "freelancer"),
    "/(freelancer)/showroom",
  )
  assert.equal(getRestorableAuthenticatedRoute("/(admin)/users", "freelancer"), "/(freelancer)")
  assert.equal(getRestorableAuthenticatedRoute(null, "sales_agent"), "/(sales-record)")
})

test("restore stack always seeds the role home and pushes only a restorable screen", () => {
  // Nested saved screen -> stack [home, saved screen] so Back has a parent.
  assert.deepEqual(getRestoreStack("/(admin)/reports", "admin"), {
    home: "/(admin)",
    target: "/(admin)/reports",
  })
  assert.deepEqual(getRestoreStack("/(freelancer)/showroom", "freelancer"), {
    home: "/(freelancer)",
    target: "/(freelancer)/showroom",
  })
  // Saved home or fallback -> home only, never a duplicated push.
  assert.deepEqual(getRestoreStack("/(admin)", "admin"), { home: "/(admin)", target: null })
  assert.deepEqual(getRestoreStack(null, "sales_agent"), {
    home: "/(sales-record)",
    target: null,
  })
  // Transient, cross-role, or unknown routes fall back to home only.
  assert.deepEqual(getRestoreStack("/(sales-record)/form", "sales_agent"), {
    home: "/(sales-record)",
    target: null,
  })
  assert.deepEqual(getRestoreStack("/(admin)/users", "freelancer"), {
    home: "/(freelancer)",
    target: null,
  })
  assert.deepEqual(getRestoreStack("/(freelancer)/showroom/know-your-bike", "freelancer"), {
    home: "/(freelancer)",
    target: null,
  })
})

test("nested routes that require transient state fall back to the role home", () => {
  assert.equal(
    getRestorableAuthenticatedRoute("/(sales-record)/form", "sales_agent"),
    "/(sales-record)",
  )
  assert.equal(
    getRestorableAuthenticatedRoute("/(admin)/sales-list?filter=direct", "admin"),
    "/(admin)",
  )
  assert.equal(
    getRestorableAuthenticatedRoute("/(freelancer)/showroom/know-your-bike", "freelancer"),
    "/(freelancer)",
  )
})
