'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FilePlus2,
  Loader2,
} from 'lucide-react';
import { TextItemOverlay } from '@/types/pdf';
import { loadPdfDocument, renderPageAndExtractText } from '@/lib/pdfParser';
import { exportEditedPdf } from '@/lib/pdfExporter';

interface PdfEditorWorkspaceProps {
  file: File;
  onResetFile: () => void;
}

export default function PdfEditorWorkspace({
  file,
  onResetFile,
}: PdfEditorWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);

  // Menyimpan seluruh item teks lintas halaman (key: pageNumber)
  const [pagesOverlays, setPagesOverlays] = useState<Record<number, TextItemOverlay[]>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 1. Load file PDF saat pertama kali diunggah
  useEffect(() => {
    let isMounted = true;
    async function initPdf() {
      const buffer = await file.arrayBuffer();
      // Clone buffer karena PDF.js akan melakukan detach pada ArrayBuffer yang dipakainya
      const bufferForPdfJs = buffer.slice(0);
      const bufferForPdfLib = buffer.slice(0);

      const doc = await loadPdfDocument(bufferForPdfJs);
      if (isMounted) {
        setOriginalBuffer(bufferForPdfLib);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
      }
    }
    initPdf();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // 2. Render halaman aktif & ekstrak koordinat teks setiap kali halaman atau zoom berubah
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    async function renderCurrentPage() {
      setIsRendering(true);
      try {
        const extracted = await renderPageAndExtractText(
          pdfDoc!,
          currentPage,
          canvasRef.current!,
          scale
        );

        if (!isCancelled) {
          setPagesOverlays((prev) => {
            const existing = prev[currentPage];
            if (!existing) {
              return { ...prev, [currentPage]: extracted };
            }
            // Pertahankan teks yang sudah diedit user saat zoom berubah
            const merged = extracted.map((newItem) => {
              const oldItem = existing.find((o) => o.id === newItem.id);
              if (oldItem && oldItem.isEdited) {
                return {
                  ...newItem,
                  currentText: oldItem.currentText,
                  isEdited: true,
                };
              }
              return newItem;
            });
            return { ...prev, [currentPage]: merged };
          });
        }
      } catch (err) {
        console.error('Gagal merender halaman:', err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    renderCurrentPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  const currentOverlays = pagesOverlays[currentPage] || [];

  // Handler saat teks diubah
  const handleTextChange = (id: string, newValue: string) => {
    setPagesOverlays((prev) => ({
      ...prev,
      [currentPage]: prev[currentPage].map((item) =>
        item.id === id
          ? {
              ...item,
              currentText: newValue,
              isEdited: newValue !== item.originalText,
            }
          : item
      ),
    }));
  };

  // Reset semua perubahan pada halaman saat ini
  const handleResetPage = () => {
    setPagesOverlays((prev) => ({
      ...prev,
      [currentPage]: prev[currentPage].map((item) => ({
        ...item,
        currentText: item.originalText,
        isEdited: false,
      })),
    }));
    setActiveItemId(null);
  };

  // Export & Download PDF hasil editan
  const handleExport = async () => {
    if (!originalBuffer) return;
    setIsExporting(true);
    try {
      const allEditedItems = Object.values(pagesOverlays).flat();
      const pdfBytes = await exportEditedPdf(originalBuffer, allEditedItems);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Gagal mengekspor PDF:', error);
      alert('Terjadi kesalahan saat mengekspor PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const editedCount = Object.values(pagesOverlays)
    .flat()
    .filter((i) => i.isEdited).length;

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Top Toolbar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onResetFile}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <FilePlus2 className="w-4 h-4" />
            Ganti File
          </button>
          <div className="h-5 w-[1px] bg-slate-200" />
          <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
            {file.name}
          </span>
          {editedCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-medium">
              {editedCount} teks diubah
            </span>
          )}
        </div>

        {/* Kontrol Navigasi & Zoom */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-1.5 rounded hover:bg-white disabled:opacity-40 transition"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-slate-700">
            Hal {currentPage} / {numPages || 1}
          </span>
          <button
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1.5 rounded hover:bg-white disabled:opacity-40 transition"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={() => setScale((s) => Math.max(0.75, s - 0.25))}
            className="p-1.5 rounded hover:bg-white transition"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-1.5 text-slate-700">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="p-1.5 rounded hover:bg-white transition"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Aksi Reset & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetPage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Kembalikan teks halaman ini ke semula"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Halaman
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      </header>

      {/* Workspace Canvas Area */}
      <main
        className="flex-1 overflow-auto p-8 flex justify-center items-start"
        onClick={() => setActiveItemId(null)}
      >
        <div className="relative shadow-xl bg-white inline-block">
          {isRendering && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-30">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Layer 1: Canvas PDF.js */}
          <canvas ref={canvasRef} className="block" />

          {/* Layer 2: Overlay Kotak Teks Interaktif */}
          <div className="absolute inset-0">
            {currentOverlays.map((item) => {
              const isSelected = activeItemId === item.id;
              const bgRgb = `rgb(${Math.round(item.backgroundColor.r * 255)}, ${Math.round(
                item.backgroundColor.g * 255
              )}, ${Math.round(item.backgroundColor.b * 255)})`;

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveItemId(item.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${item.screenRect.x}px`,
                    top: `${item.screenRect.y}px`,
                    minWidth: `${item.screenRect.width}px`,
                    height: `${item.screenRect.height}px`,
                    // Jika sudah diedit atau sedang aktif, tutup teks canvas di bawahnya
                    backgroundColor: item.isEdited || isSelected ? bgRgb : 'transparent',
                  }}
                  className={`group cursor-text transition-colors ${
                    isSelected
                      ? 'ring-2 ring-blue-600 z-20'
                      : item.isEdited
                      ? 'ring-1 ring-amber-400 z-10'
                      : 'hover:ring-1 hover:ring-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  {isSelected ? (
                    <input
                      type="text"
                      autoFocus
                      value={item.currentText}
                      onChange={(e) => handleTextChange(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setActiveItemId(null);
                        }
                      }}
                      style={{
                        fontSize: `${item.screenRect.height * 0.85}px`,
                        lineHeight: 1,
                        width: `${Math.max(
                          item.screenRect.width + 20,
                          item.currentText.length * (item.screenRect.height * 0.55)
                        )}px`,
                      }}
                      className="bg-transparent text-black outline-none border-none p-0 m-0 font-sans"
                    />
                  ) : (
                    item.isEdited && (
                      <span
                        style={{
                          fontSize: `${item.screenRect.height * 0.85}px`,
                          lineHeight: 1,
                        }}
                        className="text-black whitespace-nowrap block font-sans"
                      >
                        {item.currentText}
                      </span>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}