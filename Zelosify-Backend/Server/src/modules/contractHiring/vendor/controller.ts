/**
 * Vendor Contract Hiring Controller
 * 
 * Thin controller layer - handles request parsing, auth context extraction, and response formatting.
 * No business logic here per project contract.
 */

import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../types/typeIndex.js";
import * as vendorService from "./service.js";

/**
 * GET /api/v1/vendor/openings
 * 
 * Fetch paginated openings for the vendor's tenant.
 */
export async function getOpenings(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const tenantId = req.user?.tenant?.tenantId;

    if (!tenantId) {
      res.status(403).json({ error: "Tenant context required" });
      return;
    }

    // Parse pagination params with defaults
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const result = await vendorService.getOpeningsForVendor(tenantId, { page, limit });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching vendor openings:", error);
    res.status(500).json({ error: "Failed to fetch openings" });
  }
}

/**
 * GET /api/v1/vendor/openings/:id
 * 
 * Fetch opening detail for the vendor's tenant.
 * Includes only profiles uploaded by this vendor.
 */
export async function getOpeningDetail(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Opening ID required" });
      return;
    }

    const opening = await vendorService.getOpeningDetailForVendor(id, tenantId, userId);

    if (!opening) {
      res.status(404).json({ error: "Opening not found" });
      return;
    }

    res.status(200).json({ data: opening });
  } catch (error) {
    console.error("Error fetching opening detail:", error);
    res.status(500).json({ error: "Failed to fetch opening detail" });
  }
}

/**
 * DELETE /api/v1/vendor/profiles/:id
 * 
 * Soft delete a profile uploaded by this vendor.
 */
export async function softDeleteProfile(
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

    const deleted = await vendorService.softDeleteProfileForVendor(profileId, userId, tenantId);

    if (!deleted) {
      res.status(404).json({ error: "Profile not found or not authorized" });
      return;
    }

    res.status(200).json({ message: "Profile deleted", data: deleted });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ error: "Failed to delete profile" });
  }
}
