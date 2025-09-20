"use client";

import { useMemo } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Trash2 } from "lucide-react";

import { usePdfStore } from "@/hooks/use-pdf-store";
import type { HighlightOverlay, ImageOverlay, TextOverlay } from "@/types/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FONT_SIZE_RANGE: [number, number] = [8, 96];
const ROTATION_RANGE: [number, number] = [0, 360];

export const PdfInspector = () => {
  const {
    pages,
    activeOverlayId,
    updateOverlay,
    removeOverlay,
  } = usePdfStore((state) => ({
    pages: state.pages,
    activeOverlayId: state.activeOverlayId,
    updateOverlay: state.updateOverlay,
    removeOverlay: state.removeOverlay,
  }));

  const selected = useMemo(() => {
    if (!activeOverlayId) return undefined;
    for (const page of pages) {
      const overlay = page.overlays.find((item) => item.id === activeOverlayId);
      if (overlay) {
        return { page, overlay };
      }
    }
    return undefined;
  }, [pages, activeOverlayId]);

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
        <p className="text-sm font-medium">Select an overlay to adjust its properties.</p>
        <p className="text-xs text-muted-foreground/80">
          Choose a text box, image, or highlight on the page to view editable options.
        </p>
      </div>
    );
  }

  const { page, overlay } = selected;

  const handleColorChange = (color: string) => {
    if (overlay.type === "text" || overlay.type === "highlight") {
      updateOverlay(page.id, overlay.id, { color });
    }
  };

  const handleRotationChange = (rotation: number) => {
    updateOverlay(page.id, overlay.id, { rotation });
  };

  const handleDelete = () => {
    removeOverlay(page.id, overlay.id);
  };

  const renderTextControls = (textOverlay: TextOverlay) => (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="text-color">Text color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="text-color"
            type="color"
            className="h-10 w-16 cursor-pointer p-1"
            value={textOverlay.color}
            onChange={(event) => handleColorChange(event.target.value)}
          />
          <Input
            value={textOverlay.color}
            onChange={(event) => handleColorChange(event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Font size</Label>
          <Slider
            min={FONT_SIZE_RANGE[0]}
            max={FONT_SIZE_RANGE[1]}
            step={1}
            value={[textOverlay.fontSize]}
            onValueChange={([value]) => updateOverlay(page.id, overlay.id, { fontSize: value })}
          />
          <p className="text-xs text-muted-foreground">{Math.round(textOverlay.fontSize)} pt</p>
        </div>
        <div className="space-y-2">
          <Label>Alignment</Label>
          <ToggleGroup
            type="single"
            value={textOverlay.align}
            onValueChange={(value) => {
              if (value) {
                updateOverlay(page.id, overlay.id, { align: value as TextOverlay["align"] });
              }
            }}
          >
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft className="size-4" aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <AlignCenter className="size-4" aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight className="size-4" aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="justify" aria-label="Justify" disabled>
              <AlignJustify className="size-4" aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );

  const renderHighlightControls = (highlight: HighlightOverlay) => (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="highlight-color">Highlight color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="highlight-color"
            type="color"
            className="h-10 w-16 cursor-pointer p-1"
            value={highlight.color}
            onChange={(event) => handleColorChange(event.target.value)}
          />
          <Input
            value={highlight.color}
            onChange={(event) => handleColorChange(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Opacity</Label>
        <Slider
          min={0.1}
          max={1}
          step={0.05}
          value={[highlight.opacity]}
          onValueChange={([value]) => updateOverlay(page.id, overlay.id, { opacity: value })}
        />
        <p className="text-xs text-muted-foreground">{Math.round(highlight.opacity * 100)}% opacity</p>
      </div>
    </div>
  );

  const renderImageControls = (image: ImageOverlay) => (
    <div className="space-y-6">
      <div>
        <Label>Natural size</Label>
        <p className="text-xs text-muted-foreground">
          {Math.round(image.width)} × {Math.round(image.height)} px (scaled)
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">
          {overlay.type.charAt(0).toUpperCase() + overlay.type.slice(1)} overlay
        </h3>
        <p className="text-xs text-muted-foreground">
          Page {page.pageNumber} · Coordinates ({Math.round(overlay.x)}, {Math.round(overlay.y)})
        </p>
      </div>
      <div className="space-y-6">
        {overlay.type === "text" && renderTextControls(overlay)}
        {overlay.type === "highlight" && renderHighlightControls(overlay)}
        {overlay.type === "image" && renderImageControls(overlay)}
        <div className="space-y-2">
          <Label>Rotation</Label>
          <Slider
            min={ROTATION_RANGE[0]}
            max={ROTATION_RANGE[1]}
            step={1}
            value={[overlay.rotation]}
            onValueChange={([value]) => handleRotationChange(value)}
          />
          <p className="text-xs text-muted-foreground">{Math.round(overlay.rotation)}°</p>
        </div>
      </div>
      <Separator />
      <div className="mt-auto flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
        <div>
          <p className="text-sm font-medium text-destructive">Remove overlay</p>
          <p className="text-xs text-destructive/80">
            Deleting cannot be undone. Exporting will ignore removed overlays.
          </p>
        </div>
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
