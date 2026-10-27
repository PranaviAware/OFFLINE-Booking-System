import { Request, Response, NextFunction } from 'express';

/**
 * RBAC Guard Middleware: Enforces role permissions on the backend
 * Does not trust frontend state; validates directly against verified JWT claims.
 */
export const requireRole = (allowedRoles: Array<'ADMIN' | 'USER'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to role evaluation'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Endpoint requires one of roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`
      });
    }

    next();
  };
};

/**
 * Shorthand for Admin-only routes
 */
export const requireAdmin = requireRole(['ADMIN']);
