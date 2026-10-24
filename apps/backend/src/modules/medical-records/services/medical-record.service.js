import { logProviderRead } from '../../sessions/services/audit.service.js';
import { pool, query } from '../../../database/pool.js';
import { authorizePatientDataAccess } from '../../sessions/services/access.service.js';

function serializeRecord(record) {
  return {
    id: record.id,
    patient_id: record.patient_id,
    diagnosis: record.title,
    notes: record.description,
    attachments: record.document_url ? [record.document_url] : [],
    type: record.record_type,
    date: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function getMedicalRecords(user, patientId, database = pool) {
  await authorizePatientDataAccess(user, patientId, database);
  const result = await query(
    `
      SELECT id, patient_id, title, description, document_url,
             record_type, created_at, updated_at
      FROM public.medical_records
      WHERE patient_id = $1
      ORDER BY created_at DESC
    `,
    [patientId],
    database,
  );
  await logProviderRead(user, patientId, 'RECORDS_READ', database,
    { type: 'MEDICAL_RECORDS', id: patientId });
  return result.rows.map(serializeRecord);
}

export async function createMedicalRecord(user, record, database = pool) {
  await authorizePatientDataAccess(user, record.patientId, database);
  const result = await query(
    `
      INSERT INTO public.medical_records
        (patient_id, title, description, document_url, record_type, created_at)
      VALUES ($1, $2, $3, $4, 'DIAGNOSIS', COALESCE($5::timestamptz, now()))
      RETURNING id, patient_id, title, description, document_url,
                record_type, created_at, updated_at
    `,
    [
      record.patientId,
      record.diagnosis,
      record.notes ?? null,
      record.attachment ?? null,
      record.date ?? null,
    ],
    database,
  );
  return serializeRecord(result.rows[0]);
}
