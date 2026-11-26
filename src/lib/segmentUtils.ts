import { TextSegment } from '@/types/pdf';

function isSameStyle(a: TextSegment, b: TextSegment): boolean {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.isBold === b.isBold &&
    a.isItalic === b.isItalic &&
    Math.abs(a.textColor.r - b.textColor.r) < 0.01 &&
    Math.abs(a.textColor.g - b.textColor.g) < 0.01 &&
    Math.abs(a.textColor.b - b.textColor.b) < 0.01
  );
}

// Gabungkan segmen bersebelahan yang memiliki gaya identik & hapus segmen kosong
export function normalizeSegments(segments: TextSegment[]): TextSegment[] {
  const nonEmpty = segments.filter((s) => s.text.length > 0);
  if (nonEmpty.length === 0) return [];

  const merged: TextSegment[] = [{ ...nonEmpty[0] }];
  for (let i = 1; i < nonEmpty.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = nonEmpty[i];
    if (isSameStyle(prev, curr)) {
      prev.text += curr.text;
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

// Terapkan gaya baru HANYA pada rentang indeks [start, end)
export function applyStyleToRange(
  segments: TextSegment[],
  start: number,
  end: number,
  stylePatch:
    | Partial<Omit<TextSegment, 'text'>>
    | ((seg: TextSegment) => Partial<Omit<TextSegment, 'text'>>)
): TextSegment[] {
  // Jika tidak ada teks yang diblok, terapkan ke seluruh baris
  const fullText = segments.map((s) => s.text).join('');
  const effectiveStart = start === end ? 0 : start;
  const effectiveEnd = start === end ? fullText.length : end;

  const result: TextSegment[] = [];
  let cursor = 0;

  for (const seg of segments) {
    const segStart = cursor;
    const segEnd = cursor + seg.text.length;
    cursor = segEnd;

    // Tidak bersinggungan dengan area blok
    if (segEnd <= effectiveStart || segStart >= effectiveEnd) {
      result.push({ ...seg });
      continue;
    }

    // Bagian sebelum area blok
    if (segStart < effectiveStart) {
      result.push({
        ...seg,
        text: seg.text.slice(0, effectiveStart - segStart),
      });
    }

    // Bagian di dalam area blok
    const overlapStart = Math.max(segStart, effectiveStart) - segStart;
    const overlapEnd = Math.min(segEnd, effectiveEnd) - segStart;
    const patch =
      typeof stylePatch === 'function' ? stylePatch(seg) : stylePatch;

    result.push({
      ...seg,
      ...patch,
      text: seg.text.slice(overlapStart, overlapEnd),
    });

    // Bagian setelah area blok
    if (segEnd > effectiveEnd) {
      result.push({
        ...seg,
        text: seg.text.slice(effectiveEnd - segStart),
      });
    }
  }

  return normalizeSegments(result);
}

// Perbarui teks saat user mengetik sambil mempertahankan gaya pada karakter yang tersisa
export function updateSegmentsText(
  segments: TextSegment[],
  newText: string
): TextSegment[] {
  const oldText = segments.map((s) => s.text).join('');
  if (oldText === newText) return segments;

  if (newText.length === 0) {
    return [{ ...segments[0], text: '' }];
  }

  // Cari prefix yang sama dari kiri
  let prefixLen = 0;
  while (
    prefixLen < oldText.length &&
    prefixLen < newText.length &&
    oldText[prefixLen] === newText[prefixLen]
  ) {
    prefixLen++;
  }

  // Cari suffix yang sama dari kanan
  let oldSuffixIdx = oldText.length - 1;
  let newSuffixIdx = newText.length - 1;
  while (
    oldSuffixIdx >= prefixLen &&
    newSuffixIdx >= prefixLen &&
    oldText[oldSuffixIdx] === newText[newSuffixIdx]
  ) {
    oldSuffixIdx--;
    newSuffixIdx--;
  }

  const insertedText = newText.slice(prefixLen, newSuffixIdx + 1);
  const oldSuffixStart = oldSuffixIdx + 1;

  const result: TextSegment[] = [];
  let cursor = 0;
  let insertedPlaced = false;

  for (const seg of segments) {
    const segStart = cursor;
    const segEnd = cursor + seg.text.length;
    cursor = segEnd;

    // Ambil bagian segmen yang berada di dalam prefix
    if (segStart < prefixLen) {
      const takeEnd = Math.min(segEnd, prefixLen) - segStart;
      result.push({ ...seg, text: seg.text.slice(0, takeEnd) });
    }

    // Sisipkan teks baru tepat setelah prefix dengan mewarisi gaya di posisi kursor
    if (!insertedPlaced && prefixLen >= segStart && prefixLen <= segEnd) {
      if (insertedText.length > 0) {
        result.push({ ...seg, text: insertedText });
      }
      insertedPlaced = true;
    }

    // Ambil bagian segmen yang berada di dalam suffix
    if (segEnd > oldSuffixStart) {
      const takeStart = Math.max(segStart, oldSuffixStart) - segStart;
      result.push({ ...seg, text: seg.text.slice(takeStart) });
    }
  }

  if (!insertedPlaced && insertedText.length > 0) {
    result.push({ ...segments[segments.length - 1], text: insertedText });
  }

  const normalized = normalizeSegments(result);
  return normalized.length > 0 ? normalized : [{ ...segments[0], text: newText }];
}

// Ambil gaya representatif pada posisi kursor/seleksi saat ini untuk ditampilkan di Toolbar
export function getStyleAtSelection(
  segments: TextSegment[],
  start: number,
  end: number
): TextSegment {
  const targetPos = start === end ? Math.max(0, start - 1) : start;
  let cursor = 0;

  for (const seg of segments) {
    const nextCursor = cursor + seg.text.length;
    if (targetPos >= cursor && targetPos < nextCursor) {
      return seg;
    }
    cursor = nextCursor;
  }

  return segments[0];
}