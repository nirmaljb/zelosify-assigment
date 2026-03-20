import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import prisma from "../../config/prisma/prisma.js";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080/auth";
const REALM_NAME = process.env.KEYCLOAK_REALM || "Zelosify";

const keycloakJwksClient = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM_NAME}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// ✅ Extend Express Request to Include User Property
declare module "express-serve-static-core" {
  interface Request {
    user?: any;
  }
}

// Cache for user data
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware for logout - validates token but doesn't require user to exist in DB
 * This allows logout to work even if the user was deleted from the database
 */
export const authenticateForLogout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.access_token;

    // If no token, still allow logout (just clear cookies)
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) {
      // Invalid token format, but still allow logout to clear cookies
      req.user = null;
      return next();
    }

    // Try to verify token, but don't fail if verification fails
    try {
      const key = await keycloakJwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const verified = jwt.verify(token, signingKey, {
        algorithms: ["RS256"],
        issuer: `${KEYCLOAK_URL}/realms/${REALM_NAME}`,
      }) as jwt.JwtPayload;

      if (verified && typeof verified === "object") {
        // Try to get user from DB, but don't fail if not found
        const user = await prisma.user.findUnique({
          where: { externalId: verified.sub },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            department: true,
            provider: true,
            tenant: {
              select: {
                tenantId: true,
                companyName: true,
              },
            },
          },
        });

        // Set user if found, otherwise set basic info from token
        req.user = user || { 
          externalId: verified.sub, 
          provider: "KEYCLOAK",
          _fromToken: true 
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      // Token verification failed, but still allow logout
      console.log("Token verification failed during logout, proceeding anyway");
      req.user = null;
    }

    next();
  } catch (error) {
    console.error("Logout authentication error:", error);
    // Still allow logout even if there's an error
    req.user = null;
    next();
  }
};

// 🔹 Middleware: Authenticate User & Refresh Token If Expired
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.access_token;

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) {
      res.status(401).json({ message: "Invalid token format" });
      return;
    }

    // Verify token
    try {
      const key = await keycloakJwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const verified = jwt.verify(token, signingKey, {
        algorithms: ["RS256"],
        issuer: `${KEYCLOAK_URL}/realms/${REALM_NAME}`,
      }) as jwt.JwtPayload;

      if (!verified || typeof verified !== "object") {
        throw new Error("Token verification failed");
      }

      // Check cache first
      const cachedUser = userCache.get(verified.sub);
      if (cachedUser && cachedUser.timestamp > Date.now() - USER_CACHE_TTL) {
        req.user = cachedUser.data;
        return next();
      }

      const user = await prisma.user.findUnique({
        where: { externalId: verified.sub },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          department: true,
          provider: true,
          tenant: {
            select: {
              tenantId: true,
              companyName: true,
            },
          },
        },
      });

      if (!user) {
        console.log(`❌ User not found: ${verified.sub}`);
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Update cache
      userCache.set(verified.sub, {
        data: user,
        timestamp: Date.now(),
      });
      console.log("Authenticate Middleware Passed ✅ : ", user);

      req.user = user;
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
