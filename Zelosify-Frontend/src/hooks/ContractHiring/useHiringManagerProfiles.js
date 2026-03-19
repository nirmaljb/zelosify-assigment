"use client";

import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/utils/Auth/axiosInstance";

/**
 * Hook for fetching profiles for a specific opening with recommendation data.
 * Also provides shortlist and reject actions.
 */
export default function useHiringManagerProfiles(openingId) {
  const [opening, setOpening] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // Tracks which profile action is in progress

  const fetchProfiles = useCallback(async () => {
    if (!openingId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(
        `/api/v1/hiring-manager/openings/${openingId}/profiles`
      );

      const { data } = response.data;
      
      setOpening(data?.opening || null);
      setProfiles(data?.profiles || []);
    } catch (err) {
      console.error("Error fetching opening profiles:", err);
      setError(err.response?.data?.error || "Failed to fetch profiles");
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [openingId]);

  // Initial fetch
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  /**
   * Shortlist a profile
   */
  const shortlistProfile = useCallback(async (profileId) => {
    setActionLoading(profileId);
    
    try {
      await axiosInstance.post(`/api/v1/hiring-manager/profiles/${profileId}/shortlist`);
      
      // Update local state
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, status: "SHORTLISTED" } : p
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error("Error shortlisting profile:", err);
      return { 
        success: false, 
        error: err.response?.data?.error || "Failed to shortlist profile" 
      };
    } finally {
      setActionLoading(null);
    }
  }, []);

  /**
   * Reject a profile
   */
  const rejectProfile = useCallback(async (profileId) => {
    setActionLoading(profileId);
    
    try {
      await axiosInstance.post(`/api/v1/hiring-manager/profiles/${profileId}/reject`);
      
      // Update local state
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, status: "REJECTED" } : p
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error("Error rejecting profile:", err);
      return { 
        success: false, 
        error: err.response?.data?.error || "Failed to reject profile" 
      };
    } finally {
      setActionLoading(null);
    }
  }, []);

  /**
   * Get download URL for a profile
   */
  const getDownloadUrl = useCallback(async (profileId) => {
    try {
      const response = await axiosInstance.get(
        `/api/v1/vendor/profiles/${profileId}/download-url`
      );
      return response.data.downloadUrl;
    } catch (err) {
      console.error("Error getting download URL:", err);
      return null;
    }
  }, []);

  // Computed stats
  const stats = {
    total: profiles.length,
    recommended: profiles.filter((p) => p.recommended === true).length,
    borderline: profiles.filter((p) => p.recommended === false && p.recommendationScore >= 0.5).length,
    notRecommended: profiles.filter((p) => p.recommended === false && p.recommendationScore < 0.5).length,
    pending: profiles.filter((p) => p.recommended === null).length,
    shortlisted: profiles.filter((p) => p.status === "SHORTLISTED").length,
    rejected: profiles.filter((p) => p.status === "REJECTED").length,
  };

  return {
    opening,
    profiles,
    stats,
    isLoading,
    error,
    actionLoading,
    shortlistProfile,
    rejectProfile,
    getDownloadUrl,
    refresh: fetchProfiles,
  };
}
