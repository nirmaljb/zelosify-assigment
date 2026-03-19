/**
 * Upload Controller for Contract Hiring
 * 
 * Thin controller layer for upload operations.
 * Handles presign and submit endpoints.
 */

import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../types/typeIndex.js";
import * as uploadService from "./uploadService.js";

/**
 * POST /api/v1/vendor/openings/:id/profiles/presign
 * 
 * Generate presigned upload URL(s) for profile upload.
 * Supports single or batch presigning.
 */
export async function presignUpload(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const tenantId = req.user?.tenant?.tenantId;

    if (!tenantId) {
      res.status(403).json({ error: "Tenant context required" });
      return;
    }

    const { id: openingId } = req.params;

    if (!openingId) {
      res.status(400).json({ error: "Opening ID required" });
      return;
    }

    // Support both single file and batch requests
    const { files, fileName, contentType } = req.body;

    if (files && Array.isArray(files)) {
      // Batch presign
      const results = await uploadService.generatePresignedUrls(
        tenantId,
        openingId,
        files
      );
      res.status(200).json({ data: results });
    } else if (fileName && contentType) {
      // Single file presign
      const result = await uploadService.generatePresignedUrl(
        tenantId,
        openingId,
        { fileName, contentType }
      );
      res.status(200).json({ data: result });
    } else {
      res.status(400).json({
        error: "Either 'files' array or 'fileName' and 'contentType' required",
      });
    }
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    const message = error instanceof Error ? error.message : "Failed to generate presigned URL";
    res.status(400).json({ error: message });
  }
}

/**
 * POST /api/v1/vendor/openings/:id/profiles/upload
 * 
 * Submit uploaded profiles (creates DB records).
 * This should be called after files are uploaded to S3.
 */
export async function submitProfiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const tenantId = req.user?.tenant?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const { id: openingId } = req.params;

    if (!openingId) {
      res.status(400).json({ error: "Opening ID required" });
      return;
    }

    const { s3Keys } = req.body;

    if (!s3Keys || !Array.isArray(s3Keys) || s3Keys.length === 0) {
      res.status(400).json({ error: "s3Keys array required" });
      return;
    }

    // Validate s3Keys are strings
    const validS3Keys = s3Keys.filter(
      (key): key is string => typeof key === "string" && key.length > 0
    );

    if (validS3Keys.length === 0) {
      res.status(400).json({ error: "Valid s3Keys required" });
      return;
    }

    const result = await uploadService.submitProfiles(
      tenantId,
      openingId,
      userId,
      validS3Keys
    );

    res.status(201).json({
      message: `${result.created} profile(s) submitted successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error submitting profiles:", error);
    const message = error instanceof Error ? error.message : "Failed to submit profiles";
    res.status(400).json({ error: message });
  }
}
