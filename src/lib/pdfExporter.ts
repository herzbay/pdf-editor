import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { TextItemOverlay } from '@/types/pdf';

export async function exportEditedPdf(
  originalArrayBuffer: ArrayBuffer,
  editedItems: TextItemOverlay[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  const pages = pdfDoc.getPages();

  const fonts: Record<string, PDFFont> = {
    'sans-normal': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'sans-bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    'sans-italic': await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    'sans-bold-italic': await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),

    'serif-normal': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'serif-bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    'serif-italic': await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    'serif-bold-italic': await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),

    'mono-normal': await pdfDoc.embedFont(StandardFonts.Courier),
    'mono-bold': await pdfDoc.embedFont(StandardFonts.CourierBold),
    'mono-italic': await pdfDoc.embedFont(StandardFonts.CourierOblique),
    'mono-bold-italic': await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  };

  const modifiedItems = editedItems.filter((item) => item.isEdited);

  for (const item of modifiedItems) {
    const page = pages[item.pageIndex];
    if (!page) continue;

    const { x, y, width, height } = item.pdfRect;
    const { r, g, b } = item.backgroundColor;

    // 1. Tutup seluruh area teks asli dengan smart background color
    page.drawRectangle({
      x: x - 1,
      y: y - height * 0.25,
      width: width + 3,
      height: height * 1.25,
      color: rgb(r, g, b),
    });

    // 2. Gambar tiap segmen secara berurutan dari kiri ke kanan
    let currentX = x;

    for (const seg of item.segments) {
      if (!seg.text) continue;

      let styleSuffix = 'normal';
      if (seg.isBold && seg.isItalic) styleSuffix = 'bold-italic';
      else if (seg.isBold) styleSuffix = 'bold';
      else if (seg.isItalic) styleSuffix = 'italic';

      const selectedFont =
        fonts[`${seg.fontFamily}-${styleSuffix}`] || fonts['serif-normal'];

      page.drawText(seg.text, {
        x: currentX,
        y: y,
        size: seg.fontSize,
        font: selectedFont,
        color: rgb(seg.textColor.r, seg.textColor.g, seg.textColor.b),
      });

      // Geser posisi X sesuai lebar presisi segmen ini di PDF
      const segWidth = selectedFont.widthOfTextAtSize(seg.text, seg.fontSize);
      currentX += segWidth;
    }
  }

  return await pdfDoc.save();
}