import { IsUrl, IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';

export class CreateFromUrlDto {
  @IsUrl({ require_protocol: true })
  url: string;
}

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;

  @IsOptional()
  @IsNumber()
  scrollOffset?: number;

  @IsOptional()
  @IsNumber()
  secondsSpent?: number;

  @IsOptional()
  @IsString()
  chapterId?: string;
}
