// Runs every message in an eval file through the order interpreter and prints
// precision and recall for customers and items, field accuracy and whole-order accuracy.
// Run it compiled (npm run eval): tsx doesn't emit the decorator metadata Nest needs.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { OrderInterpreterService } from '../orders/order-interpreter.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type EvalCase = {
  text: string;
  customer: string | null; // customer name from the seed, or null when the message is ambiguous
  items: { productCode: string; quantity: number; unitPrice: number | null }[];
};

const file = process.argv[2] ?? 'evals/messages-30.json';
const cases: EvalCase[] = JSON.parse(readFileSync(file, 'utf8'));

// logger 'error': a failed LLM call becomes a generic 502, the real cause only shows in this log
const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
const interpreter = app.get(OrderInterpreterService);
// Compare by customer name, not id: ids are not part of the expected answers
const names = new Map((await app.get(PrismaService).customer.findMany()).map((c) => [c.id, c.name]));

// Customer: null is the AI saying "I don't know". That is neither a hit nor a wrong
// customer, it is an abstention. So we measure precision (when it picked, was it right?)
// and recall (did it find the customer?).
const customerScore = {
  correct: 0, // picked a customer and it was the right one
  picked: 0, // times the AI picked a customer (not null)
  knowable: 0, // cases where the expected answer has a customer
  ambiguous: 0, // cases where the expected answer is null (ambiguous "Zé")
  ambiguousCaught: 0, // ...and the AI also answered null
};

// Items: matched by product code, each expected item matches at most once
const itemScore = {
  matched: 0, // items with the right product
  predicted: 0, // items the AI returned
  expected: 0, // items in the expected answers
  quantityOk: 0, // of the matched ones, right quantity
  priceOk: 0, // of the matched ones, right price
};

let perfectOrders = 0;

for (const expected of cases) {
  const result = await interpreter.interpret(expected.text).catch((e: Error) => {
    console.log('CALL FAILED:', e.message);
    return null;
  });
  const customer = result?.customerId ? (names.get(result.customerId) ?? null) : null;

  // --- Customer ---
  if (expected.customer === null) {
    customerScore.ambiguous++;
    // a failed call also gives null, but that is not "catching the ambiguity"
    if (result !== null && customer === null) customerScore.ambiguousCaught++;
  } else {
    customerScore.knowable++;
  }
  if (customer !== null) {
    customerScore.picked++;
    if (customer === expected.customer) customerScore.correct++;
  }

  // --- Items ---
  // an item with productCode null is the AI saying "I don't know the product": not a guess
  const returned = (result?.items ?? []).filter((x) => x.productCode !== null);
  itemScore.predicted += returned.length;
  itemScore.expected += expected.items.length;

  // perfect order: call ok, right customer, same number of items and every field right
  let perfect = result !== null && customer === expected.customer && result.items.length === expected.items.length;

  const unmatched = [...returned];
  for (const want of expected.items) {
    const i = unmatched.findIndex((x) => x.productCode === want.productCode);
    if (i === -1) {
      perfect = false; // the AI missed this item (or got the product wrong)
      continue;
    }
    const [got] = unmatched.splice(i, 1); // remove it so it can't match again
    itemScore.matched++;
    if (got.quantity === want.quantity) itemScore.quantityOk++;
    else perfect = false;
    if (got.unitPrice === want.unitPrice) itemScore.priceOk++;
    else perfect = false;
  }

  if (perfect) perfectOrders++;
  else console.log('WRONG:', expected.text, '=>', JSON.stringify(result));
}

// "-" when there is nothing to divide by (e.g. the AI never picked a customer)
const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const row = (n: number, d: number, meaning: string) => ({ value: pct(n, d), count: `${n}/${d}`, measures: meaning });

const itemPrecision = itemScore.predicted ? itemScore.matched / itemScore.predicted : 0;
const itemRecall = itemScore.expected ? itemScore.matched / itemScore.expected : 0;
// F1 = harmonic mean: only high when precision AND recall are both high
const itemF1 = itemPrecision + itemRecall ? (2 * itemPrecision * itemRecall) / (itemPrecision + itemRecall) : 0;

console.table({
  'customer · precision': row(customerScore.correct, customerScore.picked, 'when it picked a customer, it was right'),
  'customer · recall': row(customerScore.correct, customerScore.knowable, 'of the identifiable customers, it found'),
  'customer · ambiguity caught': row(customerScore.ambiguousCaught, customerScore.ambiguous, 'when ambiguous, it answered null'),
  'items · precision': row(itemScore.matched, itemScore.predicted, 'of the items it returned, were in the order'),
  'items · recall': row(itemScore.matched, itemScore.expected, 'of the items in the order, it found'),
  'items · F1': { value: `${(100 * itemF1).toFixed(1)}%`, count: '', measures: 'item precision and recall combined' },
  'quantity right': row(itemScore.quantityOk, itemScore.matched, 'on items with the right product'),
  'price right': row(itemScore.priceOk, itemScore.matched, 'on items with the right product'),
  'whole order right': row(perfectOrders, cases.length, 'everything right: invoice ready to approve'),
});
await app.close();

// CI gate: if whole-order accuracy drops below EVAL_TARGET (%), the run fails
const target = Number(process.env.EVAL_TARGET ?? 0);
if ((100 * perfectOrders) / cases.length < target) {
  console.error(`Below the target of ${target}%`);
  process.exit(1);
}
