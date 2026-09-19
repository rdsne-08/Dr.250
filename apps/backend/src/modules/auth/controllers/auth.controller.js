import { loginUser, logoutUser, registerUser } from '../services/auth.service.js';

export async function register(request, response) {
  const profile = await registerUser(request.validatedBody);

  response.status(201).json({
    user: profile,
  });
}

export async function login(request, response) {
  const result = await loginUser(request.validatedBody);

  response.set('Cache-Control', 'no-store');
  response.status(200).json({
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
  response.status(200).json({
    user: request.user,
  });
}
