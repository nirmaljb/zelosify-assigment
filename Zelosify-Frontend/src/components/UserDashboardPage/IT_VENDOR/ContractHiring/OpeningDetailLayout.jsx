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
import ErrorBoundary from "./ErrorBoundary";
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
      return "bg-emerald-500/20 text-emerald-500 border-transparent font-bold uppercase tracking-widest";
    case "CLOSED":
      return "bg-red-500/20 text-red-500 border-transparent font-bold uppercase tracking-widest";
    case "ON_HOLD":
      return "bg-amber-500/20 text-amber-500 border-transparent font-bold uppercase tracking-widest";
    default:
      return "bg-muted text-muted-foreground border-transparent font-bold uppercase tracking-widest";
  }
}

function normalizeRequiredSkills(requiredSkills) {
  if (Array.isArray(requiredSkills)) {
    return requiredSkills.filter(Boolean);
  }

  if (typeof requiredSkills !== "string") {
    return [];
  }

  const trimmed = requiredSkills.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return trimmed
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((skill) => skill.replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    }
  }

  return trimmed
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
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
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <RefreshCw className="h-6 w-6 text-destructive" />
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
    <div className="flex items-start gap-4 p-4 bg-muted/40 border border-border rounded-lg shadow-sm">
      <div className="flex-shrink-0 h-10 w-10 rounded-md bg-background border border-border flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground tracking-tight">{value}</p>
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
  const requiredSkills = normalizeRequiredSkills(opening?.requiredSkills);

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
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
            className="mb-8 rounded-md border-border bg-background hover:bg-muted text-foreground transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft className="h-3 w-3 mr-2" />
            Back to Openings
          </Button>

          <ErrorBoundary>
            {error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : isLoading ? (
              <DetailsSkeleton />
            ) : opening ? (
              <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {opening.title}
                  </h1>
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full ${getStatusBadgeClass(
                        opening.status
                      )}`}
                    >
                      {opening.status}
                    </span>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                      {opening.location} · {getContractTypeLabel(opening.contractType)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} className="rounded-md border-border bg-background hover:bg-muted shadow-sm font-bold uppercase tracking-widest text-[10px] h-10 px-4 text-foreground">
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
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
                  label="Location"
                  value={opening.location || "-"}
                />
                <InfoItem
                  icon={Calendar}
                  label="Posted"
                  value={formatDate(opening.postedDate)}
                />
              </div>

              {/* Description & Required Skills Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {opening.description && (
                  <div className="md:col-span-2 p-8 bg-card border border-border rounded-lg shadow-sm">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Description</h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {opening.description}
                    </p>
                  </div>
                )}

                {requiredSkills.length > 0 && (
                  <div className="p-8 bg-card border border-border rounded-lg shadow-sm">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Required Skills</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {requiredSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-semibold tracking-tight text-secondary-foreground shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Upload Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                {/* Upload Zone */}
                <div className="p-8 bg-card border border-border rounded-lg shadow-sm">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 flex items-center gap-3">
                    <Briefcase className="h-4 w-4" />
                    Upload Candidate Profiles
                  </h3>
                  <FileUploadZone
                    files={files}
                    isUploading={isUploading}
                    onAddFiles={addFiles}
                    onRemoveFile={removeFile}
                    onUpload={uploadAll}
                    onClear={clearFiles}
                  />
                </div>

                {/* Uploaded Profiles */}
                <div className="p-8 bg-background border border-border rounded-lg shadow-sm">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8 flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      Uploaded Profiles
                      {profiles.length > 0 && (
                        <span className="ml-2 text-muted-foreground font-normal">
                          ({profiles.length})
                        </span>
                      )}
                    </span>
                  </h3>
                  <ProfilesList
                    profiles={profiles}
                    isLoading={isLoading}
                    onRefresh={refresh}
                  />
                </div>
              </div>
              </div>
            ) : null}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
