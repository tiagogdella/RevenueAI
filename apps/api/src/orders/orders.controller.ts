import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { Channel } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderInterpreterService } from './order-interpreter.service.js';
import { InterpretBody } from './order.schema.js';

const createOrderSchema = z.object({
  text: z.string().trim().min(3),
  channel: z.enum(Channel).default(Channel.TEXT),
});
type CreateOrderInput = z.infer<typeof createOrderSchema>;

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interpreter: OrderInterpreterService,
  ) {}

  @Post()
  create(@Body({ schema: createOrderSchema }) body: CreateOrderInput) {
    return this.prisma.order.create({
      data: { channel: body.channel, originalText: body.text },
    });
  }

  @Post('interpret')
  @HttpCode(200) // nothing is created (BR-5), so 200 instead of POST's default 201
  interpret(@Body({ schema: InterpretBody }) body: InterpretBody) {
    return this.interpreter.interpret(body.text);
  }
}