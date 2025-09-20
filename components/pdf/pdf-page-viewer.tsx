"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Rnd } from "react-rnd";

import { usePdfStore } from "@/hooks/use-pdf-store";
import { cn } from "@/lib/utils";
import {
  ensurePdfWorker,
  normalizeEventPointToPdf,
} from "@/lib/pdf";
import type { HighlightOverlay, ImageOverlay, TextOverlay } from "@/types/pdf";

interface TextOverlayNodeProps {
  overlay: TextOverlay;
  zoom: number;
  onUpdate: (update: Partial<TextOverlay>) => void;
  onSelect: () => void;
  isActive: boolean;
  disabled: boolean;
}

const TextOverlayNode = ({
  overlay,
  zoom,
  onUpdate,
  onSelect,
  isActive,
  disabled,
}: TextOverlayNodeProps) => {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current && textRef.current.innerText !== overlay.text) {
      textRef.current.innerText = overlay.text;
    }
  }, [overlay.text]);

  const handleDragStop = useCallback(
    (_: unknown, data: { x: number; y: number }) => {
      onUpdate({
        x: data.x / zoom,
        y: data.y / zoom,
      });
    },
    [onUpdate, zoom],
  );

  const handleResizeStop = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      _direction: string,
      ref: HTMLElement,
      _delta: { width: number; height: number },
      position: { x: number; y: number },
    ) => {
      onUpdate({
        width: ref.offsetWidth / zoom,
        height: ref.offsetHeight / zoom,
        x: position.x / zoom,
        y: position.y / zoom,
      });
    },
    [onUpdate, zoom],
  );

  const handleBlur = useCallback(() => {
    if (!textRef.current) return;
    onUpdate({ text: textRef.current.innerText ?? "" });
  }, [onUpdate]);

  return (
    <Rnd
      bounds="parent"
      size={{ width: overlay.width * zoom, height: overlay.height * zoom }}
      position={{ x: overlay.x * zoom, y: overlay.y * zoom }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={onSelect}
      disableDragging={disabled}
      enableResizing={isActive && !disabled}
      className={cn(
        "overlay-node absolute",
        disabled && "pointer-events-none",
        isActive ? "z-30" : "z-10",
      )}
      onMouseDown={(event) => {
        if (!disabled) {
          event.stopPropagation();
          onSelect();
        }
      }}
    >
      <div
        ref={textRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onFocus={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className={cn(
          "h-full w-full cursor-text rounded-md border border-transparent bg-background/80 p-2 text-left shadow-sm transition focus:outline-none",
          isActive && "border-primary ring-2 ring-primary/30",
        )}
        style={{
          color: overlay.color,
          fontFamily: overlay.fontFamily,
          fontSize: overlay.fontSize * zoom,
          lineHeight: 1.4,
          textAlign: overlay.align,
          transform: `rotate(${overlay.rotation}deg)`,
          transformOrigin: "top left",
        }}
      />
    </Rnd>
  );
};

interface ImageOverlayNodeProps {
  overlay: ImageOverlay;
  zoom: number;
  onUpdate: (update: Partial<ImageOverlay>) => void;
  onSelect: () => void;
  isActive: boolean;
  disabled: boolean;
}

const ImageOverlayNode = ({
  overlay,
  zoom,
  onUpdate,
  onSelect,
  isActive,
  disabled,
}: ImageOverlayNodeProps) => {
  const handleDragStop = useCallback(
    (_: unknown, data: { x: number; y: number }) => {
      onUpdate({
        x: data.x / zoom,
        y: data.y / zoom,
      });
    },
    [onUpdate, zoom],
  );

  const handleResizeStop = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      _direction: string,
      ref: HTMLElement,
      _delta: { width: number; height: number },
      position: { x: number; y: number },
    ) => {
      onUpdate({
        width: ref.offsetWidth / zoom,
        height: ref.offsetHeight / zoom,
        x: position.x / zoom,
        y: position.y / zoom,
      });
    },
    [onUpdate, zoom],
  );

  return (
    <Rnd
      bounds="parent"
      size={{ width: overlay.width * zoom, height: overlay.height * zoom }}
      position={{ x: overlay.x * zoom, y: overlay.y * zoom }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={onSelect}
      disableDragging={disabled}
      enableResizing={isActive && !disabled}
      className={cn(
        "overlay-node absolute",
        disabled && "pointer-events-none",
        isActive ? "z-30" : "z-10",
      )}
      onMouseDown={(event) => {
        if (!disabled) {
          event.stopPropagation();
          onSelect();
        }
      }}
    >
      <img
        src={overlay.imageUrl}
        alt="Overlay"
        className={cn(
          "h-full w-full select-none rounded-md border border-muted bg-background object-contain shadow-sm",
          isActive && "border-primary ring-2 ring-primary/30",
        )}
        style={{
          transform: `rotate(${overlay.rotation}deg)`,
          transformOrigin: "center center",
        }}
        draggable={false}
        onPointerDown={(event) => {
          if (!disabled) {
            event.stopPropagation();
          }
        }}
      />
    </Rnd>
  );
};

const computeQuadRects = (overlay: HighlightOverlay, zoom: number) =>
  overlay.quads.map((quad) => {
    const x = Math.min(quad.x1, quad.x2, quad.x3, quad.x4) * zoom;
    const y = Math.min(quad.y1, quad.y2, quad.y3, quad.y4) * zoom;
    const width =
      (Math.max(quad.x1, quad.x2, quad.x3, quad.x4) -
        Math.min(quad.x1, quad.x2, quad.x3, quad.x4)) *
      zoom;
    const height =
      (Math.max(quad.y1, quad.y2, quad.y3, quad.y4) -
        Math.min(quad.y1, quad.y2, quad.y3, quad.y4)) *
      zoom;
    return { x, y, width, height };
  });

export const PdfPageViewer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const {
    activePageId,
    pages,
    documents,
    zoom,
    tool,
    addTextOverlay,
    updateOverlay,
    setActiveOverlay,
    activeOverlayId,
    textSelection,
    setTextSelection,
  } = usePdfStore((state) => ({
    activePageId: state.activePageId,
    pages: state.pages,
    documents: state.documents,
    zoom: state.zoom,
    tool: state.tool,
    addTextOverlay: state.addTextOverlay,
    updateOverlay: state.updateOverlay,
    setActiveOverlay: state.setActiveOverlay,
    activeOverlayId: state.activeOverlayId,
    textSelection: state.textSelection,
    setTextSelection: state.setTextSelection,
  }));

  const page = useMemo(
    () => pages.find((item) => item.id === activePageId),
    [pages, activePageId],
  );

  const documentState = useMemo(
    () => documents.find((doc) => doc.id === page?.documentId),
    [documents, page?.documentId],
  );

  useEffect(() => {
    ensurePdfWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!page || !documentState || !canvasRef.current) return;
      setIsRendering(true);
      try {
        const pdfPage = await documentState.proxy.getPage(page.pageNumber);
        const viewport = pdfPage.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        const renderTask = pdfPage.render({ canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelled && textLayerRef.current && page.textContent) {
          const textLayerElement = textLayerRef.current;
          textLayerElement.innerHTML = "";
          textLayerElement.style.width = `${viewport.width}px`;
          textLayerElement.style.height = `${viewport.height}px`;
          const viewer = (await import("pdfjs-dist/web/pdf_viewer")) as unknown as {
            renderTextLayer: (config: Record<string, unknown>) => { promise: Promise<void> };
          };
          await viewer.renderTextLayer({
            container: textLayerElement,
            textContentSource: page.textContent,
            viewport,
            textDivs: [],
          }).promise;
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [page, documentState, zoom]);

  useEffect(() => {
    if (tool !== "highlight") {
      setTextSelection(undefined);
    }
  }, [tool, setTextSelection]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!page || tool !== "text" || !containerRef.current) return;
      const target = event.target as HTMLElement;
      if (target.closest(".overlay-node")) return;
      const position = normalizeEventPointToPdf(event, containerRef.current, zoom);
      addTextOverlay(page.id, position);
      event.preventDefault();
    },
    [page, tool, zoom, addTextOverlay],
  );

  const handleMouseUp = useCallback(() => {
    if (!page || tool !== "highlight" || !textLayerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setTextSelection(undefined);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) {
      setTextSelection(undefined);
      return;
    }
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) {
      setTextSelection(undefined);
      return;
    }
    const containerBounds = textLayerRef.current.getBoundingClientRect();
    const quads = rects.map((rect) => ({
      x1: (rect.left - containerBounds.left) / zoom,
      y1: (rect.top - containerBounds.top) / zoom,
      x2: (rect.right - containerBounds.left) / zoom,
      y2: (rect.top - containerBounds.top) / zoom,
      x3: (rect.right - containerBounds.left) / zoom,
      y3: (rect.bottom - containerBounds.top) / zoom,
      x4: (rect.left - containerBounds.left) / zoom,
      y4: (rect.bottom - containerBounds.top) / zoom,
    }));
    setTextSelection({ pageId: page.id, quads });
  }, [page, tool, zoom, setTextSelection]);

  const highlights = useMemo(
    () => page?.overlays.filter((overlay) => overlay.type === "highlight") as HighlightOverlay[] ?? [],
    [page?.overlays],
  );

  const textOverlays = useMemo(
    () => page?.overlays.filter((overlay) => overlay.type === "text") as TextOverlay[] ?? [],
    [page?.overlays],
  );

  const imageOverlays = useMemo(
    () => page?.overlays.filter((overlay) => overlay.type === "image") as ImageOverlay[] ?? [],
    [page?.overlays],
  );

  if (!page || !documentState) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a page to start editing.
      </div>
    );
  }

  const stageWidth = page.width * zoom;
  const stageHeight = page.height * zoom;

  const highlightSelectionRects = textSelection?.pageId === page.id
    ? textSelection.quads.map((quad) => ({
        x: Math.min(quad.x1, quad.x2, quad.x3, quad.x4) * zoom,
        y: Math.min(quad.y1, quad.y2, quad.y3, quad.y4) * zoom,
        width:
          (Math.max(quad.x1, quad.x2, quad.x3, quad.x4) -
            Math.min(quad.x1, quad.x2, quad.x3, quad.x4)) *
          zoom,
        height:
          (Math.max(quad.y1, quad.y2, quad.y3, quad.y4) -
            Math.min(quad.y1, quad.y2, quad.y3, quad.y4)) *
          zoom,
      }))
    : [];

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-muted/30">
      <div
        ref={containerRef}
        className={cn(
          "relative inline-block rounded-lg border bg-white shadow-xl",
          tool === "highlight" && "cursor-text",
          tool === "text" && "cursor-text",
        )}
        onPointerDown={handlePointerDown}
        onMouseUp={handleMouseUp}
        style={{ width: stageWidth, height: stageHeight }}
      >
        <canvas ref={canvasRef} className="block" />
        <div
          ref={textLayerRef}
          className={cn(
            "textLayer absolute left-0 top-0 select-text",
            tool === "highlight" ? "pointer-events-auto" : "pointer-events-none",
          )}
        />
        <Stage
          width={stageWidth}
          height={stageHeight}
          className={cn(
            "absolute left-0 top-0",
            tool === "highlight" ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          <Layer>
            {highlights.map((overlay) => (
              <Group
                key={overlay.id}
                onClick={(event: KonvaEventObject<MouseEvent>) => {
                  event.cancelBubble = true;
                  setActiveOverlay(overlay.id);
                }}
              >
                {computeQuadRects(overlay, zoom).map((rect, index) => (
                  <Rect
                    key={`${overlay.id}-${index}`}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill={overlay.color}
                    opacity={overlay.opacity}
                    cornerRadius={2}
                    stroke={overlay.id === activeOverlayId ? overlay.color : undefined}
                    strokeWidth={overlay.id === activeOverlayId ? 1 : 0}
                  />
                ))}
              </Group>
            ))}
            {highlightSelectionRects.map((rect, index) => (
              <Rect
                key={`selection-${index}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="#fde68a"
                opacity={0.3}
                dash={[4, 4]}
              />
            ))}
          </Layer>
        </Stage>
        <div
          className={cn(
            "absolute left-0 top-0",
            tool === "highlight" ? "pointer-events-none" : "pointer-events-auto",
          )}
          style={{ width: stageWidth, height: stageHeight }}
        >
          {textOverlays.map((overlay) => (
            <TextOverlayNode
              key={overlay.id}
              overlay={overlay}
              zoom={zoom}
              onUpdate={(data) => updateOverlay(page.id, overlay.id, data)}
              onSelect={() => setActiveOverlay(overlay.id)}
              isActive={overlay.id === activeOverlayId}
              disabled={tool === "highlight"}
            />
          ))}
          {imageOverlays.map((overlay) => (
            <ImageOverlayNode
              key={overlay.id}
              overlay={overlay}
              zoom={zoom}
              onUpdate={(data) => updateOverlay(page.id, overlay.id, data)}
              onSelect={() => setActiveOverlay(overlay.id)}
              isActive={overlay.id === activeOverlayId}
              disabled={tool === "highlight"}
            />
          ))}
        </div>
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/40 text-sm font-medium text-muted-foreground">
            Rendering page…
          </div>
        )}
      </div>
    </div>
  );
};
