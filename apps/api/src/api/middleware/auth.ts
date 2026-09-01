import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config/index.js';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Check for Bearer token or fallback to default production tenant headers
  const authHeader = request.headers.authorization;
  const tenantHeader = request.headers['x-tenant-id'] as string;
  const userHeader = request.headers['x-user-id'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Decode JWT token payload
      const decoded = (request.server as any).jwt.verify(token) as any;
      request.user = {
        userId: decoded.sub || decoded.userId || config.DEFAULT_USER_ID,
        tenantId: decoded.tenantId || config.DEFAULT_TENANT_ID,
        role: decoded.role || 'member',
      };
      return;
    } catch {
      // In development / sandbox mode, accept with warning
      if (config.APP_ENV === 'development') {
        request.user = {
          userId: userHeader || config.DEFAULT_USER_ID,
          tenantId: tenantHeader || config.DEFAULT_TENANT_ID,
          role: 'admin',
        };
        return;
      }
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired authorization token.',
      });
    }
  }

  // Allow default tenant for initial out-of-the-box local setup
  request.user = {
    userId: userHeader || config.DEFAULT_USER_ID,
    tenantId: tenantHeader || config.DEFAULT_TENANT_ID,
    role: 'admin',
  };
}
