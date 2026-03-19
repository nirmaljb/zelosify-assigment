"use client";

import { useState, useCallback } from "react";
import { FileText, Trash2, Download, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/shadcn/dialog";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import axiosInstance from "@/utils/Axios/AxiosInstance";

/**
 * Format date to display format
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get file extension
 */
function getFileExtension(fileName) {
  const ext = fileName?.split(".").pop()?.toUpperCase() || "FILE";
  return ext;
}

/**
 * Get profile status badge styling
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case "SUBMITTED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "SHORTLISTED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  }
}

/**
 * Skeleton loader for profiles list
 */
function ProfilesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No profiles uploaded</h3>
      <p className="text-sm text-muted-foreground">
        Upload candidate profiles using the form above
      </p>
    </div>
  );
}

/**
 * ProfilesList component with soft-delete and preview
 */
export default function ProfilesList({ profiles, isLoading, onRefresh }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState({});

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = useCallback((profile) => {
    setProfileToDelete(profile);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Confirm soft delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!profileToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await axiosInstance.delete(
        `/api/v1/vendor/profiles/${profileToDelete.id}`
      );
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to delete profile";
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [profileToDelete, onRefresh]);

  /**
   * Handle preview click - opens file in new tab
   */
  const handlePreviewClick = useCallback(async (profile) => {
    setPreviewLoading((prev) => ({ ...prev, [profile.id]: true }));

    try {
      const response = await axiosInstance.get(
        `/api/v1/vendor/profiles/${profile.id}/download-url`
      );
      const { downloadUrl } = response.data.data;
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error("Failed to get preview URL:", err);
    } finally {
      setPreviewLoading((prev) => ({ ...prev, [profile.id]: false }));
    }
  }, []);

  /**
   * Handle download click
   */
  const handleDownloadClick = useCallback(async (profile) => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/vendor/profiles/${profile.id}/download-url`
      );
      const { downloadUrl } = response.data.data;
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = profile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download file:", err);
    }
  }, []);

  if (isLoading) {
    return <ProfilesSkeleton />;
  }

  if (!profiles || profiles.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 h-10 w-10 rounded bg-muted flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                {getFileExtension(profile.fileName)}
              </span>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{formatDate(profile.uploadedAt)}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded-full ${getStatusBadgeClass(profile.status)}`}>
                  {profile.status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePreviewClick(profile)}
                disabled={previewLoading[profile.id]}
                title="Preview"
              >
                {previewLoading[profile.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownloadClick(profile)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDeleteClick(profile)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{profileToDelete?.fileName}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
