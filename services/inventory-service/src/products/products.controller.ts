import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BulkStockDto } from './dto/bulk-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('public/products')
  @Public()
  @ApiOperation({ summary: 'Public product catalog for demo mode' })
  listPublic(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Get('products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  list(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Get('products/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one product' })
  get(@Param('id') id: string) {
    return this.productsService.get(id);
  }

  @Post('products')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put('products/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('products/:id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
  }

  @Put('inventory/:id/stock')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atomically adjust product stock' })
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.productsService.updateStock(id, dto);
  }

  @Post('inventory/bulk-update')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch stock adjustment endpoint' })
  bulkStock(@Body() dto: BulkStockDto) {
    return this.productsService.bulkUpdateStock(dto);
  }

  @Post('products/search/reindex')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rebuild the product search index from PostgreSQL' })
  reindexSearch() {
    return this.productsService.reindexSearch();
  }
}
