import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    example: -5,
    description: 'Positive values add stock, negative values remove stock.',
  })
  @IsInt()
  delta!: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Optimistic-lock version from the current product.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}
