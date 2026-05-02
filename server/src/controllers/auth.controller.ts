// ================================================================
// AUTH CONTROLLER — Handles login, refresh, logout, profile
//
// Security: Refresh tokens are now set as HttpOnly cookies.
//   - HttpOnly: JavaScript cannot read the cookie (XSS-safe)
//   - Secure: Cookie only sent over HTTPS (in production)
//   - SameSite=Strict: Cookie not sent in cross-origin requests (CSRF-safe)
//   - Path=/api/auth: Cookie only sent to auth endpoints
// ================================================================
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import * as auditService from '../services/audit.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'cv_refresh_token';

/** Cookie options for the refresh token */
function getRefreshCookieOptions() {
  return {
    httpOnly: true,                              // Not accessible via JavaScript
    secure: env.NODE_ENV === 'production',        // HTTPS only in prod
    sameSite: 'strict' as const,                  // No cross-origin sending
    path: '/api/auth',                            // Only sent to auth routes
    maxAge: 7 * 24 * 60 * 60 * 1000,             // 7 days in ms
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    await auditService.logAudit({
      userId: result.user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: result.user.id,
      ipAddress: req.ip,
    });

    // Set refresh token as HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token manquant' });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    // Rotate: set new refresh token cookie
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user!.id);

    await auditService.logAudit({
      userId: req.user!.id,
      action: 'user.logout',
      resourceType: 'user',
      resourceId: req.user!.id,
      ipAddress: req.ip,
    });

    // Clear the refresh token cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    res.json({ success: true, data: { message: 'Déconnexion réussie' } });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getUserProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

