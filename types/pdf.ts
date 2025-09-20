import type {
  PDFDocumentProxy,
  TextContent,
} from "pdfjs-dist/types/src/display/api";

export type OverlayType = "text" | "image" | "highlight";

export interface OverlayBase {
  id: string;
  pageId: string;
  type: OverlayType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  createdAt: number;
  updatedAt: number;
}

export interface TextOverlay extends OverlayBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  background?: string;
}

export interface ImageOverlay extends OverlayBase {
  type: "image";
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface HighlightQuad {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export interface HighlightOverlay extends OverlayBase {
  type: "highlight";
  quads: HighlightQuad[];
  opacity: number;
  color: string;
}

export type PageOverlay = TextOverlay | ImageOverlay | HighlightOverlay;

export interface PdfPageState {
  id: string;
  documentId: string;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnail?: string;
  textContent?: TextContent;
  overlays: PageOverlay[];
}

export interface PdfDocumentState {
  id: string;
  name: string;
  arrayBuffer: ArrayBuffer;
  proxy: PDFDocumentProxy;
  pages: PdfPageState[];
}

export type EditingTool = "select" | "text" | "highlight" | "image";

export interface TextSelectionState {
  pageId: string;
  quads: HighlightQuad[];
}
