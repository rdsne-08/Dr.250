import { getVerifiedLab } from '../services/lab.service.js';

export function createRequireVerifiedLab({ lookupLab = getVerifiedLab } = {}) {
  return async function verifiedLab(request, _response, next) {
    try {
      request.laboratory = await lookupLab(request.user.id);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireVerifiedLab = createRequireVerifiedLab();
