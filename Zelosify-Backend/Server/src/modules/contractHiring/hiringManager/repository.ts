/**
 * Hiring Manager Contract Hiring Repository
 * 
 * Data access layer for hiring manager contract hiring operations.
 * All queries enforce ownership (hiringManagerId === userId) and tenant filtering.
 */

import prisma from "../../../config/prisma/prisma.js";
import type { Opening, hiringProfile, ProfileStatus } from "@prisma/client";

// ============================================================================
// Opening Queries
// ============================================================================

/**
 * Fetch openings owned by a specific hiring manager within their tenant.
 * Includes profile counts for summary display.
 */
export async function findOpeningsByHiringManager(
  hiringManagerId: string,
  tenantId: string,
  options: { page: number; limit: number }
): Promise<{
  openings: Array<Opening & { 
    _count: { hiringProfiles: number };
    hiringProfiles: hiringProfile[];
  }>;
  total: number;
}> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;

  const [openings, total] = await Promise.all([
    prisma.opening.findMany({
      where: {
        hiringManagerId,
        tenantId,
      },
      include: {
        _count: {
          select: { 
            hiringProfiles: {
              where: { isDeleted: false },
            },
          },
        },
        hiringProfiles: {
          where: { isDeleted: false },
          select: {
            id: true,
            recommended: true,
            status: true,
          },
        },
      },
      orderBy: { postedDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.opening.count({
      where: {
        hiringManagerId,
        tenantId,
      },
    }),
  ]);

  return { openings: openings as any, total };
}

/**
 * Find a single opening owned by the hiring manager.
 * Returns null if not found or not owned by this manager.
 */
export async function findOpeningByIdForHiringManager(
  openingId: string,
  hiringManagerId: string,
  tenantId: string
): Promise<Opening | null> {
  return prisma.opening.findFirst({
    where: {
      id: openingId,
      hiringManagerId,
      tenantId,
    },
  });
}

// ============================================================================
// Profile Queries
// ============================================================================

/**
 * Fetch all non-deleted profiles for an opening.
 * Includes recommendation fields for hiring manager view.
 */
export async function findProfilesByOpeningId(
  openingId: string
): Promise<hiringProfile[]> {
  return prisma.hiringProfile.findMany({
    where: {
      openingId,
      isDeleted: false,
    },
    orderBy: [
      { recommendationScore: "desc" },
      { submittedAt: "desc" },
    ],
  });
}

/**
 * Find a profile by ID with its associated opening.
 * Used for ownership verification in shortlist/reject.
 */
export async function findProfileWithOpening(
  profileId: number
): Promise<(hiringProfile & { opening: Opening }) | null> {
  return prisma.hiringProfile.findUnique({
    where: { id: profileId },
    include: { opening: true },
  });
}

// ============================================================================
// Profile Actions
// ============================================================================

/**
 * Update profile status to SHORTLISTED.
 * Uses transaction to ensure atomicity.
 */
export async function shortlistProfile(profileId: number): Promise<hiringProfile> {
  return prisma.$transaction(async (tx) => {
    return tx.hiringProfile.update({
      where: { id: profileId },
      data: {
        status: "SHORTLISTED",
        // updatedAt is handled automatically by Prisma @updatedAt
      },
    });
  });
}

/**
 * Update profile status to REJECTED.
 * Uses transaction to ensure atomicity.
 */
export async function rejectProfile(profileId: number): Promise<hiringProfile> {
  return prisma.$transaction(async (tx) => {
    return tx.hiringProfile.update({
      where: { id: profileId },
      data: {
        status: "REJECTED",
        // updatedAt is handled automatically by Prisma @updatedAt
      },
    });
  });
}

/**
 * Count profiles by status for an opening
 */
export async function countProfilesByStatus(
  openingId: string
): Promise<{ total: number; recommended: number; pending: number; shortlisted: number; rejected: number }> {
  const profiles = await prisma.hiringProfile.findMany({
    where: {
      openingId,
      isDeleted: false,
    },
    select: {
      recommended: true,
      status: true,
    },
  });

  return {
    total: profiles.length,
    recommended: profiles.filter(p => p.recommended === true).length,
    pending: profiles.filter(p => p.status === "SUBMITTED").length,
    shortlisted: profiles.filter(p => p.status === "SHORTLISTED").length,
    rejected: profiles.filter(p => p.status === "REJECTED").length,
  };
}
