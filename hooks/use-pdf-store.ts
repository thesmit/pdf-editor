"use client";

import { create } from "zustand";

import type {
  EditingTool,
  HighlightOverlay,
  HighlightQuad,
  ImageOverlay,
  PageOverlay,
  PdfDocumentState,
  PdfPageState,
  TextOverlay,
  TextSelectionState,
} from "@/types/pdf";
import { exportEditedPdf, readPdfFile } from "@/lib/pdf";

interface PdfStoreState {
  documents: PdfDocumentState[];
  pages: PdfPageState[];
  activePageId?: string;
  activeOverlayId?: string;
  zoom: number;
  tool: EditingTool;
  isLoading: boolean;
  textSelection?: TextSelectionState;
  loadFiles: (files: FileList | File[]) => Promise<void>;
  clear: () => void;
  selectPage: (pageId: string) => void;
  setTool: (tool: EditingTool) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomByDelta: (delta: number) => void;
  setActiveOverlay: (overlayId?: string) => void;
  addTextOverlay: (pageId: string, position: { x: number; y: number }) => void;
  updateOverlay: (
    pageId: string,
    overlayId: string,
    data: OverlayUpdatePayload,
  ) => void;
  removeOverlay: (pageId: string, overlayId: string) => void;
  addImageOverlay: (
    pageId: string,
    payload: {
      imageUrl: string;
      naturalWidth: number;
      naturalHeight: number;
    },
  ) => void;
  addHighlightOverlay: (pageId: string, quads: HighlightQuad[]) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  removePage: (pageId: string) => void;
  setTextSelection: (selection?: TextSelectionState) => void;
  exportDocument: (fileName?: string) => Promise<void>;
}

const clampZoom = (value: number) => {
  const min = 0.5;
  const max = 4;
  return Math.min(Math.max(value, min), max);
};

type OverlayUpdatePayload = Partial<
  Omit<PageOverlay, "id" | "pageId" | "type" | "createdAt" | "updatedAt">
>;

const updatePageState = (
  state: PdfStoreState,
  pageId: string,
  updater: (page: PdfPageState) => PdfPageState,
) => {
  let updatedPage: PdfPageState | null = null;
  const pages = state.pages.map((page) => {
    if (page.id !== pageId) return page;
    updatedPage = updater(page);
    return updatedPage;
  });
  const documents = state.documents.map((doc) => {
    let changed = false;
    const docPages = doc.pages.map((page) => {
      if (page.id !== pageId) return page;
      changed = true;
      return updatedPage ?? updater(page);
    });
    return changed ? { ...doc, pages: docPages } : doc;
  });
  return { pages, documents, page: updatedPage };
};

