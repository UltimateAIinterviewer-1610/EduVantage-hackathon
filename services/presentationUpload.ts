import { unzipSync } from 'fflate';
import { importStudyFile } from './studySources';

export const PRESENTATION_MAX_BYTES = 12 * 1024 * 1024;
export interface ExtractedPresentation { title: string; keyPoints: string; fileName: string }

function docxParagraphs(bytes: Uint8Array): string[] {
  const archive = unzipSync(bytes, { filter: entry => entry.name === 'word/document.xml' && entry.originalSize <= 2 * 1024 * 1024 });
  const documentXml = archive['word/document.xml'];
  if (!documentXml) throw new Error('Could not find readable document text. Export the document as a standard DOCX file.');
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(documentXml), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('The DOCX document text is damaged. Export it again and retry.');
  return [...xml.getElementsByTagNameNS('*', 'p')].map(paragraph =>
    [...paragraph.getElementsByTagNameNS('*', 't')].map(node => node.textContent || '').join('').trim()
  ).filter(Boolean);
}

function extractOutline(lines: string[], fileName: string): ExtractedPresentation {
  const cleaned = lines.flatMap(line => line.replace(/\r/g, '').split(/\n+/))
    .map(line => line.replace(/\s+/g, ' ').replace(/^[\s•*\-–—]+|^\d+[.)]\s*/g, '').trim())
    .filter(line => line && /[\p{L}\p{N}]/u.test(line));
  if (!cleaned.length) throw new Error('No readable text was found. Use a text-based PDF, PPTX or DOCX file; scanned pages and images cannot be read here.');
  const fileTitle = fileName.replace(/\.(pdf|pptx|docx)$/i, '').replace(/[_-]+/g, ' ').trim();
  const first = cleaned[0];
  const title = (first.length <= 160 ? first : first.split(/[.!?]/)[0].slice(0, 160).trim()) || fileTitle;
  const rest = cleaned.slice(1).flatMap(line => line.length > 260 ? (line.match(/[^.!?]+[.!?]?/g) || [line]).map(part => part.trim()) : [line]);
  const keyPoints = [...new Set(rest.map(line => line.slice(0, 280).trim()).filter(line => line && line !== title))].slice(0, 8).join('\n').slice(0, 2000);
  return { title, keyPoints, fileName };
}

/** Browser-only extraction; no document bytes or complete extracted text are uploaded or saved. */
export async function extractPresentationFile(file: File): Promise<ExtractedPresentation> {
  if (!/\.(pdf|pptx|docx)$/i.test(file.name)) throw new Error('Choose a PDF, PPTX or DOCX file.');
  if (file.size === 0) throw new Error('This file is empty. Choose a file with readable text.');
  if (file.size > PRESENTATION_MAX_BYTES) throw new Error('This file is over 12 MB. Choose a smaller presentation or document.');
  try {
    if (/\.docx$/i.test(file.name)) return extractOutline(docxParagraphs(new Uint8Array(await file.arrayBuffer())), file.name);
    // Study Lab already handles text-selectable PDFs and native PowerPoint slides locally.
    const source = await importStudyFile(file, 'slides');
    return extractOutline(source.chunks.map(chunk => chunk.text), file.name);
  } catch (error) {
    if (error instanceof Error && /No readable text/.test(error.message)) throw new Error('No readable text was found. Use a text-based PDF, PPTX or DOCX file; scanned pages and images cannot be read here.');
    if (error instanceof Error && /Could not find readable document text|document text is damaged/.test(error.message)) throw error;
    throw new Error(`Could not extract text from this ${file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : file.name.toLowerCase().endsWith('.pptx') ? 'PPTX' : 'DOCX'}. Check that it opens normally and contains selectable text, then try again.`);
  }
}
