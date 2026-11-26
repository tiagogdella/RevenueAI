import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('customers')
  customers() {
    return this.prisma.customer.findMany({ orderBy: { id: 'asc' } });
  }

  @Get('products')
  products() {
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
      include: { lots: { orderBy: { id: 'asc' } } }, // each product with its lots and balances
    });
  }
}