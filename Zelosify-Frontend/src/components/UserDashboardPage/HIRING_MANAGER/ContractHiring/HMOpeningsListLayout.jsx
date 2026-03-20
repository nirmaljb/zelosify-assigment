"use client";

import { useRouter } from "next/navigation";
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/shadcn/table";
import { Button } from "@/components/UI/shadcn/button";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import useHiringManagerOpenings from "@/hooks/ContractHiring/useHiringManagerOpenings";
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
  });
}

/**
 * Get status badge styling - Linear style with subtle colors
 */
function getStatusBadge(status) {
  const styles = {
    OPEN: "bg-emerald-500/20 text-emerald-500 border-transparent font-bold",
    CLOSED: "bg-red-500/20 text-red-500 border-transparent font-bold",
    ON_HOLD: "bg-amber-500/20 text-amber-500 border-transparent font-bold",
  };
  return styles[status] || styles.OPEN;
}

/**
 * Stats card with Linear-style minimal design
 */
function StatsCard({ icon: Icon, label, value, subtext, accentColor }) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-lg bg-card border border-border hover:border-foreground/50 transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className={`p-1.5 rounded-md ${accentColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold text-foreground tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for table rows
 */
function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Empty state component - Linear style
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4 text-muted-foreground">
        <Users className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">No openings yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        You don&apos;t have any contract openings assigned to you. 
        Openings will appear here when they&apos;re created.
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-red-500/10 mb-4">
        <RefreshCw className="h-8 w-8 text-red-400" />
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
 * Pagination controls - Linear style
 */
function Pagination({ pagination, onPrevPage, onNextPage, hasPrevPage, hasNextPage }) {
  const { page, totalPages, total } = pagination;
  const startItem = (page - 1) * pagination.limit + 1;
  const endItem = Math.min(page * pagination.limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        {startItem}-{endItem} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-3 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Profile count badge with recommendation indicator
 */
function ProfileCountCell({ total, recommended, pending }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground tabular-nums">{total}</span>
      {recommended > 0 && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          {recommended}
        </span>
      )}
      {pending > 0 && (
        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          {pending}
        </span>
      )}
    </div>
  );
}

/**
 * Main OpeningsListLayout component for Hiring Manager
 * Linear-style modern dev-SaaS aesthetic
 */
export default function HMOpeningsListLayout() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    openings,
    pagination,
    isLoading,
    error,
    nextPage,
    prevPage,
    refresh,
    hasNextPage,
    hasPrevPage,
  } = useHiringManagerOpenings({ limit: 10 });

  // Calculate overall stats
  const stats = useMemo(() => {
    return {
      totalOpenings: pagination.total || openings.length,
      totalProfiles: openings.reduce((sum, o) => sum + (o.profilesCount || 0), 0),
      totalRecommended: openings.reduce((sum, o) => sum + (o.recommendedCount || 0), 0),
      totalPending: openings.reduce((sum, o) => sum + (o.pendingCount || 0), 0),
    };
  }, [openings, pagination.total]);

  // Client-side search filtering
  const filteredOpenings = useMemo(() => {
    if (!searchQuery.trim()) return openings;
    const query = searchQuery.toLowerCase();
    return openings.filter(
      (opening) =>
        opening.title?.toLowerCase().includes(query) ||
        opening.location?.toLowerCase().includes(query)
    );
  }, [openings, searchQuery]);

  const handleRowClick = (openingId) => {
    router.push(`/hiring-manager/openings/${openingId}`);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <ErrorBoundary>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Contract Openings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Review candidates and manage hiring decisions
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refresh} 
              disabled={isLoading}
              className="hover:bg-muted text-muted-foreground shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              icon={Users}
              label="Total Openings"
              value={stats.totalOpenings}
              accentColor="bg-violet-500/10 text-violet-400"
            />
            <StatsCard
              icon={TrendingUp}
              label="Active Candidates"
              value={stats.totalProfiles}
              accentColor="bg-blue-500/10 text-blue-400"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Recommended"
              value={stats.totalRecommended}
              accentColor="bg-emerald-500/10 text-emerald-400"
            />
            <StatsCard
              icon={Clock}
              label="Pending Review"
              value={stats.totalPending}
              accentColor="bg-amber-500/10 text-amber-400"
            />
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search openings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm mt-8">
            {error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Position
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Location
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Experience
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Active Candidates
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Posted
                      </TableHead>
                      <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-4 px-6">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton rows={5} columns={6} />
                    ) : filteredOpenings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOpenings.map((opening) => (
                        <TableRow
                          key={opening.id}
                          className="cursor-pointer border-b border-border hover:bg-muted/50 transition-all duration-200 group"
                          onClick={() => handleRowClick(opening.id)}
                        >
                          <TableCell className="py-5 px-6">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {opening.title}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {opening.location || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground tabular-nums">
                              {opening.experienceMin}-{opening.experienceMax || opening.experienceMin + 5}y
                            </span>
                          </TableCell>
                          <TableCell>
                            <ProfileCountCell
                              total={opening.profilesCount || 0}
                              recommended={opening.recommendedCount || 0}
                              pending={opening.pendingCount || 0}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground tabular-nums">
                              {formatDate(opening.postedDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold rounded-full ${getStatusBadge(opening.status)}`}>
                              {opening.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {!isLoading && filteredOpenings.length > 0 && pagination.totalPages > 1 && (
                  <Pagination
                    pagination={pagination}
                    onPrevPage={prevPage}
                    onNextPage={nextPage}
                    hasPrevPage={hasPrevPage}
                    hasNextPage={hasNextPage}
                  />
                )}
              </>
            )}
          </div>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
