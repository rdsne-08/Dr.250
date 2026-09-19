export function notFoundHandler(request, response) {
  response.status(404).json({
    error: 'Not Found',
    path: request.originalUrl,
  });
}

export function errorHandler(error, _request, response, _next) {
  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const statusCode = isInvalidJson
    ? 400
    : Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: statusCode === 500
      ? 'Internal Server Error'
      : isInvalidJson
        ? 'Request body must contain valid JSON.'
        : error.message,
  });
}
