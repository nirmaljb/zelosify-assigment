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
import ErrorBoundary from "./ErrorBoundary";

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
      return "bg-muted text-muted-foreground border-transparent font-bold uppercase tracking-widest";
    case "SHORTLISTED":
      return "bg-emerald-500/20 text-emerald-500 border-transparent font-bold uppercase tracking-widest";
    case "REJECTED":
      return "bg-red-500/20 text-red-500 border-transparent font-bold uppercase tracking-widest";
    default:
      return "bg-muted text-muted-foreground border-transparent font-bold uppercase tracking-widest";
  }
}

/**
 * Skeleton loader for profiles list
 */
function ProfilesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card shadow-sm">
          <Skeleton className="h-10 w-10 rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56 bg-muted" />
            <Skeleton className="h-3 w-40 bg-muted" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md bg-muted" />
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
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg bg-muted/30 shadow-sm">
      <FileText className="h-12 w-12 text-muted-foreground mb-6" />
      <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-widest">No profiles uploaded</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        Start by uploading candidate profiles using the zone above.
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
      <ErrorBoundary>
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-foreground/50 transition-all duration-300 shadow-sm group selection:bg-foreground selection:text-background"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 h-11 w-11 rounded-md bg-background border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-all duration-300">
              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-background uppercase tracking-widest">
                {getFileExtension(profile.fileName)}
              </span>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate tracking-tight mb-1.5 group-hover:underline decoration-foreground decoration-2 underline-offset-4">
                {profile.fileName}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                <span>{formatDate(profile.uploadedAt)}</span>
                <span className="text-border">/</span>
                <span className={`px-2 py-0.5 text-[9px] rounded-full ${getStatusBadgeClass(profile.status)}`}>
                  {profile.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md border-border bg-background hover:bg-foreground hover:text-background transition-all"
                onClick={() => handlePreviewClick(profile)}
                disabled={previewLoading[profile.id]}
                title="Preview"
              >
                {previewLoading[profile.id] ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md border-border bg-background hover:bg-foreground hover:text-background transition-all"
                onClick={() => handleDownloadClick(profile)}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md border-border bg-background hover:bg-destructive hover:border-destructive hover:text-destructive-foreground transition-all"
                onClick={() => handleDeleteClick(profile)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      </ErrorBoundary>

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
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-destructive">{deleteError}</p>
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
