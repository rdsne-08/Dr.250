import { getAdminOperations, getDoctors, getLaboratories, getUsers, verifyEntity } from '../services/admin.service.js';
import { sendSuccess } from '../../../middleware/response.js';

export async function users(_request, response) {
  sendSuccess(response, { users: await getUsers() });
}

export async function doctors(_request, response) {
  sendSuccess(response, { doctors: await getDoctors() });
}

export async function laboratories(_request, response) {
  sendSuccess(response, { laboratories: await getLaboratories() });
}

export async function operations(_request, response) {
  sendSuccess(response, await getAdminOperations());
}

export async function verify(request, response) {
  const verification = await verifyEntity({
    id: request.validatedParams.id,
    ...request.validatedBody,
    adminUserId: request.user.id,
  });
  sendSuccess(response, { verification });
}
