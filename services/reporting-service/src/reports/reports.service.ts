import { Injectable } from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { SalesQueryDto } from './dto/sales-query.dto';
import { defaultFromDate, toUtcDateBucket } from './reporting.utils';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(query: SalesQueryDto) {
    const from = query.from ? toUtcDateBucket(query.from) : defaultFromDate();
    const to = query.to ? toUtcDateBucket(query.to) : toUtcDateBucket(new Date());
    const rows = await this.prisma.salesDaily.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      totalSales: Number(rows.reduce((sum, row) => sum + Number(row.totalSales), 0).toFixed(2)),
      orderCount: rows.reduce((sum, row) => sum + row.orderCount, 0),
      unitsSold: rows.reduce((sum, row) => sum + row.unitsSold, 0),
      byDay: rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        totalSales: Number(row.totalSales),
        orderCount: row.orderCount,
        unitsSold: row.unitsSold,
      })),
    };
  }

  async inventory() {
    const snapshots = await this.prisma.inventorySnapshot.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return {
      products: snapshots.map((snapshot) => ({
        productId: snapshot.productId,
        name: snapshot.name,
        category: snapshot.category,
        stockLevel: snapshot.stockLevel,
        reorderThreshold: snapshot.reorderThreshold,
        lowStock: snapshot.stockLevel < snapshot.reorderThreshold,
        updatedAt: snapshot.updatedAt.toISOString(),
      })),
    };
  }

  async stockAlerts() {
    const alerts = await this.prisma.stockAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      alerts: alerts.map((alert) => ({
        id: alert.id,
        productId: alert.productId,
        name: alert.name,
        stockLevel: alert.stockLevel,
        reorderThreshold: alert.reorderThreshold,
        createdAt: alert.createdAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      })),
    };
  }

  async eventAudit(type?: string) {
    const where: Prisma.ReportEventWhereInput = type ? { type } : {};
    const events = await this.prisma.reportEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return { events };
  }
}
