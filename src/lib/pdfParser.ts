import * as pdfjsLib from 'pdfjs-dist';
import { DetectedFontFamily, TextItemOverlay } from '@/types/pdf';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

function detectFontMetadata(
  fontName: string,
  styles: Record<string, any>
): { fontFamily: DetectedFontFamily; isBold: boolean; isItalic: boolean } {
  const styleObj = styles?.[fontName];
  const rawName = `${fontName} ${styleObj?.fontFamily || ''}`.toLowerCase();

  let fontFamily: DetectedFontFamily = 'sans';
  if (
    rawName.includes('times') ||
    rawName.includes('serif') ||
    rawName.includes('georgia') ||
    rawName.includes('garamond') ||
    rawName.includes('cambria') ||
    rawName.includes('palatino') ||
    rawName.includes('roman')
  ) {
    fontFamily = 'serif';
  } else if (
    rawName.includes('courier') ||
    rawName.includes('mono') ||
    rawName.includes('consolas') ||
    rawName.includes('typewriter')
  ) {
    fontFamily = 'mono';
  }

  const isBold =
    rawName.includes('bold') ||
    rawName.includes('black') ||
    rawName.includes('heavy') ||
    rawName.includes('700');

  const isItalic =
    rawName.includes('italic') ||
    rawName.includes('oblique');

  return { fontFamily, isBold, isItalic };
}

export async function renderPageAndExtractText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<TextItemOverlay[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas context tidak tersedia');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  const textContent = await page.getTextContent();
  const styles = (textContent as any).styles || {};
  const overlays: TextItemOverlay[] = [];

  textContent.items.forEach((item: any, index: number) => {
    const str = item.str;
    if (!str || str.trim() === '') return;

    const tx = item.transform;
    const pdfX = tx[4];
    const pdfY = tx[5];
    const pdfWidth = item.width;
    const pdfHeight = Math.hypot(tx[2], tx[3]);

    // Tambahkan toleransi descender (-0.22 * pdfHeight) dan ascender (+0.95 * pdfHeight)
    // agar seluruh tubuh huruf dari atas sampai ekor bawah (g, y, p, q) tertutup sempurna
    const bottomLeft = viewport.convertToViewportPoint(
      pdfX,
      pdfY - pdfHeight * 0.22
    );
    const topRight = viewport.convertToViewportPoint(
      pdfX + pdfWidth,
      pdfY + pdfHeight * 0.95
    );

    const minX = Math.min(bottomLeft[0], topRight[0]);
    const minY = Math.min(bottomLeft[1], topRight[1]);
    const width = Math.abs(topRight[0] - bottomLeft[0]);
    const height = Math.abs(topRight[1] - bottomLeft[1]);

    // Ambil sampel warna piksel background
    const sampleX = Math.max(0, Math.floor(minX - 2));
    const sampleY = Math.max(0, Math.floor(minY - 2));
    const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;

    const { fontFamily, isBold, isItalic } = detectFontMetadata(
      item.fontName || '',
      styles
    );

    overlays.push({
      id: `page-${pageNumber}-item-${index}`,
      pageIndex: pageNumber - 1,
      originalText: str,
      currentText: str,
      screenRect: {
        x: minX,
        y: minY,
        width: Math.max(width, 10),
        height: Math.max(height, 10),
      },
      pdfRect: {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
      },
      fontSize: pdfHeight,
      fontFamily,
      isBold,
      isItalic,
      backgroundColor: {
        r: pixel[0] / 255,
        g: pixel[1] / 255,
        b: pixel[2] / 255,
      },
      textColor: { r: 0, g: 0, b: 0 },
      isEdited: false,
    });
  });

  return overlays;
}