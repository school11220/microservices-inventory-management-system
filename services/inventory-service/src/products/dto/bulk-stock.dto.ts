import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

class BulkStockItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  delta!: number;
}

export class BulkStockDto {
  @ApiProperty({ type: [BulkStockItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkStockItemDto)
  items!: BulkStockItemDto[];
}
