import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { ArticleExtractorService } from '../extraction/article-extractor.service';
import { FileExtractorService } from '../extraction/file-extractor.service';

@Module({
  providers: [BooksService, ArticleExtractorService, FileExtractorService],
  controllers: [BooksController],
})
export class BooksModule {}
