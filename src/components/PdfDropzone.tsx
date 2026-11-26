'use client';

import React, { useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  Lock,
  Cpu,
  EyeOff,
} from 'lucide-react';

interface PdfDropzoneProps {
  onFileSelect: (file: File) => void;
}

export default function PdfDropzone({ onFileSelect }: PdfDropzoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Harap unggah file dengan format PDF (.pdf).');
      }
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-red-100 bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm">
              PDF
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              Edit PDF Text <span className="text-red-700">Gratis!</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-red-700" />
            Tanpa Upload Server • 100% Lokal
          </div>
        </div>
      </nav>

      {/* Main Hero & Dropzone */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold mb-5">
            <ShieldCheck className="w-4 h-4 text-red-700" />
            Privasi Terjamin: File Diproses Sepenuhnya di Browser Anda
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Edit PDF Text <span className="text-red-700">Gratis!</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Ubah teks bawaan di dalam dokumen PDF secara instan tanpa perlu mendaftar, tanpa watermark, dan tanpa khawatir dokumen bocor ke server pihak ketiga.
          </p>
        </div>

        {/* Upload Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="max-w-xl w-full border-2 border-dashed border-red-300 hover:border-red-700 bg-red-50/30 hover:bg-red-50/60 rounded-2xl p-10 text-center transition-all cursor-pointer shadow-sm group"
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-red-700 group-hover:bg-red-800 text-white rounded-2xl flex items-center justify-center mb-4 shadow-md transition-transform group-hover:scale-105">
              <UploadCloud className="w-8 h-8" />
            </div>

            <span className="px-6 py-2.5 bg-red-700 group-hover:bg-red-800 text-white font-semibold rounded-xl text-sm sm:text-base shadow-sm mb-3 transition">
              Pilih File PDF
            </span>

            <span className="text-sm font-medium text-slate-700">
              atau seret & jatuhkan (drag & drop) file PDF ke area ini
            </span>

            <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
              <FileText className="w-3.5 h-3.5 text-red-700" /> Mendukung dokumen PDF standar (.pdf)
            </span>
          </label>
        </div>

        {/* Trust & Security Guarantees */}
        <div className="max-w-3xl w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-red-50 text-red-700 rounded-lg shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">100% Client-Side</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Seluruh proses baca dan edit berjalan di memori browser perangkat Anda.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-red-50 text-red-700 rounded-lg shrink-0">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Zero Server Upload</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                File kontrak, CV, atau data sensitif Anda tidak pernah dikirim ke internet.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 bg-red-50 text-red-700 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gratis Tanpa Batas</h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Langsung unduh hasil editan bersih tanpa watermark dan tanpa biaya.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        Edit PDF Text Gratis! — Pemrosesan Dokumen Lokal Berbasis Browser
      </footer>
    </div>
  );
}