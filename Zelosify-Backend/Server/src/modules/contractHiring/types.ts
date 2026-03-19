/**
 * Contract Hiring Module Types
 * 
 * DTOs and interfaces for the vendor and hiring manager contract hiring flow.
 * Vendor DTOs exclude recommendation fields per RBAC requirements.
 */

import type { Opening, hiringProfile, OpeningStatus, ProfileStatus } from "@prisma/client";

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Vendor DTOs (No recommendation fields exposed)
// ============================================================================

/**
 * Opening summary for vendor list view
 */
export interface VendorOpeningListItem {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  postedDate: Date;
  hiringManagerName: string;
  experienceMin: number;
  experienceMax: number | null;
  status: OpeningStatus;
}

/**
 * Opening detail for vendor detail view
 */
export interface VendorOpeningDetail {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  contractType: string | null;
  postedDate: Date;
  expectedCompletionDate: Date | null;
  hiringManagerName: string;
  experienceMin: number;
  experienceMax: number | null;
  requiredSkills: string[];
  status: OpeningStatus;
  profilesCount: number;
  profiles: VendorProfileItem[];
}

/**
 * Profile item for vendor view (excludes all recommendation fields)
 */
export interface VendorProfileItem {
  id: number;
  s3Key: string;
  fileName: string;
  submittedAt: Date;
  status: ProfileStatus;
  uploadedBy: string;
}

// ============================================================================
// Hiring Manager DTOs (Includes recommendation fields)
// ============================================================================

/**
 * Opening summary for hiring manager list view
 */
export interface HiringManagerOpeningListItem {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  postedDate: Date;
  experienceMin: number;
  experienceMax: number | null;
  status: OpeningStatus;
  profilesCount: number;
  recommendedCount: number;
  pendingCount: number;
}

/**
 * Profile item for hiring manager view (includes recommendation fields)
 */
export interface HiringManagerProfileItem {
  id: number;
  s3Key: string;
  fileName: string;
  submittedAt: Date;
  status: ProfileStatus;
  uploadedBy: string;
  // AI Agent Fields
  recommended: boolean | null;
  recommendationScore: number | null;
  recommendationReason: string | null;
  recommendationLatencyMs: number | null;
  recommendationConfidence: number | null;
  recommendedAt: Date | null;
}

// ============================================================================
// Upload DTOs
// ============================================================================

export interface PresignRequest {
  fileName: string;
  contentType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface ProfileUploadRequest {
  s3Keys: string[];
}

export interface ProfileUploadResult {
  created: number;
  profiles: Array<{
    id: number;
    s3Key: string;
    status: ProfileStatus;
  }>;
}

// ============================================================================
// Action DTOs
// ============================================================================

export interface ShortlistRequest {
  profileId: number;
}

export interface RejectRequest {
  profileId: number;
}

export interface SoftDeleteRequest {
  profileId: number;
}

// ============================================================================
// Internal Types (for service layer)
// ============================================================================

export interface OpeningWithHiringManager extends Opening {
  hiringManager?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface ProfileWithOpening extends hiringProfile {
  opening?: Opening;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract file name from S3 key
 * S3 key format: <tenantId>/<openingId>/<timestamp>_<filename>
 */
export function extractFileName(s3Key: string): string {
  const parts = s3Key.split("/");
  const lastPart = parts[parts.length - 1];
  // Remove timestamp prefix if present (format: timestamp_filename)
  const underscoreIndex = lastPart.indexOf("_");
  if (underscoreIndex !== -1) {
    return lastPart.substring(underscoreIndex + 1);
  }
  return lastPart;
}

/**
 * Map profile to vendor DTO (excludes recommendation fields)
 */
export function toVendorProfileItem(profile: hiringProfile): VendorProfileItem {
  return {
    id: profile.id,
    s3Key: profile.s3Key,
    fileName: extractFileName(profile.s3Key),
    submittedAt: profile.submittedAt,
    status: profile.status,
    uploadedBy: profile.uploadedBy,
  };
}

/**
 * Map profile to hiring manager DTO (includes recommendation fields)
 */
export function toHiringManagerProfileItem(profile: hiringProfile): HiringManagerProfileItem {
  return {
    id: profile.id,
    s3Key: profile.s3Key,
    fileName: extractFileName(profile.s3Key),
    submittedAt: profile.submittedAt,
    status: profile.status,
    uploadedBy: profile.uploadedBy,
    recommended: profile.recommended,
    recommendationScore: profile.recommendationScore,
    recommendationReason: profile.recommendationReason,
    recommendationLatencyMs: profile.recommendationLatencyMs,
    recommendationConfidence: profile.recommendationConfidence,
    recommendedAt: profile.recommendedAt,
  };
}
