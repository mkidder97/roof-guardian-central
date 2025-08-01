/**
 * Authentication utility functions for handling timeouts and errors
 */

export interface AuthTimeoutError extends Error {
  name: 'AuthTimeoutError';
  isTimeout: true;
  isCorsRelated?: boolean;
}

/**
 * Wraps a promise with a timeout to prevent hanging indefinitely
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 10000,
  operation: string = 'Authentication operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error = new Error(`${operation} timed out after ${timeoutMs}ms`) as AuthTimeoutError;
        error.name = 'AuthTimeoutError';
        error.isTimeout = true;
        error.isCorsRelated = true;
        reject(error);
      }, timeoutMs);
    })
  ]);
}

/**
 * Detects if an error is likely caused by CORS issues
 */
export function isCorsError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString?.()?.toLowerCase() || '';
  
  return (
    errorMessage.includes('cors') ||
    errorMessage.includes('cross-origin') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('failed to fetch') ||
    errorString.includes('cors') ||
    error.name === 'AuthTimeoutError'
  );
}

/**
 * Creates a user-friendly error message for authentication failures
 */
export function getAuthErrorMessage(error: any): string {
  if (error?.name === 'AuthTimeoutError') {
    return 'Connection timeout - please check your internet connection and try again';
  }
  
  if (isCorsError(error)) {
    return 'Connection issue detected - please refresh the page or try again';
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Authentication error - please try again';
}