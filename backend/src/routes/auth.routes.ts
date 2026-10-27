import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config/config';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { db } from '../config/database';
import { randomUUID } from 'crypto';

export const authRouter = Router();

/**
 * Standard OIDC Discovery Document
 * Matches Keycloak / Auth0 well-known configuration
 */
authRouter.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: config.jwtIssuer,
    authorization_endpoint: `${config.clientOrigin}/login`,
    token_endpoint: `http://localhost:${config.port}/api/v1/auth/login`,
    userinfo_endpoint: `http://localhost:${config.port}/api/v1/auth/me`,
    jwks_uri: `http://localhost:${config.port}/api/v1/auth/jwks.json`,
    response_types_supported: ['token', 'id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256', 'RS256']
  });
});

/**
 * Generates an OIDC-compliant JWT containing Keycloak & Auth0 role claims
 */
export function generateOidcToken(user: { id: string; email: string; full_name: string; role: 'ADMIN' | 'USER' }) {
  const roleName = user.role === 'ADMIN' ? 'Admin' : 'User';
  const roles = user.role === 'ADMIN' ? ['Admin', 'User'] : ['User'];

  const payload = {
    // Standard OIDC Claims
    sub: user.id,
    email: user.email,
    email_verified: true,
    name: user.full_name,
    preferred_username: user.email,
    
    // Auth0 Namespaced Claims
    'https://officelink.app/roles': roles,
    'https://officelink.app/email': user.email,
    
    // Keycloak Realm Access Claims
    realm_access: {
      roles: roles
    },
    
    // Standard Claims
    roles: roles,
    role: user.role
  };

  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: '24h'
  });
}

/**
 * POST /api/v1/auth/login
 * Real credentials authentication using bcrypt
 */
authRouter.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user from DB
    const user = db.prepare('SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?')
      .get(normalizedEmail) as any;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Verify hashed password
    const passwordValid = user.password_hash && bcrypt.compareSync(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Issue OIDC JWT token
    const token = generateOidcToken(user);

    res.json({
      message: `Authentication successful. Welcome, ${user.full_name}`,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/register
 * Public self-registration for employees.
 * SECURITY GUARD: Automatically enforces role: 'USER'.
 * Public users cannot register as Admin!
 */
authRouter.post('/register', (req, res, next) => {
  try {
    const registerSchema = z.object({
      email: z.string().email('Invalid work email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      fullName: z.string().min(2, 'Full name is required')
    });

    const { email, password, fullName } = registerSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({
        error: 'UserExists',
        message: 'An account with this email already exists'
      });
    }

    const id = `usr_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const role = 'USER'; // Strictly USER for self-registration

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, normalizedEmail, passwordHash, fullName.trim(), role);

    const newUser = { id, email: normalizedEmail, full_name: fullName.trim(), role: 'USER' as const };
    const token = generateOidcToken(newUser);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.full_name,
        role: newUser.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/users
 * Admin-only: Create new users and assign role (USER or ADMIN).
 * SECURITY GUARD: Protected by requireAdmin middleware.
 * Only verified admins can create new admin accounts!
 */
authRouter.post('/users', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const createUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      role: z.enum(['ADMIN', 'USER'])
    });

    const { email, password, fullName, role } = createUserSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({
        error: 'UserExists',
        message: 'A user with this email already exists'
      });
    }

    const id = `usr_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, normalizedEmail, passwordHash, fullName.trim(), role);

    res.status(201).json({
      message: `User created successfully with role ${role}`,
      user: {
        id,
        email: normalizedEmail,
        name: fullName.trim(),
        role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/users
 * Admin-only: List all registered employees and their roles
 */
authRouter.get('/users', authenticateJWT, requireAdmin, (req, res, next) => {
  try {
    const users = db.prepare(`
      SELECT id, email, full_name as name, role, created_at 
      FROM users 
      ORDER BY role ASC, full_name ASC
    `).all();

    res.json({ count: users.length, data: users });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns decoded token claims verified by backend middleware
 */
authRouter.get('/me', authenticateJWT, (req, res) => {
  res.json({
    user: req.user,
    message: 'JWT signature and claims successfully validated by backend'
  });
});
