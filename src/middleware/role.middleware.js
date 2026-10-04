import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware to authorize access based on user role(s)
 * @param  {...string} allowedRoles - List of permitted roles (e.g. 'PRINCIPAL', 'HOD', 'TEACHER')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before role verification'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
