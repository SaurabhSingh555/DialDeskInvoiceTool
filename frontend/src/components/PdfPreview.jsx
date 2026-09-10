import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileText,
} from "lucide-react";

// Configure pdf.js worker from CDN (matches installed version).
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// Embedded PDF preview with zoom, pagination, fullscreen and download.
export default function PdfPreview({ fileUrl, fileName = "invoice.pdf" }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  if (!fileUrl) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <FileText size={34} />
        <p className="text-sm">Invoice preview will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            className="btn-secondary px-2 py-1"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-xs text-slate-600">
            {pageNumber} / {numPages || "-"}
          </span>
          <button
            className="btn-secondary px-2 py-1"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-secondary px-2 py-1" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>
            <ZoomOut size={16} />
          </button>
          <span className="px-1 text-xs text-slate-600">{Math.round(scale * 100)}%</span>
          <button className="btn-secondary px-2 py-1" onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}>
            <ZoomIn size={16} />
          </button>
          <a className="btn-secondary px-2 py-1" href={fileUrl} target="_blank" rel="noreferrer" title="Open fullscreen">
            <Maximize2 size={16} />
          </a>
          <a className="btn-secondary px-2 py-1" href={fileUrl} download={fileName} title="Download">
            <Download size={16} />
          </a>
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="py-10 text-center text-sm text-slate-400">Loading PDF…</div>}
          error={<div className="py-10 text-center text-sm text-red-500">Failed to load PDF preview.</div>}
        >
          <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} />
        </Document>
      </div>
    </div>
  );
}
