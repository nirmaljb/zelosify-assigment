"use client";

import { useState, useCallback } from "react";
import axiosInstance from "@/utils/Axios/AxiosInstance";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const ALLOWED_EXTENSIONS = [".pdf", ".pptx"];

/**
 * Validate file type
 */
function isValidFileType(file) {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return (
    ALLOWED_FILE_TYPES.includes(file.type) ||
    ALLOWED_EXTENSIONS.includes(extension)
  );
}

/**
 * Upload file state type
 * @typedef {Object} FileUploadState
 * @property {File} file - The file object
 * @property {string} id - Unique identifier
 * @property {'pending'|'presigning'|'uploading'|'submitting'|'completed'|'error'} status
 * @property {number} progress - Upload progress (0-100)
 * @property {string|null} error - Error message if failed
 * @property {string|null} s3Key - S3 key after successful upload
 */

/**
 * Hook for managing file uploads with S3 presigned URLs
 * @param {string} openingId - The opening ID to upload files to
 * @param {Function} onUploadComplete - Callback when all uploads complete
 * @returns {Object} upload state and handlers
 */
export function useFileUpload(openingId, onUploadComplete) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback((newFiles) => {
    const validFiles = [];
    const invalidFiles = [];

    Array.from(newFiles).forEach((file) => {
      if (isValidFileType(file)) {
        validFiles.push({
          file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: "pending",
          progress: 0,
          error: null,
          s3Key: null,
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      console.warn("Invalid file types:", invalidFiles);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    return { validCount: validFiles.length, invalidFiles };
  }, []);

  /**
   * Remove a file from the upload queue
   */
  const removeFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  /**
   * Clear all files from the queue
   */
  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  /**
   * Update a specific file's state
   */
  const updateFile = useCallback((fileId, updates) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  }, []);

  /**
   * Upload a single file to S3
   */
  const uploadSingleFile = useCallback(
    async (fileState) => {
      const { file, id } = fileState;

      try {
        // Step 1: Get presigned URL
        updateFile(id, { status: "presigning", progress: 10 });

        const presignResponse = await axiosInstance.post(
          `/api/v1/vendor/openings/${openingId}/profiles/presign`,
          {
            files: [{ fileName: file.name, fileType: file.type }],
          }
        );

        const presignedData = presignResponse.data.data[0];
        if (!presignedData?.uploadUrl || !presignedData?.s3Key) {
          throw new Error("Invalid presign response");
        }

        // Step 2: Upload to S3
        updateFile(id, { status: "uploading", progress: 30 });

        await fetch(presignedData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        updateFile(id, {
          status: "completed",
          progress: 100,
          s3Key: presignedData.s3Key,
        });

        return { success: true, s3Key: presignedData.s3Key, fileName: file.name };
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        updateFile(id, { status: "error", error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [openingId, updateFile]
  );

  /**
   * Upload all pending files and submit to backend
   */
  const uploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload all files to S3
      const uploadResults = await Promise.all(
        pendingFiles.map((f) => uploadSingleFile(f))
      );

      // Collect successful uploads
      const successfulUploads = uploadResults.filter((r) => r.success);

      if (successfulUploads.length === 0) {
        setIsUploading(false);
        return;
      }

      // Submit to backend
      const submitPayload = {
        profiles: successfulUploads.map((u) => ({
          s3Key: u.s3Key,
          fileName: u.fileName,
        })),
      };

      await axiosInstance.post(
        `/api/v1/vendor/openings/${openingId}/profiles/upload`,
        submitPayload
      );

      // Clear successfully uploaded files
      setFiles((prev) =>
        prev.filter((f) => f.status !== "completed")
      );

      if (onUploadComplete) {
        onUploadComplete(successfulUploads.length);
      }
    } catch (error) {
      console.error("Upload submission error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [files, openingId, onUploadComplete, uploadSingleFile]);

  /**
   * Get upload progress summary
   */
  const getProgress = useCallback(() => {
    const total = files.length;
    const completed = files.filter((f) => f.status === "completed").length;
    const failed = files.filter((f) => f.status === "error").length;
    const pending = files.filter((f) => f.status === "pending").length;

    return {
      total,
      completed,
      failed,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [files]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadAll,
    getProgress,
  };
}

export default useFileUpload;
