import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create an order and start the inventory reservation saga' })
  create(@Body() dto: CreateOrderDto, @Req() request: Request) {
    return this.ordersService.create(dto, request);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List orders' })
  list(@Query() query: OrderQueryDto) {
    return this.ordersService.list(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get order status and items' })
  get(@Param('id') id: string) {
    return this.ordersService.get(id);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Manually update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an order record' })
  async delete(@Param('id') id: string) {
    await this.ordersService.delete(id);
  }
}