export const usePdfStore = create<PdfStoreState>((set, get) => ({
  documents: [],
  pages: [],
  activePageId: undefined,
  activeOverlayId: undefined,
  zoom: 1,
  tool: "select",
  isLoading: false,
  textSelection: undefined,
  loadFiles: async (files) => {
    const input = Array.isArray(files) ? [...files] : Array.from(files);
    if (input.length === 0) return;
    set({ isLoading: true });
    try {
      const loaded: PdfDocumentState[] = [];
      for (const file of input) {
        // eslint-disable-next-line no-await-in-loop
        const doc = await readPdfFile(file);
        loaded.push(doc);
      }
      set((state) => {
        const documents = [...state.documents, ...loaded];
        const newPages = loaded.flatMap((doc) => doc.pages);
        const pages = [...state.pages, ...newPages];
        const firstPage = pages[0]?.id;
        return {
          documents,
          pages,
          activePageId: state.activePageId ?? firstPage,
          isLoading: false,
        };
      });
    } catch (error) {
      console.error("Failed to load PDF", error);
      set({ isLoading: false });
    }
  },
  clear: () => {
    set({
      documents: [],
      pages: [],
      activePageId: undefined,
      activeOverlayId: undefined,
      zoom: 1,
      tool: "select",
      textSelection: undefined,
      isLoading: false,
    });
  },
  selectPage: (pageId) => {
    set({ activePageId: pageId, activeOverlayId: undefined, textSelection: undefined });
  },
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: () => set((state) => ({ zoom: clampZoom(state.zoom + 0.1) })),
  zoomOut: () => set((state) => ({ zoom: clampZoom(state.zoom - 0.1) })),
  setZoomByDelta: (delta) => set((state) => ({ zoom: clampZoom(state.zoom + delta) })),
  setActiveOverlay: (overlayId) => set({ activeOverlayId: overlayId ?? undefined }),
  addTextOverlay: (pageId, position) => {
    set((state) => {
      const defaultWidth = 220;
      const defaultHeight = 80;
      const overlay: TextOverlay = {
        id: crypto.randomUUID(),
        pageId,
        type: "text",
        x: position.x,
        y: position.y,
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        fontSize: 16,
        fontFamily: "Helvetica",
        color: "#111827",
        align: "left",
        text: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { pages, documents } = updatePageState(state, pageId, (page) => ({
        ...page,
        overlays: [...page.overlays, overlay],
      }));
      return {
        pages,
        documents,
        activeOverlayId: overlay.id,
        tool: "select" as EditingTool,
      };
    });
  },
  updateOverlay: (pageId, overlayId, data) => {
    set((state) => {
      const { pages, documents } = updatePageState(state, pageId, (page) => ({
        ...page,
        overlays: page.overlays.map((overlay) =>
          overlay.id === overlayId
            ? {
                ...overlay,
                ...data,
                updatedAt: Date.now(),
              }
            : overlay,
        ),
      }));
      return { pages, documents };
    });
  },
  removeOverlay: (pageId, overlayId) => {
    set((state) => {
      const { pages, documents } = updatePageState(state, pageId, (page) => ({
        ...page,
        overlays: page.overlays.filter((overlay) => overlay.id !== overlayId),
      }));
      return {
        pages,
        documents,
        activeOverlayId:
          state.activeOverlayId === overlayId ? undefined : state.activeOverlayId,
      };
    });
  },
  addImageOverlay: (pageId, payload) => {
    set((state) => {
      const page = state.pages.find((item) => item.id === pageId);
      if (!page) return state;
      const maxWidth = page.width * 0.6;
      const maxHeight = page.height * 0.6;
      let width = payload.naturalWidth;
      let height = payload.naturalHeight;
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(1, widthRatio, heightRatio);
      width *= ratio;
      height *= ratio;
      const overlay: ImageOverlay = {
        id: crypto.randomUUID(),
        pageId,
        type: "image",
        x: Math.max(0, (page.width - width) / 2),
        y: Math.max(0, (page.height - height) / 2),
        width,
        height,
        rotation: 0,
        naturalWidth: payload.naturalWidth,
        naturalHeight: payload.naturalHeight,
        imageUrl: payload.imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { pages, documents } = updatePageState(state, pageId, (nextPage) => ({
        ...nextPage,
        overlays: [...nextPage.overlays, overlay],
      }));
      return {
        pages,
        documents,
        activeOverlayId: overlay.id,
        tool: "select" as EditingTool,
      };
    });
  },
  addHighlightOverlay: (pageId, quads) => {
    set((state) => {
      if (quads.length === 0) return state;
      const minX = Math.min(...quads.flatMap((quad) => [quad.x1, quad.x2, quad.x3, quad.x4]));
      const minY = Math.min(...quads.flatMap((quad) => [quad.y1, quad.y2, quad.y3, quad.y4]));
      const maxX = Math.max(...quads.flatMap((quad) => [quad.x1, quad.x2, quad.x3, quad.x4]));
      const maxY = Math.max(...quads.flatMap((quad) => [quad.y1, quad.y2, quad.y3, quad.y4]));
      const overlay: HighlightOverlay = {
        id: crypto.randomUUID(),
        pageId,
        type: "highlight",
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quads,
        color: "#fef08a",
        opacity: 0.45,
      };
      const { pages, documents } = updatePageState(state, pageId, (page) => ({
        ...page,
        overlays: [...page.overlays, overlay],
      }));
      return {
        pages,
        documents,
        activeOverlayId: overlay.id,
        tool: "select" as EditingTool,
        textSelection: undefined,
      };
    });
  },
  reorderPages: (fromIndex, toIndex) => {
    set((state) => {
      const pages = [...state.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      const documents = state.documents.map((doc) => ({
        ...doc,
        pages: pages.filter((page) => page.documentId === doc.id),
      }));
      return { pages, documents };
    });
  },
  removePage: (pageId) => {
    set((state) => {
      const pages = state.pages.filter((page) => page.id !== pageId);
      const documents = state.documents.map((doc) => ({
        ...doc,
        pages: doc.pages.filter((page) => page.id !== pageId),
      }));
      let activePageId = state.activePageId;
      if (activePageId === pageId) {
        activePageId = pages[0]?.id;
      }
      return {
        pages,
        documents,
        activePageId,
        activeOverlayId: undefined,
      };
    });
  },
  setTextSelection: (selection) => set({ textSelection: selection }),
  exportDocument: async (fileName = "edited-document.pdf") => {
    const state = get();
    if (state.pages.length === 0) return;
    await exportEditedPdf(state.pages, state.documents, fileName);
  },
}));
