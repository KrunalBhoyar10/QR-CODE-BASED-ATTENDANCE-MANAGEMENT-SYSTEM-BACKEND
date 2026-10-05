/**
 * Standard API response wrappers
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null, pagination = null) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(pagination !== null && { pagination }),
  };
  return res.status(statusCode).json(payload);
};

export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', error = {}) => {
  const payload = {
    success: false,
    message,
    error: error || {},
  };
  return res.status(statusCode).json(payload);
};
