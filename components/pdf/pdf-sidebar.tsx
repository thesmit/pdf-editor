"use client";

import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { FileText, GripVertical, Trash2 } from "lucide-react";

import { usePdfStore } from "@/hooks/use-pdf-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const PdfSidebar = () => {
  const pages = usePdfStore((state) => state.pages);
  const documents = usePdfStore((state) => state.documents);
  const activePageId = usePdfStore((state) => state.activePageId);
  const selectPage = usePdfStore((state) => state.selectPage);
  const reorderPages = usePdfStore((state) => state.reorderPages);
  const removePage = usePdfStore((state) => state.removePage);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const pagesByDocument = useMemo(
    () =>
      documents.map((doc) => ({
        document: doc,
        pages: pages.filter((page) => page.documentId === doc.id),
      })),
    [documents, pages],
  );

  const handleDragStart = useCallback((pageId: string) => {
    setDraggingId(pageId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetPageId: string) => {
      event.preventDefault();
      const sourceId = event.dataTransfer.getData("text/plain");
      if (!sourceId) return;
      const fromIndex = pages.findIndex((page) => page.id === sourceId);
      const toIndex = pages.findIndex((page) => page.id === targetPageId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        setDraggingId(null);
        return;
      }
      reorderPages(fromIndex, toIndex);
      setDraggingId(null);
    },
    [pages, reorderPages],
  );

  if (pages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
        <FileText className="size-10" aria-hidden />
        <p className="text-sm">Load a PDF to see page thumbnails.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {pagesByDocument.map(({ document, pages: documentPages }) => (
          <div key={document.id} className="space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span className="font-medium">{document.name}</span>
              <span>{documentPages.length} pages</span>
            </div>
            <div className="space-y-2">
              {documentPages.map((page) => {
                const globalIndex = pages.findIndex((item) => item.id === page.id);
                const isActive = page.id === activePageId;
                return (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", page.id);
                      event.dataTransfer.effectAllowed = "move";
                      handleDragStart(page.id);
                    }}
                    onDragEnd={handleDragEnd}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, page.id)}
                    onClick={() => selectPage(page.id)}
                    className={cn(
                      "group relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background/80 p-2 shadow-sm transition hover:border-primary",
                      isActive && "border-primary ring-2 ring-primary/30",
                      draggingId === page.id && "opacity-60",
                    )}
                  >
                    <div className="flex items-center">
                      <GripVertical className="mr-2 size-4 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={isActive ? "default" : "outline"}>
                          Page {globalIndex + 1}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 opacity-0 transition group-hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            removePage(page.id);
                          }}
                          aria-label={`Delete page ${globalIndex + 1}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                      <div className="overflow-hidden rounded-md border bg-muted">
                        {page.thumbnail ? (
                          <img
                            src={page.thumbnail}
                            alt={`Page ${page.pageNumber} thumbnail`}
                            className="h-auto w-full"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted/60 text-xs text-muted-foreground">
                            No preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
