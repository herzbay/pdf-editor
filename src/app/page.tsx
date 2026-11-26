'use client';

import React, { useState } from 'react';
import PdfDropzone from '@/components/PdfDropzone';
import PdfEditorWorkspace from '@/components/PdfEditorWorkspace';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!selectedFile ? (
        <PdfDropzone onFileSelect={(file) => setSelectedFile(file)} />
      ) : (
        <PdfEditorWorkspace
          file={selectedFile}
          onResetFile={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}