/**
 * Recommendation Trigger
 * 
 * Initiates recommendation processing for submitted profiles.
 * This is the boundary between the vendor submission flow and the AI agent.
 * 
 * Per spec requirements:
 * - Automatic trigger on SUBMITTED status
 * - Async execution (no blocking > 2 seconds)
 * - Not visible to vendor clients
 * - Idempotent re-run support
 */

import prisma from "../../../config/prisma/prisma.js";
import { Prisma } from "@prisma/client";
import { processProfileRecommendation } from "../agent/orchestrator.js";
import type { AgentResult } from "../agent/types.js";

/**
 * Structured log for recommendation operations
 */
interface RecommendationLogEntry {
  timestamp: string;
  event: string;
  profileId: number;
  openingId?: string;
  tenantId?: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

function log(entry: RecommendationLogEntry): void {
  console.log(JSON.stringify(entry));
}

function getUserFacingFailureReason(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("token") ||
    normalized.includes("context length") ||
    normalized.includes("maximum context") ||
    normalized.includes("too many tokens")
  ) {
    return "Parser could not analyze this resume because the file exceeded the model token limit. Rerun the parser or try a smaller resume.";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("deadline")
  ) {
    return "Parser timed out before the analysis completed. Rerun the parser.";
  }

  return "Parser could not analyze this resume. Rerun the parser.";
}

/**
 * Trigger recommendation processing for a profile.
 * 
 * This function:
 * 1. Checks if recommendation is already in progress or complete (idempotency)
 * 2. Initiates async processing without blocking
 * 3. Logs the trigger event
 * 
 * @param profileId - The profile ID to process
 * @returns Promise that resolves immediately after triggering
 */
