import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { SalesQueryDto } from './dto/sales-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Aggregated sales report by day' })
  sales(@Query() query: SalesQueryDto) {
    return this.reportsService.sales(query);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Current inventory projection from stock events' })
  inventory() {
    return this.reportsService.inventory();
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'Recent low-stock alerts' })
  stockAlerts() {
    return this.reportsService.stockAlerts();
  }

  @Get('events')
  @ApiOperation({ summary: 'Recent reporting event audit log' })
  @ApiQuery({ name: 'type', required: false })
  events(@Query('type') type?: string) {
    return this.reportsService.eventAudit(type);
  }
}
