"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Briefcase,
  MapPin,
  Calendar,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/UI/shadcn/button";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import useHiringManagerProfiles from "@/hooks/ContractHiring/useHiringManagerProfiles";
import ProfileCard from "./ProfileCard";
import ErrorBoundary from "./ErrorBoundary";

function isRecommendationFailed(profile) {
  return profile.recommended === null && Boolean(profile.recommendationReason);
}

function isRecommendationPending(profile) {
  return profile.recommended === null && !isRecommendationFailed(profile);
}

/**
 * Stats pill component
 */
function StatsPill({ icon: Icon, label, value, colorClass }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg bg-card border border-border shadow-sm ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-bold tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

/**
 * Filter chip component
 */
function FilterChip({ label, isActive, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition-all ${
        isActive
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`rounded-sm px-1 py-0.5 text-[8px] font-medium leading-none tracking-normal ${
            isActive
              ? "bg-background/15 text-background"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Opening info card
 */
function OpeningInfoCard({ opening }) {
  if (!opening) return null;

  return (
    <div className="bg-card border border-border shadow-sm rounded-lg p-6 mb-8">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="text-foreground font-medium">{opening.title}</span>
        </div>
        {opening.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{opening.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {opening.experienceMin}-{opening.experienceMax || opening.experienceMin + 5} years
          </span>
        </div>
        {opening.requiredSkills?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {opening.requiredSkills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 text-xs bg-secondary rounded-md border border-border/50 text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
            {opening.requiredSkills.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{opening.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for profiles
 */
function ProfilesSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 p-4 bg-muted/40 border border-border rounded-lg shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-md bg-background border border-border flex items-center justify-center">
              <Skeleton className="h-6 w-6 rounded-md bg-muted" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 bg-muted mb-2" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
            </div>
            <Skeleton className="h-10 w-10 rounded-md bg-muted" />
          </div>
          <Skeleton className="h-6 w-2/3 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 bg-muted rounded-md" />
            <Skeleton className="h-10 flex-1 bg-muted rounded-md" />
            <Skeleton className="h-10 w-10 bg-muted rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4 text-muted-foreground">
        <Users className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {filter === "all" ? "No candidates yet" : `No ${filter} candidates`}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {filter === "all"
          ? "Candidates will appear here once vendors submit profiles for this opening."
          : "No candidates match this filter. Try adjusting your filters."}
      </p>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-destructive/10 mb-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Failed to load</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="border-border hover:bg-muted"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}

/**
 * Main Opening Detail Layout for Hiring Manager
 */
export default function HMOpeningDetailLayout({ openingId }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  const {
    opening,
    profiles,
    stats,
    isLoading,
    error,
    actionLoading,
    shortlistProfile,
    rejectProfile,
    getDownloadUrl,
    retryRecommendation,
    refresh,
  } = useHiringManagerProfiles(openingId);

  // Filter profiles based on selection
  const filteredProfiles = useMemo(() => {
    switch (filter) {
      case "recommended":
        return profiles.filter((p) => p.recommended === true);
      case "borderline":
        return profiles.filter(
          (p) => p.recommended === false && p.recommendationScore >= 0.5
        );
      case "not-recommended":
        return profiles.filter(
          (p) => p.recommended === false && p.recommendationScore < 0.5
        );
      case "pending":
        return profiles.filter(isRecommendationPending);
      case "failed":
        return profiles.filter(isRecommendationFailed);
      case "shortlisted":
        return profiles.filter((p) => p.status === "SHORTLISTED");
      case "rejected":
        return profiles.filter((p) => p.status === "REJECTED");
      default:
        return profiles;
    }
  }, [profiles, filter]);

  const handleDownload = async (profileId) => {
    const url = await getDownloadUrl(profileId);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleBackClick = () => {
    router.push("/hiring-manager/openings");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackClick}
                className="h-10 w-10 rounded-md border-border bg-background hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {opening?.title || "Loading..."}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and manage candidate profiles
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={isLoading}
              className="h-10 w-10 rounded-md border-border bg-background hover:bg-muted shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Opening Info */}
          <OpeningInfoCard opening={opening} />

          {/* Stats Row */}
          {!isLoading && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <StatsPill
                icon={Users}
                label="active"
                value={stats.total}
                colorClass="text-foreground"
              />
              <StatsPill
                icon={CheckCircle2}
                label="recommended"
                value={stats.recommended}
                colorClass="text-emerald-600 dark:text-emerald-400"
              />
              <StatsPill
                icon={AlertCircle}
                label="borderline"
                value={stats.borderline}
                colorClass="text-amber-600 dark:text-amber-400"
              />
              <StatsPill
                icon={XCircle}
                label="not recommended"
                value={stats.notRecommended}
                colorClass="text-destructive font-medium"
              />
              <StatsPill
                icon={Clock}
                label="pending"
                value={stats.pending}
                colorClass="text-muted-foreground"
              />
              <StatsPill
                icon={AlertCircle}
                label="needs retry"
                value={stats.failed}
                colorClass="text-red-600 dark:text-red-400"
              />
            </div>
          )}

          {/* Filters */}
          {!isLoading && profiles.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              <div className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <Filter className="h-3 w-3 text-muted-foreground" />
              </div>
              <FilterChip
                label="All"
                isActive={filter === "all"}
                onClick={() => setFilter("all")}
                count={stats.total}
              />
              <FilterChip
                label="Recommended"
                isActive={filter === "recommended"}
                onClick={() => setFilter("recommended")}
                count={stats.recommended}
              />
              <FilterChip
                label="Borderline"
                isActive={filter === "borderline"}
                onClick={() => setFilter("borderline")}
                count={stats.borderline}
              />
              <FilterChip
                label="Not Recommended"
                isActive={filter === "not-recommended"}
                onClick={() => setFilter("not-recommended")}
                count={stats.notRecommended}
              />
              <FilterChip
                label="Pending"
                isActive={filter === "pending"}
                onClick={() => setFilter("pending")}
                count={stats.pending}
              />
              <FilterChip
                label="Needs Retry"
                isActive={filter === "failed"}
                onClick={() => setFilter("failed")}
                count={stats.failed}
              />
              <div className="mx-1 h-5 w-px bg-border" />
              <FilterChip
                label="Shortlisted"
                isActive={filter === "shortlisted"}
                onClick={() => setFilter("shortlisted")}
                count={stats.shortlisted}
              />
              <FilterChip
                label="Rejected"
                isActive={filter === "rejected"}
                onClick={() => setFilter("rejected")}
                count={stats.rejected}
              />
            </div>
          )}

          {/* Content */}
          {error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : isLoading ? (
            <ProfilesSkeleton />
          ) : filteredProfiles.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <ErrorBoundary>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onShortlist={shortlistProfile}
                    onReject={rejectProfile}
                    onDownload={handleDownload}
                    onRetry={retryRecommendation}
                    isActionLoading={actionLoading}
                  />
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
