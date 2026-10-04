import { verifyAccessToken } from '../utils/tokens.js';
import { UnauthorizedError } from '../utils/errors.js';
import userRepository from '../repositories/user.repository.js';

/**
 * Middleware to authenticate requests via Bearer JWT access token
 */
export const authenticateJwt = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active in database
    const user = await userRepository.findByIdWithProfiles(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    // Attach user context to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      teacherId: user.teacher?.id || null,
      studentId: user.student?.id || null,
      departmentId: user.teacher?.departmentId || user.student?.departmentId || user.headedDepartment?.id || null,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token invalid or expired'));
    }
    next(error);
  }
};
