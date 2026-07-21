import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleExtractorService } from '../extraction/article-extractor.service';
import { FileExtractorService } from '../extraction/file-extractor.service';
import { UpdateProgressDto } from './dto/books.dto';

const WORDS_PER_MINUTE = 220;

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private articleExtractor: ArticleExtractorService,
    private fileExtractor: FileExtractorService,
  ) {}

  async createFromUrl(userId: string, url: string) {
    // Create a placeholder immediately so the UI can show "processing" state,
    // then fill it in once extraction finishes.
    const placeholder = await this.prisma.book.create({
      data: {
        userId,
        title: url,
        sourceType: 'URL',
        sourceUrl: url,
        status: 'PROCESSING',
      },
    });

    try {
      const article = await this.articleExtractor.extractFromUrl(url);
      const book = await this.prisma.book.update({
        where: { id: placeholder.id },
        data: {
          title: article.title,
          author: article.author ?? undefined,
          coverUrl: article.coverUrl ?? undefined,
          wordCount: article.wordCount,
          estimatedMinutes: Math.max(1, Math.round(article.wordCount / WORDS_PER_MINUTE)),
          status: 'READY',
          chapters: {
            create: [{ order: 0, title: article.title, contentHtml: article.contentHtml, wordCount: article.wordCount }],
          },
        },
      });
      return book;
    } catch (err) {
      await this.prisma.book.update({
        where: { id: placeholder.id },
        data: { status: 'FAILED', failureReason: (err as Error).message },
      });
      throw err;
    }
  }

  async createFromFile(
    userId: string,
    filePath: string,
    mimeType: string,
    originalName: string,
    sourceType: 'PDF' | 'EPUB' | 'MOBI' | 'DOCX' | 'TXT' | 'MARKDOWN',
    publicFileUrl: string,
  ) {
    const placeholder = await this.prisma.book.create({
      data: {
        userId,
        title: originalName,
        sourceType,
        originalFileUrl: publicFileUrl,
        status: 'PROCESSING',
      },
    });

    try {
      const extracted = await this.fileExtractor.extract(filePath, mimeType, originalName);
      const book = await this.prisma.book.update({
        where: { id: placeholder.id },
        data: {
          title: extracted.title,
          wordCount: extracted.wordCount,
          estimatedMinutes: Math.max(1, Math.round(extracted.wordCount / WORDS_PER_MINUTE)),
          status: 'READY',
          chapters: {
            create: [{ order: 0, title: extracted.title, contentHtml: extracted.contentHtml, wordCount: extracted.wordCount }],
          },
        },
      });
      return book;
    } catch (err) {
      await this.prisma.book.update({
        where: { id: placeholder.id },
        data: { status: 'FAILED', failureReason: (err as Error).message },
      });
      throw err;
    }
  }

  async listForUser(userId: string) {
    return this.prisma.book.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { progress: { where: { userId } } },
    });
  }

  async getOne(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, userId },
      include: {
        chapters: { orderBy: { order: 'asc' } },
        progress: { where: { userId } },
      },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async delete(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new NotFoundException('Book not found');
    await this.prisma.book.delete({ where: { id: bookId } });
    return { success: true };
  }

  async toggleFavorite(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new NotFoundException('Book not found');
    return this.prisma.book.update({
      where: { id: bookId },
      data: { isFavorite: !book.isFavorite },
    });
  }

  async updateProgress(userId: string, bookId: string, dto: UpdateProgressDto) {
    const book = await this.prisma.book.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new NotFoundException('Book not found');

    return this.prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: {
        percent: dto.percent,
        scrollOffset: dto.scrollOffset,
        secondsSpent: { increment: dto.secondsSpent ?? 0 },
        chapterId: dto.chapterId,
        lastReadAt: new Date(),
      },
      create: {
        userId,
        bookId,
        percent: dto.percent,
        scrollOffset: dto.scrollOffset,
        secondsSpent: dto.secondsSpent ?? 0,
        chapterId: dto.chapterId,
      },
    });
  }
}
