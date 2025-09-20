"use client";

import { useCallback, useState } from "react";
import type React from "react";
import { Upload } from "lucide-react";

import { cn } from "@/lib/utils";

interface PdfDropzoneProps {
  onFiles: (files: FileList) => void;
  onBrowse?: () => void;
  className?: string;
  message?: string;
}

export const PdfDropzone = ({
  onFiles,
  onBrowse,
  className,
  message = "Drop your PDF files here or browse to upload.",
}: PdfDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const { files } = event.dataTransfer;
    if (files && files.length > 0) {
      onFiles(files);
    }
  }, [onFiles]);

  const handleClick = useCallback(() => {
    onBrowse?.();
  }, [onBrowse]);

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-10 text-center transition hover:border-primary hover:bg-primary/5",
        isDragging && "border-primary bg-primary/10",
        className,
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Upload className="size-8" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-tight">Import a PDF</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Support for multi-page PDFs, merges, and page insertion.
      </p>
    </div>
  );
};
