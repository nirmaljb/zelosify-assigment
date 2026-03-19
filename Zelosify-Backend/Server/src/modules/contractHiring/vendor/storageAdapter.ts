/**
 * Storage Adapter for Contract Hiring
 * 
 * Wraps the existing storage service with contract-hiring specific logic.
 * Handles S3 key generation following the required pattern:
 * <bucket>/<tenantId>/<openingId>/<timestamp>_<filename>
 */

import { createStorageService } from "../../../services/storage/storageFactory.js";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
];

const ALLOWED_EXTENSIONS = [".pdf", ".pptx"];

/**
 * Validate file type is allowed (PDF or PPTX)
 */
export function isAllowedFileType(contentType: string, fileName: string): boolean {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const isAllowedContentType = ALLOWED_CONTENT_TYPES.includes(contentType);
  const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
  return isAllowedContentType || isAllowedExtension;
}

/**
 * Generate S3 key for profile upload
 * Pattern: <tenantId>/<openingId>/<timestamp>_<filename>
 */
export function generateS3Key(
  tenantId: string,
  openingId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  // Sanitize filename to remove problematic characters
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
  
  return `contract-hiring/${tenantId}/${openingId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Generate presigned upload URL for a file
 */
export async function generatePresignedUploadUrl(
  tenantId: string,
  openingId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> {
  if (!isAllowedFileType(contentType, fileName)) {
    throw new Error("Only PDF and PPTX files are allowed");
  }

  const s3Key = generateS3Key(tenantId, openingId, fileName);
  const storageService = createStorageService();
  
  const uploadUrl = await storageService.getUploadURL(s3Key);

  return {
    uploadUrl,
    s3Key,
    expiresIn: 3600, // 1 hour
  };
}

/**
 * Generate presigned download URL for a file
 */
export async function generatePresignedDownloadUrl(s3Key: string): Promise<string> {
  const storageService = createStorageService();
  return storageService.getObjectURL(s3Key);
}

/**
 * Get file stream for backend retrieval (used for preview and agent processing)
 */
export async function getFileStream(s3Key: string): Promise<NodeJS.ReadableStream> {
  const storageService = createStorageService();
  return storageService.getObjectStream(s3Key);
}

/**
 * Extract content type from file extension
 */
export function getContentType(fileName: string): string {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}
