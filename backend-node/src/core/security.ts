import jwt from 'jsonwebtoken';
import { config } from './config';

export interface TokenPayload {
  sub: string;
  exp: number;
}

export function createAccessToken(data: { sub: string }, expiresIn?: number): string {
  const expirationMinutes = expiresIn || config.ACCESS_TOKEN_EXPIRE_MINUTES;
  const expirationSeconds = expirationMinutes * 60;

  const payload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
  };

  return jwt.sign(payload, config.SECRET_KEY, { algorithm: config.ALGORITHM as jwt.Algorithm });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.SECRET_KEY, {
      algorithms: [config.ALGORITHM as jwt.Algorithm],
    }) as TokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}
