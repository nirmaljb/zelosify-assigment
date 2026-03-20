/**
 * Vendor Contract Hiring Router
 * 
 * Routes for IT_VENDOR contract hiring operations.
 * All routes require authentication and IT_VENDOR role.
 */

import { Router, type RequestHandler } from "express";
import multer from "multer";
import { authenticateUser } from "../../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../../middlewares/auth/authorizeMiddleware.js";
import * as vendorController from "./controller.js";
import * as uploadController from "./uploadController.js";
import * as previewController from "./previewController.js";
import * as directUploadController from "./directUploadController.js";

const router = Router();

// Configure multer for memory storage (files stay in memory before S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Max 10 files at once
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and PPTX files are allowed"));
    }
  },
});

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
 * POST /openings/:id/profiles/direct-upload
 * Upload files directly through backend to S3 (bypasses CORS)
 * Accepts multipart form data with 'files' field
 */
router.post(
  "/openings/:id/profiles/direct-upload",
  ...authMiddleware,
  upload.array("files", 10),
  (async (req, res, next) => {
    try {
      await directUploadController.directUpload(req as any, res);
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
