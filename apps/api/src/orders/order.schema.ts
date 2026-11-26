import { z } from 'zod';

// What the AI returns. Every field is required and nullable (never optional):
// strict structured output requires all keys to be present in the JSON.
export const InterpretedItem = z.object({
  productCode: z.string().nullable().describe('product code from the catalog, or null if unclear'),
  quantity: z.number().int().positive().describe('quantity in the product unit (bales, bags, packs or kg)'),
  unitPrice: z.number().nullable().describe('unit price in BRL only if the message states it; null for "mesmo preço" or no price'),
});

export const InterpretedOrder = z.object({
  customerId: z.number().int().nullable().describe('customer id from the catalog, or null if ambiguous or unknown'),
  items: z.array(InterpretedItem).min(1),
  questions: z.array(z.string()).describe('what is unclear, one short sentence each; empty if nothing'),
});
export type InterpretedOrder = z.infer<typeof InterpretedOrder>;

// Body of POST /orders/interpret
export const InterpretBody = z.object({ text: z.string().trim().min(3).max(2000) });
export type InterpretBody = z.infer<typeof InterpretBody>;