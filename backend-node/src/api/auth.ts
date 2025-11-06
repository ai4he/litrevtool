import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models';
import { createAccessToken } from '../core/security';
import { config } from '../core/config';
import { authenticate, AuthRequest } from './middleware/auth';
import logger from '../core/logger';

const router = Router();
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

// POST /auth/google - Authenticate with Google OAuth token
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ detail: 'Token is required' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ detail: 'Invalid Google token' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user exists
    let user = await User.findOne({ where: { googleId } });

    if (!user) {
      // Create new user
      user = await User.create({
        googleId,
        email: email!,
        name,
        picture,
      });
      logger.info(`New user created: ${email}`);
    } else {
      // Update existing user info
      user.email = email!;
      user.name = name;
      user.picture = picture;
      await user.save();
    }

    // Create JWT token
    const accessToken = createAccessToken({ sub: user.id });

    return res.json({ access_token: accessToken });
  } catch (error) {
    logger.error('Google auth error:', error);
    return res.status(401).json({ detail: 'Invalid Google token' });
  }
});

// GET /auth/me - Get current user information
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  return res.json(req.user);
});

export default router;
