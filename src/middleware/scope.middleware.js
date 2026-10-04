import { ForbiddenError } from '../utils/errors.js';

/**
 * Middleware / helper to enforce department scoping
 * SUPER_ADMIN, ADMIN, and PRINCIPAL have global college-level scope.
 * HOD, TEACHER, and STUDENT are constrained to their respective department.
 */
export const requireDepartmentScope = (getDepartmentIdFn) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next(new ForbiddenError('Authentication required'));
    }

    // Global roles bypass department boundary
    if (['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'].includes(user.role)) {
      return next();
    }

    const targetDepartmentId = typeof getDepartmentIdFn === 'function'
      ? getDepartmentIdFn(req)
      : req.params.departmentId || req.body.departmentId || req.query.departmentId;

    if (!targetDepartmentId) {
      return next(new ForbiddenError('Target department context is missing'));
    }

    if (user.departmentId !== targetDepartmentId) {
      return next(
        new ForbiddenError(
          `Department boundary violation: You do not have permission for department ${targetDepartmentId}`
        )
      );
    }

    next();
  };
};

/**
 * Middleware to enforce self-ownership or elevated role
 */
export const requireSelfOrRoles = (getTargetUserIdFn, ...elevatedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (elevatedRoles.includes(user.role)) {
      return next();
    }

    const targetUserId = typeof getTargetUserIdFn === 'function'
      ? getTargetUserIdFn(req)
      : req.params.userId || req.params.id;

    if (user.id !== targetUserId) {
      return next(
        new ForbiddenError('Access denied: You can only access or modify your own resource')
      );
    }

    next();
  };
};
