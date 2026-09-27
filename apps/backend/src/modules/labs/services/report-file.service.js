import { access, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HttpError } from '../../../middleware/http-error.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const reportUploadDirectory = path.resolve(moduleDirectory, '../../../../uploads/reports');
const extensions = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export async function removeReportFile(reportId) {
  await mkdir(reportUploadDirectory, { recursive: true });
  const names = await readdir(reportUploadDirectory);
  const matches = names.filter((name) => name.startsWith(`${reportId}.`));
  await Promise.all(matches.map((name) => unlink(path.join(reportUploadDirectory, name))));
}

export async function saveReportFile(reportId, file) {
  const extension = extensions[file?.mimetype];
  if (!extension || !file?.buffer?.length) {
    throw new HttpError(400, 'A valid report file is required.', {
      code: 'INVALID_REPORT_FILE',
    });
  }

  await removeReportFile(reportId);
  const filePath = path.join(reportUploadDirectory, `${reportId}${extension}`);
  await writeFile(filePath, file.buffer, { flag: 'wx' });
  return filePath;
}

export async function findReportFile(reportId) {
  for (const extension of Object.values(extensions)) {
    const filePath = path.join(reportUploadDirectory, `${reportId}${extension}`);
    try {
      await access(filePath);
      return filePath;
    } catch {
      // Try the next supported extension.
    }
  }

  throw new HttpError(404, 'The report file is unavailable.', { code: 'REPORT_FILE_NOT_FOUND' });
}
