import jwt from 'jsonwebtoken';
import config from '../config';

export interface TokenPayload {
  sub: string; // user ID
  exp?: number;
}

/**
 * Create a JWT access token
 * @param data Data to encode in the token (typically { sub: userId })
 * @param expiresInMinutes Optional expiration time in minutes
 * @returns Encoded JWT token
 */
export function createAccessToken(
  data: { sub: string },
  expiresInMinutes?: number
): string {
  const expiresIn = expiresInMinutes || config.security.accessTokenExpireMinutes;

  const token = jwt.sign(
    data,
    config.security.secretKey,
    {
      algorithm: 'HS256',
      expiresIn: `${expiresIn}m`,
    }
  );

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.security.secretKey, {
      algorithms: ['HS256'],
    }) as TokenPayload;

    return payload;
  } catch (error) {
    return null;
  }
}
