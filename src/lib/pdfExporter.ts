import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { TextItemOverlay } from '@/types/pdf';

export async function exportEditedPdf(
  originalArrayBuffer: ArrayBuffer,
  editedItems: TextItemOverlay[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  const pages = pdfDoc.getPages();

  // Embed keluarga font standar PDF
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

    // 1. Tutup teks lama dengan padding yang pas hingga ke bagian descender bawah
    page.drawRectangle({
      x: x - 1,
      y: y - height * 0.25,
      width: width + 3,
      height: height * 1.25,
      color: rgb(r, g, b),
    });

    // 2. Pilih font yang paling cocok dengan teks asli
    let styleSuffix = 'normal';
    if (item.isBold && item.isItalic) styleSuffix = 'bold-italic';
    else if (item.isBold) styleSuffix = 'bold';
    else if (item.isItalic) styleSuffix = 'italic';

    const selectedFont =
      fonts[`${item.fontFamily}-${styleSuffix}`] || fonts['serif-normal'];

    // 3. Cetak teks baru di baseline asli
    if (item.currentText.trim() !== '') {
      page.drawText(item.currentText, {
        x: x,
        y: y,
        size: item.fontSize,
        font: selectedFont,
        color: rgb(item.textColor.r, item.textColor.g, item.textColor.b),
      });
    }
  }

  return await pdfDoc.save();
}