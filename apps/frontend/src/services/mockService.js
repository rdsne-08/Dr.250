export class MockServiceError extends Error {
  constructor(message, code = 'MOCK_SERVICE_ERROR') {
    super(message);
    this.name = 'MockServiceError';
    this.code = code;
  }
}

export function mockResponse(data, options = {}) {
  const { delay = 220, errorMessage = 'Unable to load this information.', simulateError = false } = options;

  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (simulateError) {
        reject(new MockServiceError(errorMessage));
        return;
      }

      resolve(data);
    }, delay);
  });
}
