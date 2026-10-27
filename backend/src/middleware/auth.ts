import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication Middleware: Validates JWT token from Bearer header
 * Decodes claims and attaches user object to Express request
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT cryptographic signature, audience, and issuer
    const decoded = jwt.verify(token, config.jwtSecret, {
      audience: config.jwtAudience,
      issuer: config.jwtIssuer
    }) as any;

    // Extract roles from claims (supports both Auth0 namespace and standard realm claims)
    const rolesClaim: string[] = 
      decoded['https://officelink.app/roles'] || 
      decoded['roles'] || 
      (decoded.role ? [decoded.role] : []);

    const isAdmin = rolesClaim.some((r: string) => r.toLowerCase() === 'admin');

    req.user = {
      id: decoded.sub,
      email: decoded.email || decoded['https://officelink.app/email'] || 'unknown@officelink.com',
      name: decoded.name || 'Office Link User',
      role: isAdmin ? 'ADMIN' : 'USER'
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TokenExpired', message: 'JWT token has expired' });
    }
    return res.status(401).json({ error: 'InvalidToken', message: 'Cryptographic JWT verification failed' });
  }
};
