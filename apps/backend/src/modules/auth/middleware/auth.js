import { supabaseAuth } from '../../../config/supabase.js';
import { HttpError } from '../../../middleware/http-error.js';
import { findProfileByUserId } from '../services/profile.service.js';

function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function authenticate(request, _response, next) {
  try {
    const accessToken = getBearerToken(request.get('authorization'));

    if (!accessToken) {
      throw new HttpError(401, 'A Bearer access token is required.');
    }

    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error && (!Number.isInteger(error.status) || error.status >= 500)) {
      throw new HttpError(503, 'The authentication service is temporarily unavailable.');
    }

    if (error || !data?.user) {
      throw new HttpError(401, 'The authentication token is invalid or expired.');
    }

    const profile = await findProfileByUserId(data.user.id);

    if (!profile) {
      throw new HttpError(403, 'A profile is not available for this account.');
    }

    request.authToken = accessToken;
    request.user = {
      id: data.user.id,
      email: data.user.email ?? profile.email,
      role: profile.role,
      profile,
    };

    next();
  } catch (error) {
    next(error);
  }
}
