import { Module } from '@nestjs/common';
import { createModel, LLM } from './model.js';
import { OrderInterpreterService } from './order-interpreter.service.js';
import { OrdersController } from './orders.controller.js';

@Module({
  controllers: [OrdersController],
  providers: [OrderInterpreterService, { provide: LLM, useFactory: createModel }],
})
export class OrdersModule {}