"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";
import { Progress } from "@/components/UI/shadcn/progress";
import { FILE_CONSTRAINTS } from "@/hooks/ContractHiring/useFileUpload";

/**
 * Format bytes to human readable size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Get file icon based on status
 */
function FileStatusIcon({ status }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "uploading":
    case "presigning":
    case "submitting":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get status text
 */
function getStatusText(status) {
  switch (status) {
    case "presigning":
      return "Preparing...";
    case "uploading":
      return "Uploading...";
    case "submitting":
      return "Submitting...";
    case "completed":
      return "Completed";
    case "error":
      return "Failed";
    default:
      return "Ready";
  }
}

/**
 * File Upload Zone component with drag-drop support
 */
export default function FileUploadZone({
  files,
  isUploading,
  onAddFiles,
  onRemoveFile,
  onUpload,
  onClear,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleValidationResult = useCallback((result) => {
    const errors = [];
    
    if (result.invalidFiles?.length > 0) {
      errors.push(`Invalid file types: ${result.invalidFiles.join(", ")}. Only PDF and PPTX are allowed.`);
    }
    
    if (result.oversizedFiles?.length > 0) {
      errors.push(`Files exceed 10MB limit: ${result.oversizedFiles.join(", ")}`);
    }
    
    setValidationErrors(errors);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setValidationErrors([]);

      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles?.length > 0) {
        const result = onAddFiles(droppedFiles);
        handleValidationResult(result);
      }
    },
    [onAddFiles, handleValidationResult]
  );

  const handleFileSelect = useCallback(
    (e) => {
      setValidationErrors([]);
      const selectedFiles = e.target.files;
      if (selectedFiles?.length > 0) {
        const result = onAddFiles(selectedFiles);
        handleValidationResult(result);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [onAddFiles, handleValidationResult]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const hasFiles = files.length > 0;
  const remainingSlots = FILE_CONSTRAINTS.maxFiles - files.length;
  const maxSizeMB = FILE_CONSTRAINTS.maxFileSize / (1024 * 1024);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
          }
          ${isUploading || remainingSlots <= 0 ? "pointer-events-none opacity-60" : "cursor-pointer"}
        `}
        onClick={!isUploading && remainingSlots > 0 ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handleFileSelect}
          className="hidden"
          disabled={remainingSlots <= 0}
        />

        <Upload
          className={`h-10 w-10 mx-auto mb-4 ${
            isDragOver ? "text-primary" : "text-muted-foreground"
          }`}
        />

        <p className="text-sm font-medium text-foreground mb-1">
          {remainingSlots <= 0 
            ? `Maximum ${FILE_CONSTRAINTS.maxFiles} files reached`
            : isDragOver 
              ? "Drop files here" 
              : "Drag and drop candidate profiles"
          }
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {remainingSlots > 0 ? "or click to browse" : "Remove files to add more"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, PPTX only | Max {maxSizeMB}MB per file | Max {FILE_CONSTRAINTS.maxFiles} files
        </p>
        {remainingSlots > 0 && remainingSlots < FILE_CONSTRAINTS.maxFiles && (
          <p className="text-xs text-muted-foreground mt-1">
            {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"} remaining
          </p>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Files ({files.length})
            </p>
            {!isUploading && files.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear all
              </Button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {files.map((fileState) => (
              <div
                key={fileState.id}
                className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border"
              >
                <FileStatusIcon status={fileState.status} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {fileState.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(fileState.file.size)}</span>
                    <span>·</span>
                    <span
                      className={
                        fileState.status === "error"
                          ? "text-red-500"
                          : fileState.status === "completed"
                          ? "text-green-500"
                          : ""
                      }
                    >
                      {fileState.error || getStatusText(fileState.status)}
                    </span>
                  </div>

                  {/* Progress bar for active uploads */}
                  {["presigning", "uploading", "submitting"].includes(fileState.status) && (
                    <Progress value={fileState.progress} className="h-1 mt-2" />
                  )}
                </div>

                {/* Remove button - only for pending files */}
                {fileState.status === "pending" && !isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveFile(fileState.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={onUpload}
            disabled={isUploading}
            size="sm"
            className="w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingCount} {pendingCount === 1 ? "file" : "files"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
