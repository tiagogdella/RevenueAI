import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import { generateText, Output, type LanguageModel } from 'ai';
import { PrismaService } from '../prisma/prisma.service.js';
import { LLM } from './model.js';
import { InterpretedOrder } from './order.schema.js';

@Injectable()
export class OrderInterpreterService {
  private readonly logger = new Logger(OrderInterpreterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM) private readonly model: LanguageModel,
  ) {}

  async interpret(text: string): Promise<InterpretedOrder> {
    // The catalog is small, so it fits in the prompt. In v2 it becomes a tool.
    const [customers, products] = await Promise.all([
      this.prisma.customer.findMany({ select: { id: true, name: true, nickname: true, city: true } }),
      this.prisma.product.findMany({ select: { code: true, name: true, unit: true } }),
    ]);

    let order: InterpretedOrder;
    try {
      // AI SDK 7: structured output is generateText + Output.object (generateObject is deprecated)
      const { output } = await generateText({
        model: this.model,
        output: Output.object({ schema: InterpretedOrder }),
        temperature: 0,
        instructions: [
          'You read orders that customers of a rice mill send in Brazilian Portuguese, and fill in the order.',
          'Use ONLY customer ids and product codes from the lists below.',
          'Pick a customer only when the words in the message point to exactly one customer in the list.',
          'A first name or short nickname that appears in more than one customer (in the name or the nickname) is ambiguous on its own. Do not pick the most likely one: return customerId null and add a question asking which one. A wrong customer is worse than a question.',
          'Extra details can resolve it: the full nickname, the company name or the city. If they point to exactly one customer, pick it.',
          '"fardo de 30" = bale 6x5kg; "fardo de 10" = bale 10x1kg; "saco de 50" = 50kg bag.',
          'Never invent a price: if the message has no price or says "mesmo preço", unitPrice is null.',
          'Write each question in Brazilian Portuguese, one short sentence.',
          `CUSTOMERS: ${JSON.stringify(customers)}`,
          `PRODUCTS: ${JSON.stringify(products)}`,
        ].join('\n'),
        prompt: text,
      });
      order = output;
    } catch (error) {
      // The real cause stays in the log; the caller gets a clean 502
      this.logger.error('LLM call failed', error);
      throw new BadGatewayException('Could not interpret the order with the AI model');
    }

    return this.checkReferences(order, customers.map((c) => c.id), products.map((p) => p.code));
  }

  // BR-1: the schema guarantees the shape of the JSON, not that the ids exist
  private checkReferences(order: InterpretedOrder, customerIds: number[], productCodes: string[]): InterpretedOrder {
    const questions = [...order.questions];

    let customerId = order.customerId;
    if (customerId !== null && !customerIds.includes(customerId)) {
      questions.push(`O cliente ${customerId} não existe no cadastro.`);
      customerId = null;
    }

    const items = order.items.map((item) => {
      if (item.productCode !== null && !productCodes.includes(item.productCode)) {
        questions.push(`O produto ${item.productCode} não existe no catálogo.`);
        return { ...item, productCode: null };
      }
      return item;
    });

    return { customerId, items, questions };
  }
}