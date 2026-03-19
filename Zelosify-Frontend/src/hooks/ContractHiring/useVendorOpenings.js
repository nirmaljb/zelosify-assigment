"use client";

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/utils/Axios/AxiosInstance";

/**
 * Hook for fetching paginated vendor openings list
 * @param {Object} options
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @returns {Object} openings data, loading state, error, and pagination controls
 */
export function useVendorOpenings({ initialPage = 1, limit = 10 } = {}) {
  const [openings, setOpenings] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOpenings = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get("/api/v1/vendor/openings", {
          params: { page, limit },
        });

        const { data, pagination: paginationData } = response.data;

        setOpenings(data);
        setPagination({
          page: paginationData.page,
          limit: paginationData.limit,
          total: paginationData.total,
          totalPages: paginationData.totalPages,
        });
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch openings";
        setError(errorMessage);
        console.error("useVendorOpenings error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [limit, pagination.page]
  );

  // Initial fetch
  useEffect(() => {
    fetchOpenings(initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = useCallback(
    (page) => {
      if (page >= 1 && page <= pagination.totalPages) {
        fetchOpenings(page);
      }
    },
    [fetchOpenings, pagination.totalPages]
  );

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [goToPage, pagination.page, pagination.totalPages]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [goToPage, pagination.page]);

  const refresh = useCallback(() => {
    fetchOpenings(pagination.page);
  }, [fetchOpenings, pagination.page]);

  return {
    openings,
    pagination,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1,
  };
}

export default useVendorOpenings;
