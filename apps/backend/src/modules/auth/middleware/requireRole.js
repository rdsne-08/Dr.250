import { HttpError } from '../../../middleware/http-error.js';
import { SUPPORTED_ROLES } from './validation.js';

export function requireRole(...allowedRoles) {
  const configuredRoles = allowedRoles.flat();

  if (configuredRoles.length === 0 || configuredRoles.some((role) => typeof role !== 'string')) {
    throw new TypeError('requireRole must be configured with at least one supported role.');
  }

  const roles = configuredRoles.map((role) => role.toUpperCase());

  if (roles.some((role) => !SUPPORTED_ROLES.includes(role))) {
    throw new TypeError('requireRole must be configured with at least one supported role.');
  }

  return function roleAuthorization(request, _response, next) {
    if (!request.user) {
      return next(new HttpError(401, 'Authentication is required.'));
    }

    if (!roles.includes(request.user.role)) {
      return next(new HttpError(403, 'You do not have permission to access this resource.'));
    }

    return next();
  };
}
