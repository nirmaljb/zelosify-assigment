"use client";

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/utils/Axios/AxiosInstance";

/**
 * Hook for fetching vendor opening detail with profiles
 * @param {string} openingId - The opening ID to fetch
 * @returns {Object} opening data, loading state, error, and refresh function
 */
export function useOpeningDetail(openingId) {
  const [opening, setOpening] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOpeningDetail = useCallback(async () => {
    if (!openingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(
        `/api/v1/vendor/openings/${openingId}`
      );

      // Backend returns the opening object directly with profiles nested inside
      const openingData = response.data.data;
      const profilesData = openingData?.profiles || [];

      setOpening(openingData);
      setProfiles(profilesData);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch opening details";
      setError(errorMessage);
      console.error("useOpeningDetail error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [openingId]);

  // Initial fetch
  useEffect(() => {
    fetchOpeningDetail();
  }, [fetchOpeningDetail]);

  const refresh = useCallback(() => {
    fetchOpeningDetail();
  }, [fetchOpeningDetail]);

  return {
    opening,
    profiles,
    isLoading,
    error,
    refresh,
  };
}

export default useOpeningDetail;
