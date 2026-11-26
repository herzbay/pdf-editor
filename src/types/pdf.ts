export type DetectedFontFamily = 'serif' | 'sans' | 'mono';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface TextSegment {
  text: string;
  fontFamily: DetectedFontFamily;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  textColor: RgbColor;
}

export interface TextItemOverlay {
  id: string;
  pageIndex: number;
  originalText: string;
  segments: TextSegment[];
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
  // Properti default/awal baris
  fontSize: number;
  fontFamily: DetectedFontFamily;
  isBold: boolean;
  isItalic: boolean;
  backgroundColor: RgbColor;
  textColor: RgbColor;
  isEdited: boolean;
}