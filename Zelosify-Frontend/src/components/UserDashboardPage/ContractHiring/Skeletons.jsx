"use client";

import { Skeleton } from "@/components/UI/shadcn/skeleton";

/**
 * Skeleton for a profile card in the Hiring Manager view
 * Matches the actual ProfileCard layout for smooth loading transitions
 */
export function ProfileCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-4">
          {/* File icon skeleton */}
          <div className="p-3 rounded-md bg-muted">
            <div className="h-6 w-6" />
          </div>
          {/* File info skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-muted" />
            <Skeleton className="h-3 w-24 bg-muted" />
          </div>
        </div>
        {/* Score ring skeleton */}
        <Skeleton className="h-12 w-12 rounded-full bg-muted" />
      </div>

      {/* Recommendation badge skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-5 w-32 rounded-full bg-muted" />
      </div>

      {/* AI Explanation skeleton */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full bg-muted" />
        <Skeleton className="h-3 w-4/5 bg-muted" />
      </div>

      {/* Stats row skeleton */}
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-3 w-20 bg-muted" />
        <Skeleton className="h-3 w-16 bg-muted" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md bg-muted" />
        <Skeleton className="h-10 flex-1 rounded-md bg-muted" />
        <Skeleton className="h-10 flex-1 rounded-md bg-muted" />
        <Skeleton className="h-10 w-10 rounded-md bg-muted" />
      </div>
    </div>
  );
}

/**
 * Skeleton grid for multiple profile cards
 */
export function ProfileCardsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a table row in the openings list
 */
export function OpeningsTableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full bg-muted" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for multiple table rows
 */
export function OpeningsTableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <OpeningsTableRowSkeleton key={i} columns={columns} />
      ))}
    </tbody>
  );
}

/**
 * Skeleton for the opening detail header
 */
export function OpeningDetailHeaderSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title and status */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 bg-muted" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded-full bg-muted" />
            <Skeleton className="h-4 w-48 bg-muted" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 rounded-md bg-muted" />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-muted/40 border border-border rounded-lg">
            <Skeleton className="h-3 w-20 bg-muted mb-2" />
            <Skeleton className="h-5 w-32 bg-muted" />
          </div>
        ))}
      </div>

      {/* Description skeleton */}
      <div className="p-8 bg-card border border-border rounded-lg">
        <Skeleton className="h-4 w-24 bg-muted mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-3/4 bg-muted" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stats cards row
 */
export function StatsRowSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-lg bg-card border border-border animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-3 w-20 bg-muted" />
            <Skeleton className="h-6 w-6 rounded-md bg-muted" />
          </div>
          <Skeleton className="h-10 w-16 bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for vendor profile list item
 */
export function VendorProfileItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card animate-pulse">
      <Skeleton className="h-11 w-11 rounded-md bg-muted" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 bg-muted" />
        <Skeleton className="h-3 w-32 bg-muted" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-8 w-8 rounded-md bg-muted" />
        <Skeleton className="h-8 w-8 rounded-md bg-muted" />
        <Skeleton className="h-8 w-8 rounded-md bg-muted" />
      </div>
    </div>
  );
}

/**
 * Skeleton for vendor profiles list
 */
export function VendorProfilesListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <VendorProfileItemSkeleton key={i} />
      ))}
    </div>
  );
}
