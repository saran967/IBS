import { UnauthorizedError } from "../Error/customError.js";

export const checkAccess = (roles = [], module = null, action = null) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) throw new UnauthorizedError("Authentication required");

    if (roles.length && !roles.includes(user.role)) {
      throw new UnauthorizedError("You do not have access to perform this action");
    }

    // admin/superadmin full access
    if (user.role === "admin" || user.role === "superadmin") return next();

    if (module) {
      const perms = Array.isArray(user.permissions) ? user.permissions : [];

      const allowed =
        perms.includes(module) ||
        perms.includes(`${module}s`) ||
        (action ? perms.includes(`${module}-${action}`) : false);

      if (!allowed) {
        throw new UnauthorizedError(
          `You don't have ${action || "required"} access for ${module}`,
        );
      }
    }

    next();
  };
};
