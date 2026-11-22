import { PDFParse } from 'pdf-parse';
import zlib from 'zlib';

/**
 * Extracts raw textual content from PDF binary buffer using PDFParse (PDF.js)
 * with robust zlib stream decompression and ASCII run extraction fallback.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // 1. Primary: Use PDFParse (Mozilla PDF.js engine)
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    if (typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {
        // ignore
      }
    }
    const text = (result?.text ?? '').replace(/\r?\n\s*\r?\n/g, '\n').trim();
    if (text.length >= 30) {
      return text;
    }
  } catch {
    // Continue to stream decompression fallback
  }

  // 2. Fallback: Scan for all stream ... endstream blocks with zlib inflation
  try {
    const textPieces: string[] = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    const raw = buffer.toString('binary');
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamDataBinary = match[1];
      let decompressed = '';

      try {
        const streamBuffer = Buffer.from(streamDataBinary, 'binary');
        decompressed = zlib.inflateSync(streamBuffer).toString('utf-8');
      } catch {
        try {
          const streamBuffer = Buffer.from(streamDataBinary, 'binary');
          decompressed = zlib.inflateRawSync(streamBuffer).toString('utf-8');
        } catch {
          decompressed = streamDataBinary;
        }
      }

      if (decompressed) {
        // Extract text from (text) Tj or TJ blocks
        const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
          const cleanStr = unescapePdfString(tjMatch[1]);
          if (cleanStr && cleanStr.length > 0) {
            textPieces.push(cleanStr);
          }
        }

        // Extract from [(t1) 10 (t2)] TJ
        const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
        let arrayMatch: RegExpExecArray | null;
        while ((arrayMatch = tjArrayRegex.exec(decompressed)) !== null) {
          const inner = arrayMatch[1];
          const innerStrings = inner.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
          if (innerStrings) {
            const joined = innerStrings
              .map((s) => unescapePdfString(s.slice(1, -1)))
              .join('');
            if (joined.trim()) {
              textPieces.push(joined);
            }
          }
        }
      }
    }

    const joinedText = textPieces.join(' ').replace(/\s+/g, ' ').trim();
    if (joinedText.length >= 40) {
      return joinedText;
    }

    // 3. Fallback: extract printable ASCII runs from raw buffer
    const asciiRuns = raw.match(/[A-Za-z0-9@.+_,:/|\-\s]{16,}/g) ?? [];
    const filteredRuns = asciiRuns.filter(
      (s) =>
        !s.includes('endobj') &&
        !s.includes('MediaBox') &&
        !s.includes('Font') &&
        !s.includes('ProcSet') &&
        !s.includes('Filter')
    );

    return filteredRuns.join('\n').slice(0, 15000).trim();
  } catch {
    return '';
  }
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\[0-7]{1,3}/g, (oct) => String.fromCharCode(parseInt(oct.slice(1), 8)))
    .trim();
}