export async function triggerRecommendation(profileId: number): Promise<void> {
  const startTime = Date.now();

  try {
    // Fetch profile to check current state
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        openingId: true,
        recommended: true,
        recommendedAt: true,
        status: true,
        opening: {
          select: {
            tenantId: true,
          },
        },
      },
    });

    if (!profile) {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_trigger_skip",
        profileId,
        error: "Profile not found",
      });
      return;
    }

    // Idempotency check: skip if already processed
    if (profile.recommended !== null && profile.recommendedAt !== null) {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_trigger_skip",
        profileId,
        openingId: profile.openingId,
        tenantId: profile.opening.tenantId,
        metadata: { reason: "already_processed" },
      });
      return;
    }

    // Only process SUBMITTED profiles
    if (profile.status !== "SUBMITTED") {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_trigger_skip",
        profileId,
        openingId: profile.openingId,
        tenantId: profile.opening.tenantId,
        metadata: { reason: "invalid_status", status: profile.status },
      });
      return;
    }

    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_triggered",
      profileId,
      openingId: profile.openingId,
      tenantId: profile.opening.tenantId,
      durationMs: Date.now() - startTime,
    });

    // Trigger async processing
    // Using setImmediate to prevent blocking the current request
    setImmediate(() => {
      processRecommendationAsync(profileId).catch((error) => {
        log({
          timestamp: new Date().toISOString(),
          event: "recommendation_async_error",
          profileId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });
  } catch (error) {
    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_trigger_error",
      profileId,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger recommendation for multiple profiles.
 * 
 * @param profileIds - Array of profile IDs to process
 */
export async function triggerRecommendationBatch(profileIds: number[]): Promise<void> {
  for (const profileId of profileIds) {
    await triggerRecommendation(profileId);
  }
}

/**
 * Async recommendation processing.
 * 
 * Calls the Agent Orchestrator to:
 * 1. Parse the resume using LLM tool-calling
 * 2. Normalize skills
 * 3. Calculate deterministic score
 * 4. Persist results via Prisma transaction
 * 
 * On failure, the profile is left in PENDING state for retry.
 */
async function processRecommendationAsync(profileId: number): Promise<void> {
  const startTime = Date.now();

  log({
    timestamp: new Date().toISOString(),
    event: "recommendation_processing_start",
    profileId,
  });

  try {
    // Call the Agent Orchestrator
    const result: AgentResult = await processProfileRecommendation(profileId);

    // Persist result via Prisma transaction
    await prisma.$transaction(async (tx) => {
      await tx.hiringProfile.update({
        where: { id: profileId },
        data: {
          recommended: result.recommendation.recommended,
          recommendationScore: result.recommendation.score,
          recommendationConfidence: result.recommendation.confidence,
          recommendationReason: result.recommendation.reason,
          recommendedAt: new Date(),
          recommendationLatencyMs: result.metadata.totalLatencyMs,
          recommendationVersion: result.metadata.version,
          reasoningMetadata: JSON.parse(JSON.stringify(result.reasoning)),
        },
      });
    });

    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_processing_complete",
      profileId,
      durationMs: Date.now() - startTime,
      metadata: {
        score: result.recommendation.score,
        decision: result.recommendation.decision,
        confidence: result.recommendation.confidence,
        latencyMs: result.metadata.totalLatencyMs,
        tokenUsage: result.metadata.tokenUsage,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const userFacingReason = getUserFacingFailureReason(errorMsg);
    
    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_processing_error",
      profileId,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    });

    // Leave profile in PENDING state for retry (per user preference)
    // Update version to track failure attempt
    try {
      await prisma.hiringProfile.update({
        where: { id: profileId },
        data: {
          recommendationReason: userFacingReason,
          recommendationLatencyMs: Date.now() - startTime,
          recommendationVersion: `failed-${Date.now()}`,
          reasoningMetadata: {
            status: "failed",
            userFacingReason,
            lastError: errorMsg,
            lastAttempt: new Date().toISOString(),
          },
        },
      });
    } catch (updateError) {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_error_update_failed",
        profileId,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    }
  }
}

/**
 * Check if a profile needs recommendation processing.
 * 
 * @param profileId - The profile ID to check
 * @returns true if recommendation is needed, false otherwise
 */
export async function needsRecommendation(profileId: number): Promise<boolean> {
  const profile = await prisma.hiringProfile.findUnique({
    where: { id: profileId },
    select: {
      status: true,
      recommended: true,
      recommendedAt: true,
    },
  });

  if (!profile) return false;
  if (profile.status !== "SUBMITTED") return false;
  if (profile.recommended !== null && profile.recommendedAt !== null) return false;

  return true;
}

/**
 * Force retry recommendation for a profile.
 * 
 * This bypasses the idempotency check and:
 * 1. Clears existing recommendation fields
 * 2. Re-triggers the recommendation processing
 * 
 * Used when hiring manager wants to retry a failed or re-evaluate a profile.
 * 
 * @param profileId - The profile ID to retry
 * @returns true if retry was initiated, false if profile not found or invalid status
 */
export async function forceRetryRecommendation(profileId: number): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Fetch profile to validate
    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        openingId: true,
        status: true,
        opening: {
          select: {
            tenantId: true,
          },
        },
      },
    });

    if (!profile) {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_retry_skip",
        profileId,
        error: "Profile not found",
      });
      return false;
    }

    // Only allow retry for SUBMITTED profiles
    if (profile.status !== "SUBMITTED") {
      log({
        timestamp: new Date().toISOString(),
        event: "recommendation_retry_skip",
        profileId,
        openingId: profile.openingId,
        tenantId: profile.opening.tenantId,
        metadata: { reason: "invalid_status", status: profile.status },
      });
      return false;
    }

    // Clear existing recommendation fields
    await prisma.hiringProfile.update({
      where: { id: profileId },
      data: {
        recommended: null,
        recommendationScore: null,
        recommendationConfidence: null,
        recommendationReason: null,
        recommendedAt: null,
        recommendationLatencyMs: null,
        recommendationVersion: null,
        reasoningMetadata: Prisma.DbNull,
      },
    });

    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_retry_triggered",
      profileId,
      openingId: profile.openingId,
      tenantId: profile.opening.tenantId,
      durationMs: Date.now() - startTime,
    });

    // Trigger async processing
    setImmediate(() => {
      processRecommendationAsync(profileId).catch((error) => {
        log({
          timestamp: new Date().toISOString(),
          event: "recommendation_retry_async_error",
          profileId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return true;
  } catch (error) {
    log({
      timestamp: new Date().toISOString(),
      event: "recommendation_retry_error",
      profileId,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
