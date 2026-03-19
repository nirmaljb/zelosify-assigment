/**
 * Vendor Contract Hiring Repository
 * 
 * Data access layer for vendor contract hiring operations.
 * All queries enforce tenant isolation.
 */

import prisma from "../../../config/prisma/prisma.js";
import type { Opening, hiringProfile, Prisma } from "@prisma/client";
import type { PaginationParams } from "../types.js";

// Type for opening with resolved hiring manager info
export interface OpeningWithManager extends Opening {
  _hiringManager: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface OpeningWithManagerAndProfiles extends OpeningWithManager {
  hiringProfiles: hiringProfile[];
}

/**
 * Fetch paginated openings for a tenant with hiring manager info
 */
export async function findOpeningsByTenant(
  tenantId: string,
  pagination: PaginationParams
): Promise<{ openings: OpeningWithManager[]; total: number }> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [openings, total] = await Promise.all([
    prisma.opening.findMany({
      where: {
        tenantId,
        status: "OPEN",
      },
      orderBy: { postedDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.opening.count({
      where: {
        tenantId,
        status: "OPEN",
      },
    }),
  ]);

  // Resolve hiring manager info for each opening
  const hiringManagerIds = [...new Set(openings.map((o) => o.hiringManagerId))];
  const hiringManagers = await prisma.user.findMany({
    where: { id: { in: hiringManagerIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const managerMap = new Map(hiringManagers.map((m) => [m.id, m]));

  const openingsWithManagers: OpeningWithManager[] = openings.map((opening) => ({
    ...opening,
    _hiringManager: managerMap.get(opening.hiringManagerId) || null,
  }));

  return { openings: openingsWithManagers, total };
}

/**
 * Fetch a single opening by ID with tenant enforcement
 */
export async function findOpeningByIdAndTenant(
  openingId: string,
  tenantId: string
): Promise<OpeningWithManagerAndProfiles | null> {
  const opening = await prisma.opening.findFirst({
    where: {
      id: openingId,
      tenantId,
    },
    include: {
      hiringProfiles: {
        where: {
          isDeleted: false,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!opening) {
    return null;
  }

  // Resolve hiring manager info
  const hiringManager = await prisma.user.findUnique({
    where: { id: opening.hiringManagerId },
    select: { id: true, firstName: true, lastName: true },
  });

  return {
    ...opening,
    _hiringManager: hiringManager,
  };
}

/**
 * Fetch profiles for an opening uploaded by a specific vendor
 */
export async function findProfilesByOpeningAndVendor(
  openingId: string,
  vendorUserId: string,
  tenantId: string
): Promise<hiringProfile[]> {
  // First verify opening belongs to tenant
  const opening = await prisma.opening.findFirst({
    where: {
      id: openingId,
      tenantId,
    },
    select: { id: true },
  });

  if (!opening) {
    return [];
  }

  return prisma.hiringProfile.findMany({
    where: {
      openingId,
      uploadedBy: vendorUserId,
      isDeleted: false,
    },
    orderBy: { submittedAt: "desc" },
  });
}

/**
 * Create multiple profile records in a transaction
 */
export async function createProfiles(
  profiles: Prisma.hiringProfileCreateManyInput[]
): Promise<hiringProfile[]> {
  // Use transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // Create all profiles
    await tx.hiringProfile.createMany({
      data: profiles,
    });

    // Fetch and return created profiles
    const s3Keys = profiles.map((p) => p.s3Key);
    return tx.hiringProfile.findMany({
      where: {
        s3Key: { in: s3Keys },
      },
    });
  });
}

/**
 * Soft delete a profile (set isDeleted = true)
 */
export async function softDeleteProfile(
  profileId: number,
  vendorUserId: string,
  tenantId: string
): Promise<hiringProfile | null> {
  // Verify ownership and tenant before soft delete
  const profile = await prisma.hiringProfile.findFirst({
    where: {
      id: profileId,
      uploadedBy: vendorUserId,
      isDeleted: false,
    },
    include: {
      opening: {
        select: { tenantId: true },
      },
    },
  });

  if (!profile || profile.opening.tenantId !== tenantId) {
    return null;
  }

  return prisma.hiringProfile.update({
    where: { id: profileId },
    data: { isDeleted: true },
  });
}

/**
 * Verify opening exists and belongs to tenant
 */
export async function verifyOpeningAccess(
  openingId: string,
  tenantId: string
): Promise<Opening | null> {
  return prisma.opening.findFirst({
    where: {
      id: openingId,
      tenantId,
    },
  });
}

/**
 * Check if s3Key already exists (for idempotency)
 */
export async function profileExistsByS3Key(s3Key: string): Promise<boolean> {
  const existing = await prisma.hiringProfile.findUnique({
    where: { s3Key },
    select: { id: true },
  });
  return existing !== null;
}
