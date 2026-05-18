import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Noise-cancelling headphones' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Wireless headphones for retail demo inventory' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 199.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @MaxLength(100)
  category!: string;

  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  stockLevel!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  reorderThreshold!: number;

  @ApiPropertyOptional({ example: 'https://images.example.com/headphones.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;
}
