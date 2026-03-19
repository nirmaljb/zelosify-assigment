"use client";

import { useRouter } from "next/navigation";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
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
import useVendorOpenings from "@/hooks/ContractHiring/useVendorOpenings";

/**
 * Format date to display format (e.g., "Mar 18, 2026")
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
 * Get location type badge styling
 */
function getLocationBadgeClass(locationType) {
  if (locationType === "REMOTE") {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
}

/**
 * Skeleton loader for table rows
 */
function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No openings found</h3>
      <p className="text-sm text-muted-foreground">
        There are no contract openings available at this time.
      </p>
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
      <h3 className="text-lg font-medium text-foreground mb-2">Failed to load openings</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}

/**
 * Pagination controls
 */
function Pagination({ pagination, onPrevPage, onNextPage, hasPrevPage, hasNextPage }) {
  const { page, totalPages, total } = pagination;
  const startItem = (page - 1) * pagination.limit + 1;
  const endItem = Math.min(page * pagination.limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {total} openings
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Main OpeningsListLayout component
 * Displays a searchable, paginated table of contract openings for IT Vendors
 */
export default function OpeningsListLayout() {
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
  } = useVendorOpenings({ limit: 10 });

  // Client-side search filtering (for current page)
  const filteredOpenings = useMemo(() => {
    if (!searchQuery.trim()) return openings;
    const query = searchQuery.toLowerCase();
    return openings.filter(
      (opening) =>
        opening.title.toLowerCase().includes(query) ||
        opening.location.toLowerCase().includes(query) ||
        opening.hiringManagerName?.toLowerCase().includes(query)
    );
  }, [openings, searchQuery]);

  const handleRowClick = (openingId) => {
    router.push(`/vendor/openings/${openingId}`);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contract Openings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse and submit candidate profiles for available positions
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            {error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Title</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Contract Type</TableHead>
                      <TableHead className="font-semibold">Posted Date</TableHead>
                      <TableHead className="font-semibold">Hiring Manager</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton rows={5} columns={5} />
                    ) : filteredOpenings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOpenings.map((opening) => (
                        <TableRow
                          key={opening.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(opening.id)}
                        >
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {opening.title}
                            </div>
                            {opening.experienceMin !== undefined && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {opening.experienceMin}-{opening.experienceMax} years exp
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{opening.location}</span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${getLocationBadgeClass(
                                  opening.locationType
                                )}`}
                              >
                                {opening.locationType === "REMOTE" ? "Remote" : "Onsite"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">
                              {getContractTypeLabel(opening.contractType)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {formatDate(opening.postedAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">
                              {opening.hiringManagerName || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {!isLoading && filteredOpenings.length > 0 && pagination.totalPages > 0 && (
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
        </div>
      </div>
    </div>
  );
}
