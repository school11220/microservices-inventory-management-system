import { Controller, Get, Header } from '@nestjs/common';
import { getServiceMetrics } from '@inventory/contracts';
import { Public } from '../auth/public.decorator';

@Controller()
@Public()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'inventory-service' };
  }

  @Get('metrics')
  metrics() {
    return getServiceMetrics('inventory-service').snapshot();
  }

  @Get('metrics/prometheus')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheusMetrics() {
    return getServiceMetrics('inventory-service').prometheus();
  }
}
