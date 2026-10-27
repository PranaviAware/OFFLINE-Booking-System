import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { authenticateJWT } from '../middleware/auth';
import { db } from '../config/database';

export const authRouter = Router();

/**
 * Demo Users for immediate zero-config testing:
 * Alice -> Admin
 * Bob   -> User
 * Charlie -> User
 */
export const DEMO_USERS = {
  admin: {
    id: 'usr_alice_admin',
    email: 'alice.admin@officelink.com',
    name: 'Alice Admin',
    role: 'ADMIN',
    rolesClaim: ['Admin', 'User']
  },
  user1: {
    id: 'usr_bob_user',
    email: 'bob.user@officelink.com',
    name: 'Bob Employee',
    role: 'USER',
    rolesClaim: ['User']
  },
  user2: {
    id: 'usr_charlie_user',
    email: 'charlie.user@officelink.com',
    name: 'Charlie Employee',
    role: 'USER',
    rolesClaim: ['User']
  }
};

/**
 * Generates an authentic signed JWT matching OIDC Auth0 / Keycloak claims
 */
export function generateTokenForUser(user: typeof DEMO_USERS.admin) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    'https://officelink.app/roles': user.rolesClaim,
    roles: user.rolesClaim,
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
 * POST /api/v1/auth/demo-login
 * Allows selecting a demo persona (admin, user1, user2) to receive an authentic JWT token.
 */
authRouter.post('/demo-login', (req, res) => {
  const { persona } = req.body;
  const user = DEMO_USERS[persona as keyof typeof DEMO_USERS] || DEMO_USERS.user1;

  // Sync user record into database
  db.prepare(`
    INSERT INTO users (id, email, full_name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, role=excluded.role
  `).run(user.id, user.email, user.name, user.role);

  const token = generateTokenForUser(user);

  res.json({
    message: `Authenticated as ${user.name} (${user.role})`,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
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
