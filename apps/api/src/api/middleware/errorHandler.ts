import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../observability/logger.js';
import { nanoid } from 'nanoid';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const traceId = (request.headers['x-trace-id'] as string) || `tr_${nanoid(12)}`;

  logger.error(
    {
      traceId,
      url: request.raw.url,
      method: request.raw.method,
      errorName: error.name,
      errorMessage: error.message,
      statusCode: error.statusCode,
    },
    'API Request Error'
  );

  let errorCode = 'INTERNAL_ERROR';
  let statusCode = error.statusCode || 500;
  let userMessage = 'An unexpected internal error occurred. Please retry shortly.';
  let retryable = false;

  if (error.validation || error.name === 'ZodError') {
    errorCode = 'VALIDATION_ERROR';
    statusCode = 400;
    userMessage = 'Request parameters failed validation.';
  } else if (statusCode === 401) {
    errorCode = 'AUTH_ERROR';
    userMessage = 'Authentication required.';
  } else if (statusCode === 403) {
    errorCode = 'PERMISSION_DENIED';
    userMessage = 'Access to this resource is prohibited.';
  } else if (statusCode === 429) {
    errorCode = 'RATE_LIMIT_EXCEEDED';
    userMessage = 'Rate limit exceeded. Please throttle requests.';
    retryable = true;
  } else if (error.message.includes('timeout')) {
    errorCode = 'UPSTREAM_TIMEOUT';
    statusCode = 504;
    userMessage = 'Upstream service timed out. Please try again.';
    retryable = true;
  } else if (error.message.includes('circuit breaker')) {
    errorCode = 'CIRCUIT_BREAKER_OPEN';
    statusCode = 503;
    userMessage = 'Service is temporarily degraded and shedding load.';
    retryable = true;
  }

  reply.status(statusCode).send({
    error_code: errorCode,
    message: userMessage,
    retryable,
    trace_id: traceId,
  });
}
