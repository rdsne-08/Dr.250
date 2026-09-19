import { loginUser, logoutUser, registerUser } from '../services/auth.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function register(request, response) {
  const profile = await registerUser(request.validatedBody);

  sendSuccess(response, {
    user: profile,
  }, 201);
}

export async function login(request, response) {
  const result = await loginUser(request.validatedBody);

  response.set('Cache-Control', 'no-store');
  sendSuccess(response, {
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    expires_in: result.expiresIn,
    token_type: result.tokenType,
    user: result.profile,
    role: result.profile.role,
  });
}

export async function logout(request, response) {
  await logoutUser(request.authToken);
  response.status(204).send();
}

export function me(request, response) {
  sendSuccess(response, {
    user: {
      id: request.user.id,
      email: request.user.email,
    },
    profile: request.user.profile,
    role: request.user.role,
  });
}
