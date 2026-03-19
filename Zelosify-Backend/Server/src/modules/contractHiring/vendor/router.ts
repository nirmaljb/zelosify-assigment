/**
 * Vendor Contract Hiring Router
 * 
 * Routes for IT_VENDOR contract hiring operations.
 * All routes require authentication and IT_VENDOR role.
 */

import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../../middlewares/auth/authorizeMiddleware.js";
import * as vendorController from "./controller.js";
import * as uploadController from "./uploadController.js";
import * as previewController from "./previewController.js";

const router = Router();

// Apply authentication and IT_VENDOR authorization to all routes
const authMiddleware: RequestHandler[] = [
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
];

/**
 * GET /openings
 * Fetch paginated openings for vendor's tenant
 */
router.get(
  "/openings",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await vendorController.getOpenings(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * GET /openings/:id
 * Fetch opening detail including vendor's uploaded profiles
 */
router.get(
  "/openings/:id",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await vendorController.getOpeningDetail(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * POST /openings/:id/profiles/presign
 * Generate presigned upload URL(s) for profile upload
 */
router.post(
  "/openings/:id/profiles/presign",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await uploadController.presignUpload(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * POST /openings/:id/profiles/upload
 * Submit uploaded profiles (creates DB records)
 */
router.post(
  "/openings/:id/profiles/upload",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await uploadController.submitProfiles(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * GET /profiles/:id/preview
 * Stream profile file from S3 through backend (inline display)
 */
router.get(
  "/profiles/:id/preview",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await previewController.previewProfile(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * GET /profiles/:id/download-url
 * Generate temporary download URL for profile file
 */
router.get(
  "/profiles/:id/download-url",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await previewController.getDownloadUrl(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

/**
 * DELETE /profiles/:id
 * Soft delete a profile uploaded by this vendor
 */
router.delete(
  "/profiles/:id",
  ...authMiddleware,
  (async (req, res, next) => {
    try {
      await vendorController.softDeleteProfile(req as any, res);
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
);

export default router;
