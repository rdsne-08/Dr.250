import { getDoctors, getLaboratories, getUsers, verifyEntity } from '../services/admin.service.js';

export async function users(_request, response) {
  response.status(200).json({ users: await getUsers() });
}

export async function doctors(_request, response) {
  response.status(200).json({ doctors: await getDoctors() });
}

export async function laboratories(_request, response) {
  response.status(200).json({ laboratories: await getLaboratories() });
}

export async function verify(request, response) {
  const verification = await verifyEntity({
    id: request.validatedParams.id,
    ...request.validatedBody,
    adminUserId: request.user.id,
  });
  response.status(200).json({ verification });
}
