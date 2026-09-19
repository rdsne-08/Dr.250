export function notFoundHandler(request, response) {
  response.status(404).json({
    error: 'Not Found',
    path: request.originalUrl,
  });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  response.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : error.message,
  });
}
