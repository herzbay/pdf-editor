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
  ShieldCheck,
  Bold,
  Italic,
  Minus,
  Plus,
  Type,
} from 'lucide-react';
import { DetectedFontFamily, TextItemOverlay } from '@/types/pdf';
import { loadPdfDocument, renderPageAndExtractText } from '@/lib/pdfParser';
import { exportEditedPdf } from '@/lib/pdfExporter';

interface PdfEditorWorkspaceProps {
  file: File;
  onResetFile: () => void;
}

const TEXT_COLORS = [
  { label: 'Hitam', value: { r: 0, g: 0, b: 0 }, hex: '#000000' },
  { label: 'Abu Gelap', value: { r: 0.25, g: 0.25, b: 0.25 }, hex: '#404040' },
  { label: 'Biru Navy', value: { r: 0.08, g: 0.22, b: 0.55 }, hex: '#14388C' },
  { label: 'Merah Tua', value: { r: 0.72, g: 0.11, b: 0.11 }, hex: '#B91C1C' },
];

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

  const [pagesOverlays, setPagesOverlays] = useState<Record<number, TextItemOverlay[]>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function initPdf() {
      const buffer = await file.arrayBuffer();
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
            const merged = extracted.map((newItem) => {
              const oldItem = existing.find((o) => o.id === newItem.id);
              if (oldItem && oldItem.isEdited) {
                return {
                  ...newItem,
                  currentText: oldItem.currentText,
                  fontFamily: oldItem.fontFamily,
                  isBold: oldItem.isBold,
                  isItalic: oldItem.isItalic,
                  fontSize: oldItem.fontSize,
                  textColor: oldItem.textColor,
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
  const activeItem = currentOverlays.find((item) => item.id === activeItemId) || null;

  // Helper generik untuk memperbarui properti teks atau gaya pada item aktif
  const updateItem = (id: string, updates: Partial<TextItemOverlay>) => {
    setPagesOverlays((prev) => ({
      ...prev,
      [currentPage]: prev[currentPage].map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // Tandai sebagai isEdited jika teks berubah ATAU ada properti gaya yang diubah manual
        return {
          ...updated,
          isEdited: true,
        };
      }),
    }));
  };

  const handleResetPage = () => {
    // Re-render ulang halaman agar gaya & teks kembali ke kondisi awal ekstraksi
    setPagesOverlays((prev) => {
      const copy = { ...prev };
      delete copy[currentPage];
      return copy;
    });
    setActiveItemId(null);
    // Trigger re-render dengan sedikit menggeser state atau memanggil ulang parser
    if (pdfDoc && canvasRef.current) {
      renderPageAndExtractText(pdfDoc, currentPage, canvasRef.current, scale).then(
        (freshOverlays) => {
          setPagesOverlays((prev) => ({ ...prev, [currentPage]: freshOverlays }));
        }
      );
    }
  };

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
      {/* Top Navbar */}
      <header className="bg-white border-b border-red-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xs z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-700 rounded-lg flex items-center justify-center text-white font-bold text-[11px] tracking-wider shrink-0">
            PDF
          </div>
          <button
            onClick={onResetFile}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
          >
            <FilePlus2 className="w-4 h-4" />
            Ganti File
          </button>
          <div className="h-5 w-[1px] bg-slate-200" />
          <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
            {file.name}
          </span>
          {editedCount > 0 && (
            <span className="text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-semibold">
              {editedCount} bagian diubah
            </span>
          )}
        </div>

        {/* Kontrol Navigasi & Zoom */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-lg">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-1.5 rounded hover:bg-white hover:text-red-700 disabled:opacity-40 transition"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 text-slate-700">
            Hal {currentPage} / {numPages || 1}
          </span>
          <button
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1.5 rounded hover:bg-white hover:text-red-700 disabled:opacity-40 transition"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={() => setScale((s) => Math.max(0.75, s - 0.25))}
            className="p-1.5 rounded hover:bg-white hover:text-red-700 transition"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-1.5 text-slate-700">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="p-1.5 rounded hover:bg-white hover:text-red-700 transition"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Aksi Reset & Export */}
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline-flex items-center gap-1 text-xs text-slate-500 mr-2">
            <ShieldCheck className="w-4 h-4 text-red-700" />
            Mode Lokal Aman
          </span>
          <button
            onClick={handleResetPage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            title="Kembalikan teks halaman ini ke semula"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition"
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

      {/* Text Formatting Toolbar (Muncul interaktif saat ada kotak teks yang dipilih) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-center gap-3 z-20 min-h-[46px]"
      >
        {activeItem ? (
          <>
            {/* Pilihan Keluarga Font */}
            <div className="flex items-center gap-1.5">
              <Type className="w-4 h-4 text-slate-500" />
              <select
                value={activeItem.fontFamily}
                onChange={(e) =>
                  updateItem(activeItem.id, {
                    fontFamily: e.target.value as DetectedFontFamily,
                  })
                }
                className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:border-red-700"
              >
                <option value="serif">Serif (Times New Roman)</option>
                <option value="sans">Sans-Serif (Arial / Helvetica)</option>
                <option value="mono">Monospace (Courier)</option>
              </select>
            </div>

            <div className="h-4 w-[1px] bg-slate-300" />

            {/* Kontrol Ukuran Font */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-md px-1 py-0.5">
              <button
                type="button"
                onClick={() =>
                  updateItem(activeItem.id, {
                    fontSize: Math.max(6, Number((activeItem.fontSize - 0.5).toFixed(1))),
                  })
                }
                className="p-1 hover:bg-white hover:text-red-700 rounded transition"
                title="Perkecil Ukuran Font"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-1.5 min-w-[36px] text-center">
                {Math.round(activeItem.fontSize)} pt
              </span>
              <button
                type="button"
                onClick={() =>
                  updateItem(activeItem.id, {
                    fontSize: Math.min(72, Number((activeItem.fontSize + 0.5).toFixed(1))),
                  })
                }
                className="p-1 hover:bg-white hover:text-red-700 rounded transition"
                title="Perbesar Ukuran Font"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-300" />

            {/* Tombol Bold & Italic */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateItem(activeItem.id, { isBold: !activeItem.isBold })
                }
                className={`p-1.5 rounded-md border transition ${
                  activeItem.isBold
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50'
                }`}
                title="Tebal (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  updateItem(activeItem.id, { isItalic: !activeItem.isItalic })
                }
                className={`p-1.5 rounded-md border transition ${
                  activeItem.isItalic
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50'
                }`}
                title="Miring (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-300" />

            {/* Pilihan Warna Teks */}
            <div className="flex items-center gap-1.5">
              {TEXT_COLORS.map((color) => {
                const isColorSelected =
                  Math.abs(activeItem.textColor.r - color.value.r) < 0.05 &&
                  Math.abs(activeItem.textColor.g - color.value.g) < 0.05 &&
                  Math.abs(activeItem.textColor.b - color.value.b) < 0.05;

                return (
                  <button
                    key={color.label}
                    type="button"
                    onClick={() =>
                      updateItem(activeItem.id, { textColor: color.value })
                    }
                    style={{ backgroundColor: color.hex }}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      isColorSelected
                        ? 'ring-2 ring-offset-1 ring-red-700 scale-110 border-white'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    title={`Warna: ${color.label}`}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <span className="text-xs text-red-900">
            Klik langsung pada teks di dalam dokumen untuk mulai mengedit atau mengatur{' '}
            <strong>Font, Bold, Italic, & Ukuran</strong>.
          </span>
        )}
      </div>

      {/* Workspace Canvas Area */}
      <main
        className="flex-1 overflow-auto p-8 flex justify-center items-start"
        onClick={() => setActiveItemId(null)}
      >
        <div className="relative shadow-xl bg-white inline-block">
          {isRendering && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-30">
              <Loader2 className="w-8 h-8 text-red-700 animate-spin" />
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

              const textRgb = `rgb(${Math.round(item.textColor.r * 255)}, ${Math.round(
                item.textColor.g * 255
              )}, ${Math.round(item.textColor.b * 255)})`;

              const cssFontFamily =
                item.fontFamily === 'serif'
                  ? '"Times New Roman", Times, Georgia, serif'
                  : item.fontFamily === 'mono'
                  ? '"Courier New", Courier, monospace'
                  : 'Arial, Helvetica, sans-serif';

              const computedFontSize = item.fontSize * scale;

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
                    minWidth: `${item.screenRect.width + 4}px`,
                    height: `${item.screenRect.height}px`,
                    backgroundColor: item.isEdited || isSelected ? bgRgb : 'transparent',
                    fontFamily: cssFontFamily,
                    fontWeight: item.isBold ? 'bold' : 'normal',
                    fontStyle: item.isItalic ? 'italic' : 'normal',
                    color: textRgb,
                  }}
                  className={`group cursor-text flex items-center transition-colors ${
                    isSelected
                      ? 'ring-2 ring-red-700 z-20'
                      : item.isEdited
                      ? 'ring-1 ring-red-300 z-10'
                      : 'hover:ring-1 hover:ring-red-500 hover:bg-red-500/10'
                  }`}
                >
                  {isSelected ? (
                    <input
                      type="text"
                      autoFocus
                      value={item.currentText}
                      onChange={(e) =>
                        updateItem(item.id, { currentText: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setActiveItemId(null);
                        }
                      }}
                      style={{
                        fontFamily: cssFontFamily,
                        fontWeight: item.isBold ? 'bold' : 'normal',
                        fontStyle: item.isItalic ? 'italic' : 'normal',
                        fontSize: `${computedFontSize}px`,
                        color: textRgb,
                        lineHeight: 1,
                        width: `${Math.max(
                          item.screenRect.width + 24,
                          item.currentText.length * (computedFontSize * 0.55)
                        )}px`,
                      }}
                      className="bg-transparent outline-none border-none p-0 m-0"
                    />
                  ) : (
                    item.isEdited && (
                      <span
                        style={{
                          fontFamily: cssFontFamily,
                          fontWeight: item.isBold ? 'bold' : 'normal',
                          fontStyle: item.isItalic ? 'italic' : 'normal',
                          fontSize: `${computedFontSize}px`,
                          color: textRgb,
                          lineHeight: 1,
                        }}
                        className="whitespace-nowrap block"
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