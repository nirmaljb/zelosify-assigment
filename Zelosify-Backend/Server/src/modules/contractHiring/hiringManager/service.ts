/**
 * Hiring Manager Contract Hiring Service
 * 
 * Business logic layer for hiring manager operations.
 * Handles ownership verification and data transformation.
 */

import * as repository from "./repository.js";
import {
  type HiringManagerOpeningListItem,
  type HiringManagerProfileItem,
  type PaginatedResult,
  toHiringManagerProfileItem,
} from "../types.js";
import { forceRetryRecommendation } from "../recommendation/trigger.js";

// ============================================================================
// Opening Operations
// ============================================================================

/**
 * Get paginated openings for a hiring manager.
 * Only returns openings where hiringManagerId === userId.
 */
export async function getOpeningsForHiringManager(
  userId: string,
  tenantId: string,
  options: { page: number; limit: number }
): Promise<PaginatedResult<HiringManagerOpeningListItem>> {
  const { openings, total } = await repository.findOpeningsByHiringManager(
    userId,
    tenantId,
    options
  );

  const data: HiringManagerOpeningListItem[] = openings.map((opening) => {
    // Count recommended and pending from included profiles
    const recommendedCount = opening.hiringProfiles.filter(
      (p) => p.recommended === true
    ).length;
    const pendingCount = opening.hiringProfiles.filter(
      (p) => p.status === "SUBMITTED"
    ).length;

    return {
      id: opening.id,
      title: opening.title,
      location: opening.location,
      contractType: opening.contractType,
      postedDate: opening.postedDate,
      experienceMin: opening.experienceMin,
      experienceMax: opening.experienceMax,
      status: opening.status,
      profilesCount: opening._count.hiringProfiles,
      recommendedCount,
      pendingCount,
    };
  });

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

/**
 * Get profiles for an opening owned by the hiring manager.
 * Includes full recommendation data.
 */
export async function getProfilesForOpening(
  openingId: string,
  userId: string,
  tenantId: string
): Promise<{
  opening: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    contractType: string | null;
    experienceMin: number;
    experienceMax: number | null;
    requiredSkills: string[];
    status: string;
    postedDate: Date;
  };
  profiles: HiringManagerProfileItem[];
  counts: {
    total: number;
    recommended: number;
    pending: number;
    shortlisted: number;
    rejected: number;
  };
} | null> {
  // Verify ownership
  const opening = await repository.findOpeningByIdForHiringManager(
    openingId,
    userId,
    tenantId
  );

  if (!opening) {
    return null;
  }

  // Fetch profiles with recommendation data
  const profiles = await repository.findProfilesByOpeningId(openingId);
  const counts = await repository.countProfilesByStatus(openingId);

  return {
    opening: {
      id: opening.id,
      title: opening.title,
      description: opening.description,
      location: opening.location,
      contractType: opening.contractType,
      experienceMin: opening.experienceMin,
      experienceMax: opening.experienceMax,
      requiredSkills: opening.requiredSkills,
      status: opening.status,
      postedDate: opening.postedDate,
    },
    profiles: profiles.map(toHiringManagerProfileItem),
    counts,
  };
}

// ============================================================================
// Profile Actions
// ============================================================================

/**
 * Shortlist a profile.
 * Verifies the profile belongs to an opening owned by this hiring manager.
 */
export async function shortlistProfileForHiringManager(
  profileId: number,
  userId: string,
  tenantId: string
): Promise<HiringManagerProfileItem | null> {
  // Get profile with opening to verify ownership
  const profileWithOpening = await repository.findProfileWithOpening(profileId);

  if (!profileWithOpening) {
    return null;
  }

  // Verify ownership: opening must belong to this hiring manager in this tenant
  if (
    profileWithOpening.opening.hiringManagerId !== userId ||
    profileWithOpening.opening.tenantId !== tenantId
  ) {
    return null;
  }

  // Verify profile is not deleted
  if (profileWithOpening.isDeleted) {
    return null;
  }

  // Perform shortlist
  const updated = await repository.shortlistProfile(profileId);
  return toHiringManagerProfileItem(updated);
}

/**
 * Reject a profile.
 * Verifies the profile belongs to an opening owned by this hiring manager.
 */
export async function rejectProfileForHiringManager(
  profileId: number,
  userId: string,
  tenantId: string
): Promise<HiringManagerProfileItem | null> {
  // Get profile with opening to verify ownership
  const profileWithOpening = await repository.findProfileWithOpening(profileId);

  if (!profileWithOpening) {
    return null;
  }

  // Verify ownership: opening must belong to this hiring manager in this tenant
  if (
    profileWithOpening.opening.hiringManagerId !== userId ||
    profileWithOpening.opening.tenantId !== tenantId
  ) {
    return null;
  }

  // Verify profile is not deleted
  if (profileWithOpening.isDeleted) {
    return null;
  }

  // Perform reject
  const updated = await repository.rejectProfile(profileId);
  return toHiringManagerProfileItem(updated);
}

/**
 * Retry recommendation for a profile.
 * Verifies the profile belongs to an opening owned by this hiring manager.
 * Clears existing recommendation and re-triggers AI processing.
 */
export async function retryProfileRecommendation(
  profileId: number,
  userId: string,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  // Get profile with opening to verify ownership
  const profileWithOpening = await repository.findProfileWithOpening(profileId);

  if (!profileWithOpening) {
    return { success: false, message: "Profile not found" };
  }

  // Verify ownership: opening must belong to this hiring manager in this tenant
  if (
    profileWithOpening.opening.hiringManagerId !== userId ||
    profileWithOpening.opening.tenantId !== tenantId
  ) {
    return { success: false, message: "Not authorized" };
  }

  // Verify profile is not deleted
  if (profileWithOpening.isDeleted) {
    return { success: false, message: "Profile has been deleted" };
  }

  // Verify profile status allows retry (must be SUBMITTED)
  if (profileWithOpening.status !== "SUBMITTED") {
    return { 
      success: false, 
      message: `Cannot retry recommendation for ${profileWithOpening.status} profiles` 
    };
  }

  // Trigger the retry
  const retryInitiated = await forceRetryRecommendation(profileId);

  if (!retryInitiated) {
    return { success: false, message: "Failed to initiate recommendation retry" };
  }

  return { success: true, message: "Recommendation retry initiated" };
}
