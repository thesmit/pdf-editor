"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type React from "react";
import { Loader2 } from "lucide-react";

import { usePdfStore } from "@/hooks/use-pdf-store";
import { ensurePdfWorker } from "@/lib/pdf";
import { PdfDropzone } from "./pdf-dropzone";
import { PdfInspector } from "./pdf-inspector";
import { PdfPageViewer } from "./pdf-page-viewer";
import { PdfSidebar } from "./pdf-sidebar";
import { PdfToolbar } from "./pdf-toolbar";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getImageDimensions = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = (error) => reject(error);
    image.src = src;
  });

export const PdfEditor = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    loadFiles,
    pages,
    documents,
    zoom,
    zoomIn,
    zoomOut,
    tool,
    setTool,
    exportDocument,
    textSelection,
    addHighlightOverlay,
    setTextSelection,
    addImageOverlay,
    activePageId,
    activeOverlayId,
    removeOverlay,
    isLoading,
  } = usePdfStore((state) => ({
    loadFiles: state.loadFiles,
    pages: state.pages,
    documents: state.documents,
    zoom: state.zoom,
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
    tool: state.tool,
    setTool: state.setTool,
    exportDocument: state.exportDocument,
    textSelection: state.textSelection,
    addHighlightOverlay: state.addHighlightOverlay,
    setTextSelection: state.setTextSelection,
    addImageOverlay: state.addImageOverlay,
    activePageId: state.activePageId,
    activeOverlayId: state.activeOverlayId,
    removeOverlay: state.removeOverlay,
    isLoading: state.isLoading,
  }));

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId),
    [pages, activePageId],
  );

  const activeOverlay = useMemo(() => {
    if (!activeOverlayId) return undefined;
    for (const page of pages) {
      const overlay = page.overlays.find((item) => item.id === activeOverlayId);
      if (overlay) {
        return { pageId: page.id, overlayId: overlay.id };
      }
    }
    return undefined;
  }, [pages, activeOverlayId]);

  useEffect(() => {
    ensurePdfWorker();
  }, []);

  useEffect(() => {
    if (tool === "image" && imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
      setTool("select");
    }
  }, [tool, setTool]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && activeOverlay) {
        removeOverlay(activeOverlay.pageId, activeOverlay.overlayId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, removeOverlay]);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      if (files && files.length > 0) {
        loadFiles(files);
        event.target.value = "";
      }
    },
    [loadFiles],
  );

  const handleDropFiles = useCallback(
    (files: FileList) => {
      if (files.length > 0) {
        loadFiles(files);
      }
    },
    [loadFiles],
  );

  const handleImageInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !activePage) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);
        addImageOverlay(activePage.id, {
          imageUrl: dataUrl,
          naturalWidth: width,
          naturalHeight: height,
        });
      } catch (error) {
        console.error("Failed to load image", error);
      } finally {
        event.target.value = "";
      }
    },
    [addImageOverlay, activePage],
  );

  const handleHighlightSelection = useCallback(() => {
    if (textSelection && textSelection.quads.length > 0) {
      addHighlightOverlay(textSelection.pageId, textSelection.quads);
      setTextSelection(undefined);
    }
  }, [textSelection, addHighlightOverlay, setTextSelection]);

  const handleExport = useCallback(() => {
    exportDocument();
  }, [exportDocument]);

  const canHighlight = Boolean(
    textSelection && textSelection.pageId === activePageId && textSelection.quads.length > 0,
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        loadFiles(event.dataTransfer.files);
      }
    },
    [loadFiles],
  );

  const hasDocument = pages.length > 0;

  return (
    <div className="flex h-full flex-col">
      <PdfToolbar
        zoom={zoom}
        tool={tool}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToolChange={setTool}
        onOpenImage={() => setTool("image")}
        canHighlight={canHighlight}
        onHighlightSelection={handleHighlightSelection}
        hasDocument={hasDocument}
      />
      <div className="flex flex-1 overflow-hidden" onDragOver={handleDragOver} onDrop={handleDrop}>
        <aside className="hidden w-64 flex-shrink-0 border-r bg-background/70 lg:block">
          <PdfSidebar />
        </aside>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 border-b bg-background/80 px-4 py-2 text-xs text-muted-foreground">
            <span>{documents.length} document{documents.length === 1 ? "" : "s"} loaded</span>
            <span aria-hidden>•</span>
            <span>{pages.length} page{pages.length === 1 ? "" : "s"} in sequence</span>
            {activePage && (
              <span aria-hidden className="hidden sm:inline">
                • Editing page {activePage.pageNumber}
              </span>
            )}
          </div>
          <div className="relative flex flex-1 flex-col">
            {!hasDocument ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <PdfDropzone onFiles={handleDropFiles} onBrowse={() => fileInputRef.current?.click()} />
              </div>
            ) : (
              <PdfPageViewer />
            )}
            {isLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            )}
          </div>
          <div className="border-t bg-background/70 p-4 lg:hidden">
            <PdfInspector />
          </div>
        </div>
        <aside className="hidden w-80 flex-shrink-0 border-l bg-background/70 p-0 lg:block">
          <PdfInspector />
        </aside>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleImageInputChange}
      />
    </div>
  );
};
