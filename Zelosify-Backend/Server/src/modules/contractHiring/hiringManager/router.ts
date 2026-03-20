/**
 * Hiring Manager Contract Hiring Router
 * 
 * Routes for HIRING_MANAGER contract hiring operations.
 * All routes require authentication and HIRING_MANAGER role.
 */

import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../../middlewares/auth/authorizeMiddleware.js";
import * as hiringManagerController from "./controller.js";

const router = Router();

// Apply authentication and HIRING_MANAGER authorization to all routes
const authMiddleware: RequestHandler[] = [
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
];

/**
 * GET /openings
 * Fetch paginated openings owned by this hiring manager
 */
router.get(
  "/openings",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.getOpenings(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * GET /openings/:id/profiles
 * Fetch profiles for an opening with recommendation data
 */
router.get(
  "/openings/:id/profiles",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.getOpeningProfiles(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * POST /profiles/:id/shortlist
 * Shortlist a profile
 */
router.post(
  "/profiles/:id/shortlist",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.shortlistProfile(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * POST /profiles/:id/reject
 * Reject a profile
 */
router.post(
  "/profiles/:id/reject",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.rejectProfile(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * GET /profiles/:id/download-url
 * Generate temporary download URL for a profile
 */
router.get(
  "/profiles/:id/download-url",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.getDownloadUrl(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * POST /profiles/:id/retry-recommendation
 * Retry AI recommendation for a profile
 */
router.post(
  "/profiles/:id/retry-recommendation",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await hiringManagerController.retryRecommendation(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

export default router;
