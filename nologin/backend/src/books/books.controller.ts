import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BooksService } from './books.service';
import { CreateFromUrlDto, UpdateProgressDto } from './dto/books.dto';

const SOURCE_TYPE_BY_EXT: Record<string, 'PDF' | 'EPUB' | 'MOBI' | 'DOCX' | 'TXT' | 'MARKDOWN'> = {
  pdf: 'PDF',
  epub: 'EPUB',
  mobi: 'MOBI',
  docx: 'DOCX',
  txt: 'TXT',
  md: 'MARKDOWN',
  markdown: 'MARKDOWN',
};

@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Post('from-url')
  createFromUrl(@CurrentUser() user: { userId: string }, @Body() dto: CreateFromUrlDto) {
    return this.booksService.createFromUrl(user.userId, dto.url);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (_req, file, cb) => {
          const unique = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }),
  )
  async upload(
    @CurrentUser() user: { userId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const ext = extname(file.originalname).slice(1).toLowerCase();
    const sourceType = SOURCE_TYPE_BY_EXT[ext];
    if (!sourceType) {
      throw new BadRequestException(`Unsupported file extension: .${ext}`);
    }

    const publicFileUrl = `/uploads/${file.filename}`;
    const filePath = join(process.env.UPLOAD_DIR || './uploads', file.filename);

    return this.booksService.createFromFile(
      user.userId,
      filePath,
      file.mimetype,
      file.originalname,
      sourceType,
      publicFileUrl,
    );
  }

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.booksService.listForUser(user.userId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.booksService.getOne(user.userId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.booksService.delete(user.userId, id);
  }

  @Patch(':id/favorite')
  toggleFavorite(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.booksService.toggleFavorite(user.userId, id);
  }

  @Patch(':id/progress')
  updateProgress(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.booksService.updateProgress(user.userId, id, dto);
  }
}
