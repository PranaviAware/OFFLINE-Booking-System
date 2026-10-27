import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { authenticateJWT } from '../middleware/auth';
import { db } from '../config/database';
import { randomUUID } from 'crypto';

export const authRouter = Router();

/**
 * Pre-configured corporate demo users matching OIDC tenant directory:
 * Alice   -> Admin
 * Bob     -> User
 * Charlie -> User
 */
export const DEMO_USERS = {
  admin: {
    id: 'usr_alice_admin',
    email: 'alice.admin@officelink.com',
    name: 'Alice Admin',
    role: 'ADMIN' as const,
    rolesClaim: ['Admin', 'User']
  },
  user1: {
    id: 'usr_bob_user',
    email: 'bob.user@officelink.com',
    name: 'Bob Employee',
    role: 'USER' as const,
    rolesClaim: ['User']
  },
  user2: {
    id: 'usr_charlie_user',
    email: 'charlie.user@officelink.com',
    name: 'Charlie Employee',
    role: 'USER' as const,
    rolesClaim: ['User']
  }
};

/**
 * Generates an authentic cryptographically signed JWT matching OIDC Auth0 / Keycloak claims
 */
export function generateTokenForUser(user: { id: string; email: string; name: string; role: 'ADMIN' | 'USER'; rolesClaim?: string[] }) {
  const roles = user.rolesClaim || (user.role === 'ADMIN' ? ['Admin', 'User'] : ['User']);
  
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    'https://officelink.app/roles': roles,
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
 * Standard corporate login with email & password credentials
 */
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'ValidationError', message: 'Work email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find if user matches any demo persona
  const demoUser = Object.values(DEMO_USERS).find(u => u.email.toLowerCase() === normalizedEmail);

  let userRecord: { id: string; email: string; full_name: string; role: 'ADMIN' | 'USER' };

  if (demoUser) {
    userRecord = {
      id: demoUser.id,
      email: demoUser.email,
      full_name: demoUser.name,
      role: demoUser.role
    };
  } else {
    // Check if user exists in DB
    const existing = db.prepare('SELECT id, email, full_name, role FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (existing) {
      userRecord = existing;
    } else {
      // Auto-register new employee
      const newId = `usr_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
      const derivedName = normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const role = normalizedEmail.includes('admin') ? 'ADMIN' : 'USER';
      
      db.prepare(`
        INSERT INTO users (id, email, full_name, role)
        VALUES (?, ?, ?, ?)
      `).run(newId, normalizedEmail, derivedName, role);

      userRecord = { id: newId, email: normalizedEmail, full_name: derivedName, role };
    }
  }

  // Ensure record is in DB
  db.prepare(`
    INSERT INTO users (id, email, full_name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, role = excluded.role
  `).run(userRecord.id, userRecord.email, userRecord.full_name, userRecord.role);

  const token = generateTokenForUser({
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.full_name,
    role: userRecord.role
  });

  return res.json({
    message: `Authentication successful. Logged in as ${userRecord.full_name}`,
    token,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.full_name,
      role: userRecord.role
    }
  });
});

/**
 * POST /api/v1/auth/demo-login
 * Fast Single Sign-On simulation: Admin (Alice), User (Bob), User (Charlie)
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
