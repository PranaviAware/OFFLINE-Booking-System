import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'officelink-super-secret-jwt-key-2026-production-grade',
  jwtIssuer: process.env.JWT_ISSUER || 'officelink-auth',
  jwtAudience: process.env.JWT_AUDIENCE || 'officelink-api',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
};
