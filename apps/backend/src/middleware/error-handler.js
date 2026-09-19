export function notFoundHandler(_request, response) {
  response.status(404).json({
    success: false,
    message: 'The requested API route was not found.',
    error: 'NOT_FOUND',
  });
}

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return _next(error);

  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const isOperationalError = Number.isInteger(error.statusCode);
  const statusCode = isInvalidJson
    ? 400
    : isOperationalError
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  const errorNames = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };
  const message = isInvalidJson
    ? 'Request body must contain valid JSON.'
    : isOperationalError
      ? error.message
      : 'An unexpected error occurred.';

  response.status(statusCode).json({
    success: false,
    message,
    error: error.code ?? errorNames[statusCode] ?? 'REQUEST_FAILED',
    ...(statusCode < 500 && error.details ? { details: error.details } : {}),
  });
}
