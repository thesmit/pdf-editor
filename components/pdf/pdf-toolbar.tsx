"use client";

import { useMemo } from "react";
import {
  FileDown,
  FilePlus,
  Highlighter,
  Image as ImageIcon,
  ImagePlus,
  MousePointer2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type { EditingTool } from "@/types/pdf";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PdfToolbarProps {
  zoom: number;
  tool: EditingTool;
  onImport: () => void;
  onExport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToolChange: (tool: EditingTool) => void;
  onOpenImage: () => void;
  canHighlight: boolean;
  onHighlightSelection: () => void;
  hasDocument: boolean;
}

export const PdfToolbar = ({
  zoom,
  tool,
  onImport,
  onExport,
  onZoomIn,
  onZoomOut,
  onToolChange,
  onOpenImage,
  canHighlight,
  onHighlightSelection,
  hasDocument,
}: PdfToolbarProps) => {
  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <TooltipProvider>
      <div className="flex w-full flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onImport}>
            <FilePlus className="mr-2 size-4" aria-hidden />
            Import PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onExport}
            disabled={!hasDocument}
          >
            <FileDown className="mr-2 size-4" aria-hidden />
            Export
          </Button>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <ToggleGroup
          type="single"
          value={tool}
          onValueChange={(value) => {
            if (value) {
              onToolChange(value as EditingTool);
            }
          }}
          className="overflow-hidden"
        >
          <ToggleGroupItem value="select" aria-label="Select tool">
            <MousePointer2 className="size-4" aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="text" aria-label="Text tool">
            <Type className="size-4" aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="highlight" aria-label="Highlight tool">
            <Highlighter className="size-4" aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="image" aria-label="Image tool">
            <ImageIcon className="size-4" aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={onZoomOut}
            disabled={!hasDocument}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" aria-hidden />
          </Button>
          <span className="min-w-[60px] text-center text-sm font-medium tabular-nums">
            {zoomLabel}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={onZoomIn}
            disabled={!hasDocument}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" aria-hidden />
          </Button>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenImage}
                disabled={!hasDocument}
              >
                <ImagePlus className="mr-2 size-4" aria-hidden />
                Add image
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Insert an image overlay from PNG or JPEG.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onHighlightSelection}
                disabled={!canHighlight}
              >
                <Highlighter className="mr-2 size-4" aria-hidden />
                Highlight selection
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Create a highlight from the current text selection.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
