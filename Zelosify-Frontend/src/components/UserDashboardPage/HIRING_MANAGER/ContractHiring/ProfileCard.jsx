"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Loader2,
  FileText,
  Zap,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/UI/shadcn/dialog";

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text, maxLength = 30) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Get recommendation badge based on score and status
 */
function getRecommendationBadge(recommended, score) {
  if (recommended === null) {
    return {
      label: "Processing",
      icon: Clock,
      bgClass: "bg-transparent",
      textClass: "text-muted-foreground",
      iconClass: "text-muted-foreground",
      borderClass: "border-border/40",
    };
  }

  if (recommended === true || score >= 0.75) {
    return {
      label: "Highly Recommended",
      icon: CheckCircle2,
      bgClass: "bg-emerald-500/20",
      textClass: "text-emerald-500",
      iconClass: "text-emerald-500",
      borderClass: "border-transparent",
    };
  }

  if (score >= 0.5) {
    return {
      label: "Borderline",
      icon: AlertCircle,
      bgClass: "bg-amber-500/20",
      textClass: "text-amber-500",
      iconClass: "text-amber-500",
      borderClass: "border-transparent",
    };
  }

  return {
    label: "Not Recommended",
    icon: XCircle,
    bgClass: "bg-red-500/20",
    textClass: "text-red-500",
    iconClass: "text-red-500",
    borderClass: "border-transparent",
  };
}

/**
 * Get status badge styling
 */
function getStatusBadge(status) {
  const styles = {
    SUBMITTED: { label: "Pending", class: "text-muted-foreground bg-muted px-2 py-0.5 rounded-full" },
    SHORTLISTED: { label: "Shortlisted", class: "text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded-full" },
    REJECTED: { label: "Rejected", class: "text-red-500 bg-red-500/20 px-2 py-0.5 rounded-full" },
  };
  return styles[status] || styles.SUBMITTED;
}

/**
 * Score ring visualization
 */
function ScoreRing({ score, size = 48 }) {
  const percentage = Math.round((score || 0) * 100);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 75) return "text-emerald-600 dark:text-emerald-400";
    if (percentage >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-zinc-900"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeLinecap="butt"
          className={getColor()}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-semibold tabular-nums ${getColor()}`}>
          {percentage}
        </span>
      </div>
    </div>
  );
}

/**
 * Format processing time
 */
function formatLatency(ms) {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Profile Card Component
 * Linear-style card showing candidate profile with AI recommendation
 */
export default function ProfileCard({
  profile,
  onShortlist,
  onReject,
  onDownload,
  onRetry,
  isActionLoading,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isJustificationOpen, setIsJustificationOpen] = useState(false);

  const recommendation = getRecommendationBadge(
    profile.recommended,
    profile.recommendationScore
  );
  const status = getStatusBadge(profile.status);
  const RecommendationIcon = recommendation.icon;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload?.(profile.id);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry?.(profile.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const isProcessing = profile.recommended === null;
  const isActioned = profile.status === "SHORTLISTED" || profile.status === "REJECTED";
  const truncatedFileName = truncateText(profile.fileName, 30);
  const isFileNameTruncated = profile.fileName && profile.fileName.length > 30;

  return (
    <>
      <div className="group relative bg-card border border-border rounded-lg p-6 hover:border-foreground/50 hover:shadow-sm transition-all duration-300 selection:bg-foreground selection:text-background">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* File icon */}
            <div className="p-3 rounded-md bg-muted group-hover:bg-accent transition-colors">
              <FileText className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            
            {/* File info */}
            <div>
              <h3 
                className="text-sm font-medium text-foreground max-w-[200px]"
                title={isFileNameTruncated ? profile.fileName : undefined}
              >
                {truncatedFileName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(profile.submittedAt)}
              </p>
            </div>
          </div>

          {/* Score ring */}
          {!isProcessing && (
            <ScoreRing score={profile.recommendationScore} />
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Analyzing</span>
            </div>
          )}
        </div>

        {/* Recommendation Badge */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${recommendation.bgClass} ${recommendation.textClass} ${recommendation.borderClass}`}
          >
            <RecommendationIcon className={`h-3 w-3 ${recommendation.iconClass || ""}`} />
            {recommendation.label}
          </span>
          
          {isActioned && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${status.class}`}>
              {status.label}
            </span>
          )}
        </div>

        {/* AI Explanation with Read More */}
        {profile.recommendationReason && (
          <div className="flex items-start gap-2 mb-3">
            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
              {profile.recommendationReason}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsJustificationOpen(true)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Read full justification"
            >
              <BookOpen className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Stats Row */}
        {!isProcessing && (
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            {profile.recommendationConfidence && (
              <div className="flex items-center gap-1">
                <span>Confidence:</span>
                <span className="text-foreground tabular-nums">
                  {Math.round(profile.recommendationConfidence * 100)}%
                </span>
              </div>
            )}
            {profile.recommendationLatencyMs && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span className="text-foreground tabular-nums">
                  {formatLatency(profile.recommendationLatencyMs)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Retry button - always visible per user preference */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying || isActionLoading === profile.id}
            className="h-10 px-3 bg-background hover:bg-muted border-border transition-colors rounded-md"
            title="Retry AI recommendation"
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>

          {!isActioned && !isProcessing && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onShortlist?.(profile.id)}
                disabled={isActionLoading === profile.id}
                className="flex-1 h-10 bg-background hover:bg-foreground hover:text-background border-border hover:border-foreground transition-all duration-300 rounded-md font-bold uppercase tracking-widest text-[10px]"
              >
                {isActionLoading === profile.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ThumbsUp className="h-3.5 w-3.5 mr-2 transition-transform group-hover:scale-110" />
                    Shortlist
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject?.(profile.id)}
                disabled={isActionLoading === profile.id}
                className="flex-1 h-10 bg-background hover:bg-red-600 hover:text-white border-border hover:border-red-600 transition-all duration-300 rounded-md font-bold uppercase tracking-widest text-[10px]"
              >
                <ThumbsDown className="h-3.5 w-3.5 mr-2 transition-transform group-hover:scale-110" />
                Reject
              </Button>
            </>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-10 px-3 bg-background hover:bg-muted border-border transition-colors rounded-md"
            title="Download resume"
          >
            {isDownloading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Justification Modal */}
      <Dialog open={isJustificationOpen} onOpenChange={setIsJustificationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              AI Recommendation Details
            </DialogTitle>
            <DialogDescription>
              Full justification for the recommendation decision
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{profile.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(profile.submittedAt)}</p>
              </div>
            </div>

            {/* Score and confidence */}
            {!isProcessing && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className="text-sm font-semibold text-foreground">
                    {Math.round((profile.recommendationScore || 0) * 100)}%
                  </span>
                </div>
                {profile.recommendationConfidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <span className="text-sm font-semibold text-foreground">
                      {Math.round(profile.recommendationConfidence * 100)}%
                    </span>
                  </div>
                )}
                {profile.recommendationLatencyMs && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {formatLatency(profile.recommendationLatencyMs)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Recommendation badge */}
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${recommendation.bgClass} ${recommendation.textClass} ${recommendation.borderClass}`}
              >
                <RecommendationIcon className={`h-3.5 w-3.5 ${recommendation.iconClass || ""}`} />
                {recommendation.label}
              </span>
            </div>

            {/* Full justification text */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Justification
              </h4>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {profile.recommendationReason || "No justification available."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
