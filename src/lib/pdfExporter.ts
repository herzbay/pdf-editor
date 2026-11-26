import { PDFDocument, rgb, StandardFonts, PDFFont, degrees } from 'pdf-lib';
import { TextItemOverlay } from '@/types/pdf';

export async function exportEditedPdf(
  originalArrayBuffer: ArrayBuffer,
  editedItems: TextItemOverlay[],
  pageRotations: Record<number, number> = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  const pages = pdfDoc.getPages();

  // Terapkan rotasi halaman jika user memutar halaman tertentu
  Object.entries(pageRotations).forEach(([pageNumStr, offsetDeg]) => {
    const pageIndex = Number(pageNumStr) - 1;
    const page = pages[pageIndex];
    if (page && offsetDeg % 360 !== 0) {
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + offsetDeg) % 360));
    }
  });

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

    page.drawRectangle({
      x: x - 1,
      y: y - height * 0.25,
      width: width + 3,
      height: height * 1.25,
      color: rgb(r, g, b),
    });

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

      const segWidth = selectedFont.widthOfTextAtSize(seg.text, seg.fontSize);
      currentX += segWidth;
    }
  }

  return await pdfDoc.save();
}