"use client";

import { saveAs } from "file-saver";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type {
  HighlightOverlay,
  HighlightQuad,
  ImageOverlay,
  PdfDocumentState,
  PdfPageState,
  TextOverlay,
} from "@/types/pdf";
import type React from "react";

let workerConfigured = false;

export const ensurePdfWorker = () => {
  if (!workerConfigured) {
    GlobalWorkerOptions.workerSrc = workerSrc;
    workerConfigured = true;
  }
};

const FONT_FALLBACKS: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  "Times-Roman": StandardFonts.TimesRoman,
  "Times-Bold": StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
};

const DEFAULT_FONT = StandardFonts.Helvetica;

const loadFont = async (
  pdfDoc: PDFDocument,
  fontFamily: string,
  cache: Map<string, PDFFont>,
) => {
  const mapped = FONT_FALLBACKS[fontFamily] ?? DEFAULT_FONT;
  if (!cache.has(mapped)) {
    const embedded = await pdfDoc.embedFont(mapped);
    cache.set(mapped, embedded);
  }
  return cache.get(mapped)!;
};

const dataUrlToUint8Array = (dataUrl: string) => {
  const [header, data] = dataUrl.split(",");
  const isBase64 = header?.includes("base64");
  if (!isBase64 || !data) {
    throw new Error("Unsupported image data URL");
  }
  const binary = atob(data);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const hexToRgb = (color: string) => {
  const hexValue = color.replace("#", "");
  const hex =
    hexValue.length === 3
      ? hexValue
          .split("")
          .map((char) => char + char)
          .join("")
      : hexValue;
  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return rgb(r / 255, g / 255, b / 255);
};

const createThumbnail = async (
  page: PDFPageProxy,
  scale = 0.25,
): Promise<string | undefined> => {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
};

export const readPdfFile = async (file: File): Promise<PdfDocumentState> => {
  ensurePdfWorker();
  const arrayBuffer = await file.arrayBuffer();
  const proxy = await getDocument({ data: arrayBuffer }).promise;
  const documentId = crypto.randomUUID();
  const pages: PdfPageState[] = [];
  for (let index = 1; index <= proxy.numPages; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await proxy.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    // eslint-disable-next-line no-await-in-loop
    const textContent = await page.getTextContent();
    // eslint-disable-next-line no-await-in-loop
    const thumbnail = await createThumbnail(page);
    pages.push({
      id: `${documentId}-page-${index}`,
      documentId,
      pageNumber: index,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation ?? 0,
      overlays: [],
      textContent,
      thumbnail,
    });
    page.cleanup();
  }
  return {
    id: documentId,
    name: file.name,
    arrayBuffer,
    proxy,
    pages,
  };
};

const drawTextOverlay = async (
  page: PDFPage,
  overlay: TextOverlay,
  fontCache: Map<string, PDFFont>,
  pdfDoc: PDFDocument,
) => {
  const pageHeight = page.getHeight();
  const font = await loadFont(pdfDoc, overlay.fontFamily, fontCache);
  const text = overlay.text ?? "";
  const textWidth = font.widthOfTextAtSize(text, overlay.fontSize);
  let x = overlay.x;
  if (overlay.align === "center") {
    x = overlay.x + (overlay.width - textWidth) / 2;
  } else if (overlay.align === "right") {
    x = overlay.x + overlay.width - textWidth;
  }
  const y = pageHeight - overlay.y - overlay.fontSize;
  page.drawText(text, {
    x,
    y,
    size: overlay.fontSize,
    font,
    color: hexToRgb(overlay.color),
    rotate: degrees(overlay.rotation ?? 0),
  });
};

const drawImageOverlay = async (
  page: PDFPage,
  overlay: ImageOverlay,
  pdfDoc: PDFDocument,
) => {
  const bytes = dataUrlToUint8Array(overlay.imageUrl);
  const isPng = overlay.imageUrl.startsWith("data:image/png");
  const image = isPng
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);
  const pageHeight = page.getHeight();
  const x = overlay.x;
  const y = pageHeight - overlay.y - overlay.height;
  page.drawImage(image, {
    x,
    y,
    width: overlay.width,
    height: overlay.height,
    rotate: degrees(overlay.rotation ?? 0),
  });
};

const drawHighlightOverlay = (
  page: PDFPage,
  overlay: HighlightOverlay,
) => {
  const pageHeight = page.getHeight();
  overlay.quads.forEach((quad) => {
    const x = Math.min(quad.x1, quad.x2, quad.x3, quad.x4);
    const yTop = Math.min(quad.y1, quad.y2, quad.y3, quad.y4);
    const rectWidth =
      Math.max(quad.x1, quad.x2, quad.x3, quad.x4) -
      Math.min(quad.x1, quad.x2, quad.x3, quad.x4);
    const rectHeight =
      Math.max(quad.y1, quad.y2, quad.y3, quad.y4) -
      Math.min(quad.y1, quad.y2, quad.y3, quad.y4);
    page.drawRectangle({
      x,
      y: pageHeight - yTop - rectHeight,
      width: rectWidth,
      height: rectHeight,
      color: hexToRgb(overlay.color),
      opacity: overlay.opacity,
    });
  });
};

export const exportEditedPdf = async (
  pages: PdfPageState[],
  documents: PdfDocumentState[],
  fileName: string,
) => {
  const pdfDoc = await PDFDocument.create();
  const documentCache = new Map<string, PDFDocument>();
  const fontCache = new Map<string, PDFFont>();
  for (const pageState of pages) {
    const documentState = documents.find((doc) => doc.id === pageState.documentId);
    if (!documentState) {
      // eslint-disable-next-line no-continue
      continue;
    }
    let source = documentCache.get(documentState.id);
    if (!source) {
      source = await PDFDocument.load(documentState.arrayBuffer);
      documentCache.set(documentState.id, source);
    }
    const [copiedPage] = await pdfDoc.copyPages(source, [pageState.pageNumber - 1]);
    pdfDoc.addPage(copiedPage);
    for (const overlay of pageState.overlays) {
      if (overlay.type === "text") {
        // eslint-disable-next-line no-await-in-loop
        await drawTextOverlay(copiedPage, overlay, fontCache, pdfDoc);
      } else if (overlay.type === "image") {
        // eslint-disable-next-line no-await-in-loop
        await drawImageOverlay(copiedPage, overlay, pdfDoc);
      } else if (overlay.type === "highlight") {
        drawHighlightOverlay(copiedPage, overlay);
      }
    }
  }
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  saveAs(blob, fileName);
};

export const convertRectsToQuads = (
  rects: DOMRectList | readonly DOMRect[],
  scale: number,
) => {
  const quads: HighlightQuad[] = [];
  rects.forEach((rect) => {
    const x1 = rect.x / scale;
    const y1 = rect.y / scale;
    const x2 = (rect.x + rect.width) / scale;
    const y2 = rect.y / scale;
    const x3 = (rect.x + rect.width) / scale;
    const y3 = (rect.y + rect.height) / scale;
    const x4 = rect.x / scale;
    const y4 = (rect.y + rect.height) / scale;
    quads.push({ x1, y1, x2, y2, x3, y3, x4, y4 });
  });
  return quads;
};

export const normalizeEventPointToPdf = (
  event: React.PointerEvent,
  container: HTMLDivElement,
  zoom: number,
) => {
  const bounds = container.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / zoom;
  const y = (event.clientY - bounds.top) / zoom;
  return { x, y };
};
