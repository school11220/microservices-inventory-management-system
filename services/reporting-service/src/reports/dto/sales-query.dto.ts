import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class SalesQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
}
