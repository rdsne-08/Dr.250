import {
  createDoctorPrescription,
  getPatientPrescriptions,
} from '../services/prescription.service.js';

export async function listPrescriptions(request, response) {
  const prescriptions = await getPatientPrescriptions(
    request.user,
    request.validatedParams.patientId,
  );
  response.status(200).json({ prescriptions });
}

export async function createPrescription(request, response) {
  const prescription = await createDoctorPrescription(
    request.user,
    request.validatedBody,
    undefined,
    request.doctor,
  );
  response.status(201).json({ prescription });
}
