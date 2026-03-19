"use client";

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/utils/Auth/axiosInstance";

/**
 * Hook for fetching hiring manager openings with pagination.
 * Returns only openings where the hiring manager owns them.
 */
export default function useHiringManagerOpenings({ limit = 10 } = {}) {
  const [openings, setOpenings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOpenings = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get("/api/v1/hiring-manager/openings", {
        params: { page, limit },
      });

      const { data, pagination: paginationData } = response.data;
      
      setOpenings(data || []);
      setPagination({
        page: paginationData?.page || page,
        limit: paginationData?.limit || limit,
        total: paginationData?.total || 0,
        totalPages: paginationData?.totalPages || 0,
      });
    } catch (err) {
      console.error("Error fetching hiring manager openings:", err);
      setError(err.response?.data?.error || "Failed to fetch openings");
      setOpenings([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchOpenings(1);
  }, [fetchOpenings]);

  // Pagination handlers
  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      fetchOpenings(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, fetchOpenings]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      fetchOpenings(pagination.page - 1);
    }
  }, [pagination.page, fetchOpenings]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchOpenings(page);
    }
  }, [pagination.totalPages, fetchOpenings]);

  const refresh = useCallback(() => {
    fetchOpenings(pagination.page);
  }, [pagination.page, fetchOpenings]);

  return {
    openings,
    pagination,
    isLoading,
    error,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1,
  };
}
