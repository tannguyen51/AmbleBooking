export type PartnerRole = "owner" | "manager" | "staff";

export type PartnerPermission =
  | "dashboard:view"
  | "orders:view"
  | "orders:update_status"
  | "tables:view"
  | "tables:manage"
  | "restaurant_profile:view"
  | "restaurant_profile:edit"
  | "staff:view"
  | "staff:create"
  | "staff:update"
  | "staff:deactivate"
  | "notifications:view";

export const PARTNER_ROLE_PERMISSIONS: Record<PartnerRole, PartnerPermission[]> = {
  owner: [
    "dashboard:view",
    "orders:view",
    "orders:update_status",
    "tables:view",
    "tables:manage",
    "restaurant_profile:view",
    "restaurant_profile:edit",
    "staff:view",
    "staff:create",
    "staff:update",
    "staff:deactivate",
    "notifications:view",
  ],
  manager: [
    "dashboard:view",
    "orders:view",
    "orders:update_status",
    "tables:view",
    "tables:manage",
    "restaurant_profile:view",
    "restaurant_profile:edit",
    "notifications:view",
  ],
  staff: [
    "dashboard:view",
    "orders:view",
    "orders:update_status",
    "tables:view",
    "notifications:view",
  ],
};

export function hasPartnerPermission(
  role: PartnerRole | undefined,
  permission: PartnerPermission,
) {
  if (!role) return false;
  return PARTNER_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
