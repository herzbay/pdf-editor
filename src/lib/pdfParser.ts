import * as pdfjsLib from 'pdfjs-dist';
import { TextItemOverlay } from '@/types/pdf';

// Mengarahkan worker ke file lokal di folder public/
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
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

  // 1. Render visual PDF ke canvas
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // 2. Ekstrak konten teks
  const textContent = await page.getTextContent();
  const overlays: TextItemOverlay[] = [];

  textContent.items.forEach((item: any, index: number) => {
    const str = item.str;
    if (!str || str.trim() === '') return;

    // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const tx = item.transform;
    const pdfX = tx[4];
    const pdfY = tx[5];
    const pdfWidth = item.width;
    const pdfHeight = Math.hypot(tx[2], tx[3]); // Estimasi tinggi font dalam unit PDF

    // Konversi koordinat PDF ke koordinat layar HTML
    const rect = viewport.convertToViewportRectangle([
      pdfX,
      pdfY,
      pdfX + pdfWidth,
      pdfY + pdfHeight,
    ]);

    const minX = Math.min(rect[0], rect[2]);
    const minY = Math.min(rect[1], rect[3]);
    const width = Math.abs(rect[2] - rect[0]);
    const height = Math.abs(rect[3] - rect[1]);

    // 3. Smart Background Color Sampling (ambil piksel sedikit di atas kiri teks)
    const sampleX = Math.max(0, Math.floor(minX - 2));
    const sampleY = Math.max(0, Math.floor(minY - 2));
    const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;

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
      backgroundColor: {
        r: pixel[0] / 255,
        g: pixel[1] / 255,
        b: pixel[2] / 255,
      },
      textColor: { r: 0, g: 0, b: 0 }, // Default hitam
      isEdited: false,
    });
  });

  return overlays;
}