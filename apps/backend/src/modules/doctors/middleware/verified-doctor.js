import { getVerifiedDoctor } from '../services/doctor.service.js';

export function createRequireVerifiedDoctor({ lookupDoctor = getVerifiedDoctor } = {}) {
  return async function verifiedDoctor(request, _response, next) {
    try {
      request.doctor = await lookupDoctor(request.user.id);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireVerifiedDoctor = createRequireVerifiedDoctor();
