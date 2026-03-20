/**
 * Hiring Manager Contract Hiring Controller
 * 
 * Thin controller layer - handles request parsing, auth context extraction, and response formatting.
 * No business logic here per project contract.
 */

import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../types/typeIndex.js";
import * as hiringManagerService from "./service.js";
import prisma from "../../../config/prisma/prisma.js";

/**
 * GET /api/v1/hiring-manager/openings
 * 
 * Fetch paginated openings owned by the hiring manager.
 * Only returns openings where hiringManagerId === req.user.id
 */
export async function getOpenings(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    // Parse pagination params with defaults
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const result = await hiringManagerService.getOpeningsForHiringManager(
      userId,
      tenantId,
      { page, limit }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching hiring manager openings:", error);
    res.status(500).json({ error: "Failed to fetch openings" });
  }
}

/**
 * GET /api/v1/hiring-manager/openings/:id/profiles
 * 
 * Fetch profiles for an opening owned by the hiring manager.
 * Includes recommendation data (score, confidence, explanation, latency).
 */
export async function getOpeningProfiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const { id: openingId } = req.params;

    if (!openingId) {
      res.status(400).json({ error: "Opening ID required" });
      return;
    }

    const result = await hiringManagerService.getProfilesForOpening(
      openingId,
      userId,
      tenantId
    );

    if (!result) {
      res.status(404).json({ error: "Opening not found or not authorized" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Error fetching opening profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
}

/**
 * POST /api/v1/hiring-manager/profiles/:id/shortlist
 * 
 * Shortlist a profile. Only works for profiles in openings owned by this hiring manager.
 */
export async function shortlistProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    const result = await hiringManagerService.shortlistProfileForHiringManager(
      profileId,
      userId,
      tenantId
    );

    if (!result) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    res.status(200).json({
      message: "Profile shortlisted",
      data: result,
    });
  } catch (error) {
    console.error("Error shortlisting profile:", error);
    res.status(500).json({ error: "Failed to shortlist profile" });
  }
}

/**
 * POST /api/v1/hiring-manager/profiles/:id/reject
 * 
 * Reject a profile. Only works for profiles in openings owned by this hiring manager.
 */
export async function rejectProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    const result = await hiringManagerService.rejectProfileForHiringManager(
      profileId,
      userId,
      tenantId
    );

    if (!result) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    res.status(200).json({
      message: "Profile rejected",
      data: result,
    });
  } catch (error) {
    console.error("Error rejecting profile:", error);
    res.status(500).json({ error: "Failed to reject profile" });
  }
}

/**
 * GET /api/v1/hiring-manager/profiles/:id/download-url
 * 
 * Generate a temporary download URL for a profile file.
 * Only allows download of profiles in openings owned by this hiring manager.
 */
export async function getDownloadUrl(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    // Verify the profile belongs to an opening owned by this hiring manager
    const profile = await prisma.hiringProfile.findFirst({
      where: {
        id: profileId,
        isDeleted: false,
        opening: {
          tenantId,
          hiringManagerId: userId, // Must be owned by this hiring manager
        },
      },
      select: {
        id: true,
        s3Key: true,
        originalFileName: true,
      },
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    // Import storage adapter to generate presigned URL
    const storageAdapter = await import("../vendor/storageAdapter.js");
    const downloadUrl = await storageAdapter.generatePresignedDownloadUrl(profile.s3Key);

    res.status(200).json({
      data: {
        downloadUrl,
        fileName: profile.originalFileName || profile.s3Key.split("/").pop(),
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
}

/**
 * POST /api/v1/hiring-manager/profiles/:id/retry-recommendation
 * 
 * Retry AI recommendation for a profile.
 * Clears existing recommendation and re-triggers processing.
 */
export async function retryRecommendation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const profileId = parseInt(req.params.id);

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Valid profile ID required" });
      return;
    }

    const result = await hiringManagerService.retryProfileRecommendation(
      profileId,
      userId,
      tenantId
    );

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.status(200).json({
      message: result.message,
      data: { profileId, status: "processing" },
    });
  } catch (error) {
    console.error("Error retrying recommendation:", error);
    res.status(500).json({ error: "Failed to retry recommendation" });
  }
}

/**
 * GET /api/v1/hiring-manager/profiles/shortlisted
 * 
 * Fetch paginated shortlisted profiles across all openings owned by this hiring manager.
 */
export async function getShortlistedProfiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    // Parse pagination params with defaults
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await hiringManagerService.getProfilesByStatusForHiringManager(
      userId,
      tenantId,
      "SHORTLISTED",
      { page, limit }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching shortlisted profiles:", error);
    res.status(500).json({ error: "Failed to fetch shortlisted profiles" });
  }
}

/**
 * GET /api/v1/hiring-manager/profiles/rejected
 * 
 * Fetch paginated rejected profiles across all openings owned by this hiring manager.
 */
export async function getRejectedProfiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    // Parse pagination params with defaults
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await hiringManagerService.getProfilesByStatusForHiringManager(
      userId,
      tenantId,
      "REJECTED",
      { page, limit }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching rejected profiles:", error);
    res.status(500).json({ error: "Failed to fetch rejected profiles" });
  }
}

/**
 * GET /api/v1/hiring-manager/profiles/counts
 * 
 * Get counts for shortlisted and rejected profiles across all openings.
 */
export async function getProfileCounts(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenant?.tenantId;

    if (!userId || !tenantId) {
      res.status(403).json({ error: "Authentication context required" });
      return;
    }

    const counts = await hiringManagerService.getProfileCountsForHiringManager(
      userId,
      tenantId
    );

    res.status(200).json({ data: counts });
  } catch (error) {
    console.error("Error fetching profile counts:", error);
    res.status(500).json({ error: "Failed to fetch profile counts" });
  }
}
