import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TextItemOverlay } from '@/types/pdf';

export async function exportEditedPdf(
  originalArrayBuffer: ArrayBuffer,
  editedItems: TextItemOverlay[]
): Promise<Uint8Array> {
  // Load dokumen PDF asli
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  const pages = pdfDoc.getPages();

  // Embed font standar PDF
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Filter hanya item yang benar-benar diubah oleh pengguna
  const modifiedItems = editedItems.filter((item) => item.isEdited);

  for (const item of modifiedItems) {
    const page = pages[item.pageIndex];
    if (!page) continue;

    const { x, y, width, height } = item.pdfRect;
    const { r, g, b } = item.backgroundColor;

    // 1. Gambar kotak penutup di atas teks lama (Smart Whiteout)
    // Padding kecil (-1 & +2) memastikan tidak ada sisa garis huruf lama yang bocor
    page.drawRectangle({
      x: x - 1,
      y: y - height * 0.2, // Penyesuaian baseline descender huruf (seperti g, y, p)
      width: width + 2,
      height: height * 1.15,
      color: rgb(r, g, b),
    });

    // 2. Jika teks baru tidak kosong, cetak teks baru di koordinat tersebut
    if (item.currentText.trim() !== '') {
      page.drawText(item.currentText, {
        x: x,
        y: y,
        size: item.fontSize,
        font: helveticaFont,
        color: rgb(item.textColor.r, item.textColor.g, item.textColor.b),
      });
    }
  }

  // Simpan dan kembalikan sebagai Uint8Array siap download
  return await pdfDoc.save();
}