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

/**
 * Stats pill component
 */
function StatsPill({ icon: Icon, label, value, colorClass }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
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
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        isActive
          ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
          : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1.5 text-muted-foreground">({count})</span>
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
    <div className="bg-card border border-zinc-800 rounded-lg p-4 mb-6">
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
                className="px-2 py-0.5 text-xs bg-zinc-800 rounded border border-zinc-700"
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
        <div key={i} className="bg-card border border-zinc-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg bg-zinc-800" />
              <div>
                <Skeleton className="h-4 w-32 bg-zinc-800 mb-1" />
                <Skeleton className="h-3 w-20 bg-zinc-800" />
              </div>
            </div>
            <Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
          </div>
          <Skeleton className="h-6 w-24 bg-zinc-800 mb-3" />
          <Skeleton className="h-8 w-full bg-zinc-800 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 bg-zinc-800" />
            <Skeleton className="h-8 flex-1 bg-zinc-800" />
            <Skeleton className="h-8 w-8 bg-zinc-800" />
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
      <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
        <Users className="h-8 w-8 text-zinc-500" />
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
      <div className="p-4 rounded-full bg-red-500/10 mb-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Failed to load</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="border-zinc-700 hover:bg-zinc-800"
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
        return profiles.filter((p) => p.recommended === null);
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

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/hiring-manager/openings")}
                className="h-8 w-8 p-0 hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  {opening?.title || "Loading..."}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review and manage candidate profiles
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="hover:bg-zinc-800"
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
                label="total"
                value={stats.total}
                colorClass="text-zinc-300"
              />
              <StatsPill
                icon={CheckCircle2}
                label="recommended"
                value={stats.recommended}
                colorClass="text-emerald-400"
              />
              <StatsPill
                icon={AlertCircle}
                label="borderline"
                value={stats.borderline}
                colorClass="text-amber-400"
              />
              <StatsPill
                icon={XCircle}
                label="not recommended"
                value={stats.notRecommended}
                colorClass="text-red-400"
              />
              <StatsPill
                icon={Clock}
                label="pending"
                value={stats.pending}
                colorClass="text-zinc-400"
              />
            </div>
          )}

          {/* Filters */}
          {!isLoading && profiles.length > 0 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
              <div className="w-px h-4 bg-zinc-700 mx-1" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onShortlist={shortlistProfile}
                  onReject={rejectProfile}
                  onDownload={handleDownload}
                  isActionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
