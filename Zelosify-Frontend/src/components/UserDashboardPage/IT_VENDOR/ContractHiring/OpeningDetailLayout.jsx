"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Briefcase,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/shadcn/card";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import { Separator } from "@/components/UI/shadcn/separator";
import useOpeningDetail from "@/hooks/ContractHiring/useOpeningDetail";
import useFileUpload from "@/hooks/ContractHiring/useFileUpload";
import FileUploadZone from "./FileUploadZone";
import ProfilesList from "./ProfilesList";

/**
 * Format date to display format
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get contract type display label
 */
function getContractTypeLabel(type) {
  const labels = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    FREELANCE: "Freelance",
  };
  return labels[type] || type;
}

/**
 * Get status badge styling
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "CLOSED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "ON_HOLD":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  }
}

/**
 * Skeleton loader for opening details
 */
function DetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 mb-4">
        <RefreshCw className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Failed to load opening
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}

/**
 * Info item component
 */
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * Main OpeningDetailLayout component
 */
export default function OpeningDetailLayout({ openingId }) {
  const router = useRouter();

  const { opening, profiles, isLoading, error, refresh } = useOpeningDetail(openingId);

  const handleUploadComplete = useCallback(
    (uploadedCount) => {
      console.log(`Uploaded ${uploadedCount} files`);
      refresh();
    },
    [refresh]
  );

  const {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadAll,
  } = useFileUpload(openingId, handleUploadComplete);

  const handleBackClick = useCallback(() => {
    router.push("/vendor/openings");
  }, [router]);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Openings
          </Button>

          {error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : isLoading ? (
            <DetailsSkeleton />
          ) : opening ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {opening.title}
                    </h1>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(
                        opening.status
                      )}`}
                    >
                      {opening.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {opening.location} · {getContractTypeLabel(opening.contractType)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem
                  icon={User}
                  label="Hiring Manager"
                  value={opening.hiringManagerName || "-"}
                />
                <InfoItem
                  icon={Clock}
                  label="Experience"
                  value={`${opening.experienceMin}-${opening.experienceMax} years`}
                />
                <InfoItem
                  icon={MapPin}
                  label="Location Type"
                  value={opening.locationType === "REMOTE" ? "Remote" : "Onsite"}
                />
                <InfoItem
                  icon={Calendar}
                  label="Posted"
                  value={formatDate(opening.postedAt)}
                />
              </div>

              {/* Description */}
              {opening.description && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {opening.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Required Skills */}
              {opening.requiredSkills && opening.requiredSkills.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Required Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opening.requiredSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-sm bg-muted text-foreground rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Upload Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Zone */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Upload Candidate Profiles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUploadZone
                      files={files}
                      isUploading={isUploading}
                      onAddFiles={addFiles}
                      onRemoveFile={removeFile}
                      onUpload={uploadAll}
                      onClear={clearFiles}
                    />
                  </CardContent>
                </Card>

                {/* Uploaded Profiles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        Uploaded Profiles
                        {profiles.length > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            ({profiles.length})
                          </span>
                        )}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProfilesList
                      profiles={profiles}
                      isLoading={isLoading}
                      onRefresh={refresh}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
