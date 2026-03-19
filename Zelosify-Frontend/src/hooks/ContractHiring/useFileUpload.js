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
 * @property {'pending'|'uploading'|'completed'|'error'} status
 * @property {number} progress - Upload progress (0-100)
 * @property {string|null} error - Error message if failed
 * @property {string|null} s3Key - S3 key after successful upload
 */

/**
 * Hook for managing file uploads through backend (bypasses S3 CORS)
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
   * Update multiple files' state
   */
  const updateFiles = useCallback((fileIds, updates) => {
    setFiles((prev) =>
      prev.map((f) => (fileIds.includes(f.id) ? { ...f, ...updates } : f))
    );
  }, []);

  /**
   * Upload all pending files through backend
   */
  const uploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    // Mark all pending files as uploading
    const pendingIds = pendingFiles.map((f) => f.id);
    updateFiles(pendingIds, { status: "uploading", progress: 10 });

    try {
      // Create FormData with all files
      const formData = new FormData();
      pendingFiles.forEach((fileState) => {
        formData.append("files", fileState.file);
      });

      // Upload through backend using axios (handles auth cookies automatically)
      const response = await axiosInstance.post(
        `/api/v1/vendor/openings/${openingId}/profiles/direct-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 90) + 10;
              updateFiles(pendingIds, { progress });
            }
          },
        }
      );

      // Mark files as completed
      updateFiles(pendingIds, { status: "completed", progress: 100 });

      // Clear completed files after a short delay
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.status !== "completed"));
      }, 500);

      if (onUploadComplete) {
        onUploadComplete(response.data?.data?.created || pendingFiles.length);
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Upload failed";
      updateFiles(pendingIds, { 
        status: "error", 
        error: errorMessage 
      });
    } finally {
      setIsUploading(false);
    }
  }, [files, openingId, onUploadComplete, updateFiles]);

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
