import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@ApiTags('gateway')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  handle(@Req() request: Request, @Res() response: Response) {
    return this.proxyService.proxy(request, response);
  }
}
