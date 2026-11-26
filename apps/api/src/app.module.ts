import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller.js';
import { OrdersController } from './orders/orders.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController, OrdersController],
})
export class AppModule {}