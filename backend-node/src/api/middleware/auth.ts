import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../core/security';
import { User } from '../../models';

export interface AuthRequest extends Request {
  user?: User;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ detail: 'Invalid authentication credentials' });
    }

    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ detail: 'Invalid authentication credentials' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ detail: 'User is not active' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Authentication failed' });
  }
}
