'use client';

import React, { useCallback } from 'react';
import { UploadCloud, FileText, ShieldCheck } from 'lucide-react';

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
        alert('Harap unggah file dengan format PDF.');
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="max-w-xl w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
          <ShieldCheck className="w-4 h-4" />
          100% Client-Side • Privasi Terjaga
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          Edit Teks PDF Langsung di Browser
        </h1>
        <p className="text-slate-600">
          Klik teks bawaan di dalam dokumen PDF Anda untuk mengubah isinya tanpa perlu mengunggah file ke server mana pun.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="max-w-xl w-full border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl p-10 text-center transition-colors cursor-pointer shadow-sm"
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <span className="text-lg font-semibold text-slate-800 mb-1">
            Klik untuk memilih file atau drag & drop di sini
          </span>
          <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-2">
            <FileText className="w-4 h-4" /> Mendukung dokumen PDF standar
          </span>
        </label>
      </div>
    </div>
  );
}