import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { File, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  fileUrl: string;
  title?: string;
}

export function PdfViewer({ fileUrl, title }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPage(1);

        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error("Error loading PDF", err);
        setError("Unable to load PDF. You can still open the file in a new tab from the toolbar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current || totalPages === 0) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const pdf = pdfDocRef.current!;
        const page = await pdf.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.25 });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) {
          setError("Unable to initialize canvas for PDF preview.");
          return;
        }

        const outputScale = window.devicePixelRatio || 1;
        const width = viewport.width;
        const height = viewport.height;

        canvas.width = width * outputScale;
        canvas.height = height * outputScale;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        } as any).promise;
      } catch (err) {
        console.error("Error rendering PDF page", err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [currentPage, totalPages]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="h-full w-full overflow-auto bg-muted/30 px-4 py-2 flex flex-col">
      {loading && !error && (
        <p className="text-sm text-muted-foreground mb-2 text-center">
          Loading PDF preview...
        </p>
      )}

      {error && (
        <div className="flex flex-col items-center text-center text-muted-foreground gap-2 mb-2 max-w-md mx-auto">
          <File className="h-10 w-10" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {totalPages > 1 && !error && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex justify-center flex-1">
        <canvas
          ref={canvasRef}
          aria-label={title ? `Preview of ${title}` : "PDF preview"}
          className={`h-auto w-auto max-w-full rounded-md shadow-sm bg-background ${
            error ? "hidden" : ""
          }`}
        />
      </div>
    </div>
  );
}
