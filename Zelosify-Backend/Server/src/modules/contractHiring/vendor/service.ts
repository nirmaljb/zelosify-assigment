/**
 * Vendor Contract Hiring Service
 * 
 * Business logic layer for vendor contract hiring operations.
 * Orchestrates repository calls and transforms data to DTOs.
 */

import * as repository from "./repository.js";
import {
  type PaginationParams,
  type PaginatedResult,
  type VendorOpeningListItem,
  type VendorOpeningDetail,
  type VendorProfileItem,
  toVendorProfileItem,
} from "../types.js";

/**
 * Get paginated openings for vendor
 */
export async function getOpeningsForVendor(
  tenantId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<VendorOpeningListItem>> {
  const { openings, total } = await repository.findOpeningsByTenant(tenantId, pagination);

  const items: VendorOpeningListItem[] = openings.map((opening) => ({
    id: opening.id,
    title: opening.title,
    location: opening.location,
    contractType: opening.contractType,
    postedDate: opening.postedDate,
    hiringManagerName: opening._hiringManager
      ? `${opening._hiringManager.firstName || ""} ${opening._hiringManager.lastName || ""}`.trim()
      : "Unknown",
    experienceMin: opening.experienceMin,
    experienceMax: opening.experienceMax,
    status: opening.status,
  }));

  return {
    data: items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

/**
 * Get opening detail for vendor
 */
export async function getOpeningDetailForVendor(
  openingId: string,
  tenantId: string,
  vendorUserId: string
): Promise<VendorOpeningDetail | null> {
  const opening = await repository.findOpeningByIdAndTenant(openingId, tenantId);

  if (!opening) {
    return null;
  }

  // Filter profiles to only show those uploaded by this vendor
  const vendorProfiles = opening.hiringProfiles.filter(
    (p) => p.uploadedBy === vendorUserId
  );

  return {
    id: opening.id,
    title: opening.title,
    description: opening.description,
    location: opening.location,
    contractType: opening.contractType,
    postedDate: opening.postedDate,
    expectedCompletionDate: opening.expectedCompletionDate,
    hiringManagerName: opening._hiringManager
      ? `${opening._hiringManager.firstName || ""} ${opening._hiringManager.lastName || ""}`.trim()
      : "Unknown",
    experienceMin: opening.experienceMin,
    experienceMax: opening.experienceMax,
    requiredSkills: opening.requiredSkills,
    status: opening.status,
    profilesCount: vendorProfiles.length,
    profiles: vendorProfiles.map(toVendorProfileItem),
  };
}

/**
 * Verify opening is accessible by tenant
 */
export async function verifyOpeningAccessForVendor(
  openingId: string,
  tenantId: string
): Promise<boolean> {
  const opening = await repository.verifyOpeningAccess(openingId, tenantId);
  return opening !== null;
}

/**
 * Soft delete a profile
 */
export async function softDeleteProfileForVendor(
  profileId: number,
  vendorUserId: string,
  tenantId: string
): Promise<VendorProfileItem | null> {
  const deleted = await repository.softDeleteProfile(profileId, vendorUserId, tenantId);
  
  if (!deleted) {
    return null;
  }

  return toVendorProfileItem(deleted);
}
