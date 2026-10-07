function authorize(...allowedRoles) {
  return function checkUserRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue.",
        errors: [],
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
        errors: [],
      });
    }

    next();
  };
}

module.exports = authorize;
