import jwt from 'jsonwebtoken'

// Configuration
const DEFAULT_EXP_SECONDS = 15 * 60; // 15 minutes
const ISSUER = 'birdingatuva-admin';
const AUDIENCE = 'birdingatuva-events';

// Secret should come from env variable; fallback throws if missing.
function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-admin-jwt-secret-change-me';
  }
  throw new Error('ADMIN_JWT_SECRET env var not set');
}

export interface AdminTokenPayload {
  sub: string; // admin identifier (could be username or id)
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export function signAdminToken(adminId: string, expSeconds: number = DEFAULT_EXP_SECONDS): string {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: Partial<AdminTokenPayload> = {
    sub: adminId,
    iss: ISSUER,
    aud: AUDIENCE,
  };
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: expSeconds });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const secret = getSecret();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    return decoded as AdminTokenPayload;
  } catch (e) {
    return null;
  }
}

export function isTokenExpired(payload: AdminTokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}
