export interface TextItemOverlay {
  id: string;
  pageIndex: number;
  originalText: string;
  currentText: string;
  // Koordinat layar (HTML/Canvas) untuk tampilan UI
  screenRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Koordinat asli PDF (dari bawah-kiri) untuk pdf-lib saat export
  pdfRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize: number;
  backgroundColor: { r: number; g: number; b: number };
  textColor: { r: number; g: number; b: number };
  isEdited: boolean;
}