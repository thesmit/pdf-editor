import { FileText } from "lucide-react";

import { PdfEditor } from "@/components/pdf/pdf-editor";

export default function Home() {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3 text-primary">
            <FileText className="size-6" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Client-side PDF Editor
            </span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Edit, annotate, and merge PDFs entirely in your browser
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Upload one or more PDFs, manage pages, add text boxes, highlights, and images, then export a flattened PDF—all with zero server dependencies.
            </p>
          </div>
        </header>
        <section className="flex min-h-[calc(100vh-16rem)] overflow-hidden rounded-2xl border bg-background shadow-xl">
          <PdfEditor />
        </section>
      </div>
    </div>
  );
}
