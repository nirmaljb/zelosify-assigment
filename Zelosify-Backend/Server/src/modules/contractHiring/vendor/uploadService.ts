/**
 * Upload Service for Contract Hiring
 * 
 * Business logic for profile upload operations.
 * Handles presigning, profile creation, and recommendation triggering.
 */

import * as repository from "./repository.js";
import * as storageAdapter from "./storageAdapter.js";
import { triggerRecommendationBatch } from "../recommendation/trigger.js";
import {
  type PresignRequest,
  type PresignResponse,
  type ProfileUploadResult,
  toVendorProfileItem,
} from "../types.js";

/**
 * Generate presigned upload URL for a profile
 */
export async function generatePresignedUrl(
  tenantId: string,
  openingId: string,
  request: PresignRequest
): Promise<PresignResponse> {
  // Verify opening exists and belongs to tenant
  const hasAccess = await repository.verifyOpeningAccess(openingId, tenantId);
  if (!hasAccess) {
    throw new Error("Opening not found or access denied");
  }

  // Validate file type
  if (!storageAdapter.isAllowedFileType(request.contentType, request.fileName)) {
    throw new Error("Only PDF and PPTX files are allowed");
  }

  const result = await storageAdapter.generatePresignedUploadUrl(
    tenantId,
    openingId,
    request.fileName,
    request.contentType
  );

  return result;
}

/**
 * Generate multiple presigned URLs for batch upload
 */
export async function generatePresignedUrls(
  tenantId: string,
  openingId: string,
  requests: PresignRequest[]
): Promise<PresignResponse[]> {
  // Verify opening exists and belongs to tenant
  const hasAccess = await repository.verifyOpeningAccess(openingId, tenantId);
  if (!hasAccess) {
    throw new Error("Opening not found or access denied");
  }

  const results: PresignResponse[] = [];

  for (const request of requests) {
    // Validate file type
    if (!storageAdapter.isAllowedFileType(request.contentType, request.fileName)) {
      throw new Error(`File ${request.fileName}: Only PDF and PPTX files are allowed`);
    }

    const result = await storageAdapter.generatePresignedUploadUrl(
      tenantId,
      openingId,
      request.fileName,
      request.contentType
    );
    results.push(result);
  }

  return results;
}

/**
 * Submit uploaded profiles (creates DB records)
 * This triggers the recommendation flow automatically.
 */
export async function submitProfiles(
  tenantId: string,
  openingId: string,
  vendorUserId: string,
  s3Keys: string[]
): Promise<ProfileUploadResult> {
  // Verify opening exists and belongs to tenant
  const hasAccess = await repository.verifyOpeningAccess(openingId, tenantId);
  if (!hasAccess) {
    throw new Error("Opening not found or access denied");
  }

  // Filter out any s3Keys that already exist (idempotency)
  const newS3Keys: string[] = [];
  for (const s3Key of s3Keys) {
    const exists = await repository.profileExistsByS3Key(s3Key);
    if (!exists) {
      newS3Keys.push(s3Key);
    }
  }

  if (newS3Keys.length === 0) {
    return {
      created: 0,
      profiles: [],
    };
  }

  // Create profile records
  const profileData = newS3Keys.map((s3Key) => ({
    openingId,
    s3Key,
    uploadedBy: vendorUserId,
    status: "SUBMITTED" as const,
  }));

  const createdProfiles = await repository.createProfiles(profileData);

  // Trigger recommendation for each created profile (async, non-blocking)
  const profileIds = createdProfiles.map((p) => p.id);
  triggerRecommendationBatch(profileIds).catch((error) => {
    // Log but don't fail the request - recommendation is async
    console.error("Error triggering recommendations:", error);
  });

  return {
    created: createdProfiles.length,
    profiles: createdProfiles.map((p) => ({
      id: p.id,
      s3Key: p.s3Key,
      status: p.status,
    })),
  };
}
