import multer from 'multer';

import { HttpError } from '../../../middleware/http-error.js';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new HttpError(400, 'Report files must be PDF, JPG, or PNG.', {
        code: 'INVALID_REPORT_FILE',
      }));
    }
    callback(null, true);
  },
});

export function parseReportUpload(request, response, next) {
  upload.single('file')(request, response, (error) => {
    if (!error) return next();
    if (error instanceof HttpError) return next(error);
    if (error instanceof multer.MulterError) {
      return next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Report files must not exceed 10 MB.'
        : 'The report upload is invalid.', {
        code: 'INVALID_REPORT_FILE',
      }));
    }
    next(error);
  });
}
