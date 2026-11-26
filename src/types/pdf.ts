export type DetectedFontFamily = 'serif' | 'sans' | 'mono';

export interface TextItemOverlay {
  id: string;
  pageIndex: number;
  originalText: string;
  currentText: string;
  screenRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pdfRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize: number;
  fontFamily: DetectedFontFamily;
  isBold: boolean;
  isItalic: boolean;
  backgroundColor: { r: number; g: number; b: number };
  textColor: { r: number; g: number; b: number };
  isEdited: boolean;
}