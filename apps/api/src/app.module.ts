import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller.js';
import { OrdersModule } from './orders/orders.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [CatalogController],
})
export class AppModule {}