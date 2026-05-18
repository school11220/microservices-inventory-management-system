import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../src/generated/prisma';

export class RegisterDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STAFF })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
