// Role-based permission middleware
// Defines what each role can do

const ROLE_PERMISSIONS = {
  owner: {
    // Owner has full access
    tables: ["create", "read", "update", "delete"],
    staff: ["create", "read", "update", "delete"],
    restaurant: ["read", "update"],
    orders: ["read"],
    dashboard: ["read"],
  },
  manager: {
    // Manager can manage tables, staff, and restaurant profile
    tables: ["create", "read", "update", "delete"],
    staff: ["create", "read", "update"],
    restaurant: ["read", "update"],
    orders: ["read"],
    dashboard: ["read"],
  },
  staff: {
    // Staff can only view
    tables: ["read"],
    staff: [],
    restaurant: ["read"],
    orders: ["read"],
    dashboard: ["read"],
  },
};

/**
 * Check if a role has permission for a resource and action
 * @param {string} role - User role (owner, manager, staff)
 * @param {string} resource - Resource type (tables, staff, restaurant, etc)
 * @param {string} action - Action (create, read, update, delete)
 * @returns {boolean}
 */
const hasPermission = (role, resource, action) => {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  
  return resourcePerms.includes(action);
};

/**
 * Middleware to check role permission
 * Usage: router.post("/tables", protectPartner, checkPermission("tables", "create"), createTable)
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.partner) {
      return res.status(401).json({
        success: false,
        message: "Chưa xác thực.",
      });
    }

    const role = req.partner.role || "staff";
    
    if (!hasPermission(role, resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò ${role} không có quyền ${action} ${resource}.`,
      });
    }

    next();
  };
};

/**
 * Middleware to ensure only owner or manager can manage staff
 */
const checkStaffManagementPermission = (req, res, next) => {
  const role = req.partner?.role || "staff";
  
  if (!["owner", "manager"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Chỉ chủ hoặc quản lí mới có quyền quản lí nhân viên.",
    });
  }
  
  next();
};

module.exports = {
  checkPermission,
  checkStaffManagementPermission,
  hasPermission,
  ROLE_PERMISSIONS,
};
