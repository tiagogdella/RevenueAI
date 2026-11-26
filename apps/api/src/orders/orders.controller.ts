import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { Channel } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const createOrderSchema = z.object({
  text: z.string().trim().min(3),
  channel: z.enum(Channel).default(Channel.TEXT),
});
type CreateOrderInput = z.infer<typeof createOrderSchema>;

@Controller('orders')
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body({ schema: createOrderSchema }) body: CreateOrderInput) {
    return this.prisma.order.create({
      data: { channel: body.channel, originalText: body.text },
    });
  }
}