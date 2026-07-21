import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as mammoth from 'mammoth';
// pdf-parse has no types-friendly ESM export; require keeps it simple & stable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface ExtractedFile {
  title: string;
  contentHtml: string;
  wordCount: number;
}

@Injectable()
export class FileExtractorService {
  async extract(filePath: string, mimeType: string, originalName: string): Promise<ExtractedFile> {
    const ext = originalName.split('.').pop()?.toLowerCase();

    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return this.extractPdf(filePath, originalName);
    }
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      return this.extractDocx(filePath, originalName);
    }
    if (ext === 'txt' || mimeType === 'text/plain') {
      return this.extractPlainText(filePath, originalName);
    }
    if (ext === 'md' || ext === 'markdown') {
      return this.extractMarkdown(filePath, originalName);
    }
    if (ext === 'epub' || ext === 'mobi') {
      throw new BadRequestException(
        `${ext.toUpperCase()} import isn't wired up yet in this build — PDF, DOCX, TXT, and Markdown are supported for now.`,
      );
    }

    throw new BadRequestException(`Unsupported file type: ${ext || mimeType}`);
  }

  private async extractPdf(filePath: string, originalName: string): Promise<ExtractedFile> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    const text: string = data.text || '';
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const contentHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return {
      title: stripExtension(originalName),
      contentHtml: contentHtml || '<p><em>No extractable text found (this may be a scanned PDF — OCR pipeline is a future addition).</em></p>',
      wordCount,
    };
  }

  private async extractDocx(filePath: string, originalName: string): Promise<ExtractedFile> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    const text = result.value.replace(/<[^>]+>/g, ' ');
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return {
      title: stripExtension(originalName),
      contentHtml: result.value,
      wordCount,
    };
  }

  private async extractPlainText(filePath: string, originalName: string): Promise<ExtractedFile> {
    const text = await fs.readFile(filePath, 'utf-8');
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const contentHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return { title: stripExtension(originalName), contentHtml, wordCount };
  }

  private async extractMarkdown(filePath: string, originalName: string): Promise<ExtractedFile> {
    // Minimal markdown-to-HTML for headings/paragraphs/lists; a full pass
    // would swap in `marked` or `remark` — kept dependency-light here.
    const text = await fs.readFile(filePath, 'utf-8');
    const lines = text.split('\n');
    const htmlLines: string[] = [];

    for (const line of lines) {
      if (/^#{1,6}\s/.test(line)) {
        const level = line.match(/^#{1,6}/)![0].length;
        htmlLines.push(`<h${level}>${escapeHtml(line.replace(/^#{1,6}\s/, ''))}</h${level}>`);
      } else if (line.trim().startsWith('- ')) {
        htmlLines.push(`<li>${escapeHtml(line.trim().slice(2))}</li>`);
      } else if (line.trim()) {
        htmlLines.push(`<p>${escapeHtml(line.trim())}</p>`);
      }
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return { title: stripExtension(originalName), contentHtml: htmlLines.join('\n'), wordCount };
  }
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
