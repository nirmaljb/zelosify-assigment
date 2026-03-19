/**
 * Preview Controller for Contract Hiring
 * 
 * Backend file preview - streams files from S3 through the backend.
 * Frontend never accesses S3 directly for downloads.
 */

import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../types/typeIndex.js";
import * as storageAdapter from "./storageAdapter.js";
import * as repository from "./repository.js";

/**
 * GET /api/v1/vendor/profiles/:id/preview
 * 
 * Stream a profile file from S3 through the backend.
 * Only allows preview of files uploaded by this vendor in their tenant.
 */
export async function previewProfile(
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

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    // Fetch profile with ownership verification
    const profiles = await repository.findProfilesByOpeningAndVendor(
      "", // We'll verify differently
      userId,
      tenantId
    );

    // Find the specific profile by ID (more direct approach)
    const profile = await getProfileForPreview(profileId, userId, tenantId);

    if (!profile) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    // Get file stream from S3
    const stream = await storageAdapter.getFileStream(profile.s3Key);
    
    // Determine content type from filename
    const contentType = storageAdapter.getContentType(profile.s3Key);
    
    // Extract filename for Content-Disposition
    const fileName = profile.s3Key.split("/").pop() || "profile";

    // Set appropriate headers for preview/download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");

    // Pipe the stream to response
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Error streaming file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream file" });
      }
    });
  } catch (error) {
    console.error("Error previewing profile:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to preview file" });
    }
  }
}

/**
 * Helper to get profile for preview with ownership verification
 */
async function getProfileForPreview(
  profileId: number,
  vendorUserId: string,
  tenantId: string
): Promise<{ id: number; s3Key: string } | null> {
  // Use Prisma directly for this specific query
  const prisma = (await import("../../../config/prisma/prisma.js")).default;

  const profile = await prisma.hiringProfile.findFirst({
    where: {
      id: profileId,
      uploadedBy: vendorUserId,
      isDeleted: false,
      opening: {
        tenantId,
      },
    },
    select: {
      id: true,
      s3Key: true,
    },
  });

  return profile;
}

/**
 * GET /api/v1/vendor/profiles/:id/download-url
 * 
 * Generate a temporary download URL for a profile file.
 * Only allows download of files uploaded by this vendor in their tenant.
 */
export async function getDownloadUrl(
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

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    const profile = await getProfileForPreview(profileId, userId, tenantId);

    if (!profile) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    // Generate presigned download URL
    const downloadUrl = await storageAdapter.generatePresignedDownloadUrl(profile.s3Key);

    res.status(200).json({
      data: {
        downloadUrl,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
}
